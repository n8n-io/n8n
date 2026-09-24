import type { AiPreferenceDto, AiPreferenceScope, AiPreferenceSource } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { AiPreferenceScopeFullError } from '@/errors/response-errors/ai-preference-scope-full.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import type { AiPreferenceService } from '@/services/ai-preference.service';
import type { Telemetry } from '@/telemetry';

/**
 * Why an assistant write did not land, in words a model can relay. The same six values as the
 * `Preference write rejected` event, so a reason maps onto telemetry without translation.
 */
export type AiPreferenceWriteRejection =
	| 'too_long'
	| 'scope_full'
	| 'duplicate'
	| 'not_permitted'
	| 'blocked_by_admin'
	| 'failed';

/** A cap refusal always carries the cap and the measured value, so the model can fit under it. */
export type AiPreferenceWriteRefusal =
	| { reason: 'too_long' | 'scope_full'; message: string; limit: number; actual: number }
	| { reason: Exclude<AiPreferenceWriteRejection, 'too_long' | 'scope_full'>; message: string };

export type AiPreferenceWriteResult =
	| { ok: true; preference: AiPreferenceDto }
	| ({ ok: false } & AiPreferenceWriteRefusal);

/** The surfaces that write on the user's behalf. The settings area is a person writing. */
export type AssistantSurface = Exclude<AiPreferenceSource, 'ui'>;

/** The service refuses with HTTP error classes; an assistant surface speaks in reasons.
 *  A 4xx message is written for a person and passes through; anything else stays internal. */
export function toAiPreferenceWriteRejection(error: unknown): AiPreferenceWriteRefusal {
	if (error instanceof AiPreferenceScopeFullError) {
		return { reason: 'scope_full', message: error.message, ...error.meta };
	}
	if (error instanceof ConflictError) return { reason: 'duplicate', message: error.message };
	if (error instanceof ForbiddenError) return { reason: 'not_permitted', message: error.message };
	if (isExpectedAiPreferenceRefusal(error)) return { reason: 'failed', message: error.message };
	return { reason: 'failed', message: 'The preference could not be saved.' };
}

/** A client error the service raised on purpose, not a fault in the code. */
export function isExpectedAiPreferenceRefusal(error: unknown): error is ResponseError {
	return error instanceof ResponseError && error.httpStatusCode < 500;
}

export type AssistantPreferenceWrite = {
	aiPreferenceService: AiPreferenceService;
	telemetry: Telemetry;
	logger: Logger;
	user: User;
	surface: AssistantSurface;
	content: string;
	scope: AiPreferenceScope;
};

/**
 * One write for every assistant surface: the n8n Assistant tool and the MCP tool both call this,
 * so the source, the refusal mapping and the events cannot drift between them.
 *
 * Write first: the surface shows the result afterwards and doing nothing is agreement, so
 * `shown` and `resolved(accepted)` fire together with the write. Only the write sits in the try;
 * a telemetry fault after a committed row must not turn into `ok: false`, or the model reports a
 * failed save and a retry runs into the duplicate check.
 */
export async function writeAssistantPreference({
	aiPreferenceService,
	telemetry,
	logger,
	user,
	surface,
	content,
	scope,
}: AssistantPreferenceWrite): Promise<AiPreferenceWriteResult> {
	const textLength = content.length;

	let preference: AiPreferenceDto;
	try {
		preference = await aiPreferenceService.create(user, { content, scope }, surface);
	} catch (error) {
		const rejection = toAiPreferenceWriteRejection(error);
		// An unexpected fault keeps its message internal, so log it here.
		if (!isExpectedAiPreferenceRefusal(error)) {
			logger.error('Saving an AI preference from the assistant failed', { error });
		}
		telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED, {
			surface,
			reason: rejection.reason,
			scope_type: scope,
			text_length: textLength,
		});
		return { ok: false, ...rejection };
	}

	try {
		telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_SHOWN, {
			surface,
			scope_type: scope,
			text_length: textLength,
		});
		telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_RESOLVED, {
			surface,
			outcome: 'accepted',
			scope_type: scope,
			text_length: textLength,
		});
		telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_SCOPE_ACCEPTED, {
			surface,
			offered_scope: scope,
			accepted_scope: scope,
			scope_changed: false,
		});
		telemetry.track(TELEMETRY_EVENT.CONTEXT.ASSISTANT_SAVED_PREFERENCE, {
			surface,
			scope_type: scope,
			text_length: textLength,
			replaced_existing: false,
		});
	} catch (error) {
		logger.warn('Preference telemetry failed after the row was saved', { error });
	}
	return { ok: true, preference };
}
