import type { InstanceAiPreferenceCardEvent, InstanceAiToolCallState } from '@n8n/api-types';
import { instanceAiEventSchema } from '@n8n/api-types';

export const SAVE_USER_PREFERENCE_TOOL_NAME = 'save_user_preference';

/** True only for the fact the card endpoints return. The card moves on nothing else,
 *  so a 2xx body without it counts as a failure rather than a state change. */
export function isPreferenceCardEvent(value: unknown): value is InstanceAiPreferenceCardEvent {
	const parsed = instanceAiEventSchema.safeParse(value);
	return parsed.success && parsed.data.type === 'preference-card';
}

export interface SavedPreferenceResult {
	ok: true;
	preference: { id: string; content: string; scope: 'user' };
}

/** True only for a tool result that wrote a row. A refusal (`ok: false`) and a
 *  call that is still running both fail this check, so no card renders for them. */
export function isSavedPreferenceResult(result: unknown): result is SavedPreferenceResult {
	if (typeof result !== 'object' || result === null) return false;
	if (!('ok' in result) || result.ok !== true) return false;
	if (!('preference' in result)) return false;

	const preference = result.preference;
	if (typeof preference !== 'object' || preference === null) return false;

	return (
		'id' in preference &&
		typeof preference.id === 'string' &&
		'content' in preference &&
		typeof preference.content === 'string' &&
		'scope' in preference &&
		preference.scope === 'user'
	);
}

export type PreferenceCardState = 'saved' | 'edited' | 'undone';

/** The card's state and the text it shows, from the tool result plus any later fact.
 *  Only the save tool's result counts: another tool may answer in the same shape. */
export function resolvePreferenceCard(
	tc: InstanceAiToolCallState,
): { state: PreferenceCardState; preferenceId: string; content: string } | null {
	if (tc.toolName !== SAVE_USER_PREFERENCE_TOOL_NAME) return null;
	if (!isSavedPreferenceResult(tc.result)) return null;
	const later = tc.preferenceCard;
	return {
		state: later?.state ?? 'saved',
		preferenceId: tc.result.preference.id,
		content: later?.content ?? tc.result.preference.content,
	};
}
