import type { AiPreferenceDto, AiPreferenceScope, AiPreferenceSource } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
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

export type AiPreferenceWriteResult =
	| { ok: true; preference: AiPreferenceDto }
	| { ok: false; reason: AiPreferenceWriteRejection; message: string };

/** The surfaces that write on the user's behalf. The settings area is a person writing. */
export type AssistantSurface = Exclude<AiPreferenceSource, 'ui'>;

/**
 * The service refuses with HTTP error classes; an assistant surface speaks in reasons. Only
 * `scope: 'user'` reaches the service from an assistant, so the one BadRequestError it can raise
 * is the per-scope cap. The three mapped classes carry user-facing text, so their message passes
 * through; anything else is an unexpected fault, so its message stays internal.
 */
export function toAiPreferenceWriteRejection(error: unknown): {
	reason: AiPreferenceWriteRejection;
	message: string;
} {
	if (error instanceof ConflictError) return { reason: 'duplicate', message: error.message };
	if (error instanceof BadRequestError) return { reason: 'scope_full', message: error.message };
	if (error instanceof ForbiddenError) return { reason: 'not_permitted', message: error.message };
	return { reason: 'failed', message: 'The preference could not be saved.' };
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
		// The mapped classes are expected outcomes with their own user-facing text. Anything else
		// is a real fault whose message stays internal, so it must not go unlogged.
		if (rejection.reason === 'failed') {
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
