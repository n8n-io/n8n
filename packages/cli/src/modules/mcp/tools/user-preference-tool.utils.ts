import type { AiPreferenceDto, AiPreferenceScope } from '@n8n/api-types';
import { aiPreferenceScopeOf } from '@n8n/api-types';
import type { InferTelemetryProps, TELEMETRY_EVENT } from '@n8n/telemetry';
import z from 'zod';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { AiPreferenceWriteRejection } from '@/services/ai-preference-write';
import { secondsSinceSaved, toAiPreferenceWriteRejection } from '@/services/ai-preference-write';
import type { UrlService } from '@/services/url.service';

/**
 * Why a write by id did not land. The shared rejections plus `not_found`, which only a tool that
 * takes an id can hit: the service answers a hidden row and a missing row alike.
 */
export type PreferenceWriteReason = AiPreferenceWriteRejection | 'not_found';

export const PREFERENCE_WRITE_REASONS = [
	'too_long',
	'scope_full',
	'duplicate',
	'not_permitted',
	'blocked_by_admin',
	'failed',
	'not_found',
] as const satisfies readonly PreferenceWriteReason[];

/** The refusal of a write by id, from the class the service threw. */
export function classifyPreferenceWriteError(error: unknown): {
	reason: PreferenceWriteReason;
	message: string;
} {
	if (error instanceof NotFoundError) return { reason: 'not_found', message: error.message };
	return toAiPreferenceWriteRejection(error);
}

type RejectedReason = InferTelemetryProps<
	typeof TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED
>['reason'];

/** The shared event knows no `not_found`; a row the caller cannot reach is a permission answer. */
export function toRejectedReason(reason: PreferenceWriteReason): RejectedReason {
	return reason === 'not_found' ? 'not_permitted' : reason;
}

/** What a tool result says about one saved preference. */
export const savedPreferenceSchema = z.object({
	id: z.string().describe('Stable id. Pass it to update_user_preference or undo_user_preference.'),
	scope: z
		.enum(['user', 'project', 'instance'])
		.describe('Who the preference applies to. Preferences saved over MCP are `user` scoped.'),
	text: z.string().describe('The preference as it is now saved.'),
	url: z.string().describe('Where the user can review, edit or delete it in n8n settings.'),
});

export type SavedPreferenceOutput = z.infer<typeof savedPreferenceSchema>;

/** One page for every preference: the list is paginated, so a row cannot be addressed by URL. */
export function preferencesSettingsUrl(urlService: UrlService): string {
	return `${urlService.getInstanceBaseUrl()}/settings/context/preferences`;
}

export function toSavedPreferenceOutput(
	preference: AiPreferenceDto,
	url: string,
): SavedPreferenceOutput {
	return {
		id: preference.id,
		scope: aiPreferenceScopeOf(preference),
		text: preference.content,
		url,
	};
}

export function preferenceScopeOf(preference: AiPreferenceDto): AiPreferenceScope {
	return aiPreferenceScopeOf(preference);
}

export { secondsSinceSaved };
