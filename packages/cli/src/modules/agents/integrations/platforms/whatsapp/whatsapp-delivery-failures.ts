import { isRecord } from '@n8n/utils/is-record';

/** Meta's error for a free-form send outside the customer service window. */
export const WHATSAPP_REENGAGEMENT_ERROR_CODE = 131047;

/** Marks the synthetic inbound message that reports a failed send to the agent. */
export const DELIVERY_FAILURE_MESSAGE_ID_SUFFIX = ':delivery-failed';

export interface WindowClosedFailure {
	/** ID of the message that Meta accepted and then failed to deliver. */
	messageId: string;
	phoneNumberId: string;
	/** The recipient's `wa_id`, which is also the user part of the thread ID. */
	recipientId: string;
	timestamp: string;
}

/**
 * Meta accepts a free-form send outside the 24-hour window and reports the
 * failure later in a status webhook. Returns the failures of that kind in a
 * webhook payload.
 */
export function parseWindowClosedFailures(payload: unknown): WindowClosedFailure[] {
	const failures: WindowClosedFailure[] = [];
	if (!isRecord(payload) || !Array.isArray(payload.entry)) return failures;
	for (const entry of payload.entry) {
		if (!isRecord(entry) || !Array.isArray(entry.changes)) continue;
		for (const change of entry.changes) {
			if (!isRecord(change) || change.field !== 'messages' || !isRecord(change.value)) continue;
			const { value } = change;
			const phoneNumberId = isRecord(value.metadata) ? value.metadata.phone_number_id : undefined;
			if (typeof phoneNumberId !== 'string' || !Array.isArray(value.statuses)) continue;
			for (const status of value.statuses) {
				if (!isRecord(status) || status.status !== 'failed') continue;
				const { id, recipient_id: recipientId, timestamp, errors } = status;
				if (typeof id !== 'string' || typeof recipientId !== 'string') continue;
				const windowClosed =
					Array.isArray(errors) &&
					errors.some(
						(error) => isRecord(error) && error.code === WHATSAPP_REENGAGEMENT_ERROR_CODE,
					);
				if (!windowClosed) continue;
				failures.push({
					messageId: id,
					phoneNumberId,
					recipientId,
					timestamp:
						typeof timestamp === 'string' ? timestamp : String(Math.floor(Date.now() / 1000)),
				});
			}
		}
	}
	return failures;
}

/** Meta can report an old failure again, for example after n8n was offline. */
const MAX_FAILURE_AGE_MS = 15 * 60 * 1000;

/** True when the failure is recent enough for the agent to act on it. */
/** Whether a message is the synthetic delivery notice, not a customer message. */
export function isDeliveryFailureNotice(message: { id: string }): boolean {
	return message.id.endsWith(DELIVERY_FAILURE_MESSAGE_ID_SUFFIX);
}

export function isRecentFailure(failure: WindowClosedFailure, now = Date.now()): boolean {
	const reportedAtMs = Number(failure.timestamp) * 1000;
	return Number.isFinite(reportedAtMs) && now - reportedAtMs <= MAX_FAILURE_AGE_MS;
}

/**
 * The text of the synthetic message. The agent reads it as the newest turn in
 * the task session that sent the failed message.
 */
export const DELIVERY_FAILURE_NOTICE =
	'[WhatsApp delivery notice. The customer did not write this message.] ' +
	'Your last WhatsApp message to this customer was not delivered. ' +
	'More than 24 hours have passed since the customer last replied, so WhatsApp refuses free-form messages. ' +
	'Call list_templates and choose a template that fits what you wanted to say. ' +
	'Then send it with send_template. Use only facts you know as placeholder values. ' +
	'If no template fits, do not send one. ' +
	'Do not write a normal reply to the customer, because it cannot be delivered. ' +
	'End this turn with the do_not_respond action. ' +
	'If no template fit, set input.reason to "not delivered, no suitable template".';

/**
 * The same report, for a chat that sent the failed message. A person reads
 * the chat, so the agent tells them what happened.
 */
export const DELIVERY_FAILURE_CHAT_NOTICE =
	'[WhatsApp delivery notice. The customer did not write this message.] ' +
	'Your last WhatsApp message to the customer was not delivered. ' +
	'More than 24 hours have passed since the customer last replied, so WhatsApp refuses free-form messages. ' +
	'Tell the user that the message was not delivered. ' +
	'Then call list_templates. If an approved template fits what you wanted to say, send it with send_template and tell the user. ' +
	'Use only facts you know as placeholder values. ' +
	'If no template fits, do not send one. Tell the user that the customer cannot be reached until they message again.';

/**
 * Limits the recovery turns for each thread in a time window, and ignores a
 * failure that Meta reports more than once. Meta returns this error only for
 * free-form messages, so a template cannot start a loop. An agent that
 * ignores the notice and writes free-form text again can. The limit stops that.
 */
export class DeliveryFailureRecoveryLimiter {
	private readonly recoveryTimes = new Map<string, number[]>();

	private readonly seenMessageIds = new Set<string>();

	constructor(
		private readonly windowMs: number,
		private readonly maxRecoveries: number,
		private readonly maxTrackedMessageIds = 1000,
	) {}

	/** True once for each failure while the thread is under its limit. */
	tryAcquire(failure: WindowClosedFailure, now = Date.now()): boolean {
		if (this.seenMessageIds.has(failure.messageId)) return false;
		this.seenMessageIds.add(failure.messageId);
		if (this.seenMessageIds.size > this.maxTrackedMessageIds) {
			const oldest = this.seenMessageIds.values().next();
			if (!oldest.done) this.seenMessageIds.delete(oldest.value);
		}

		const threadKey = `${failure.phoneNumberId}:${failure.recipientId}`;
		const recent = (this.recoveryTimes.get(threadKey) ?? []).filter(
			(time) => now - time < this.windowMs,
		);
		if (recent.length >= this.maxRecoveries) {
			this.recoveryTimes.set(threadKey, recent);
			return false;
		}
		this.recoveryTimes.set(threadKey, [...recent, now]);
		return true;
	}
}
