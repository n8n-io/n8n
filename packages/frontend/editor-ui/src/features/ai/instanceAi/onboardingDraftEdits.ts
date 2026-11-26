import { EXTENDED_PROMPT_MAX_LENGTH } from '@n8n/api-types';

const STORAGE_KEY = 'n8n.cloud.onboardingDraft.edits';
const CLOUD_CLAIM_TTL = 10 * 60_000;

function readEdits(): { scope: string; text: string; expires: number } | undefined {
	try {
		const saved: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');
		if (
			saved &&
			typeof saved === 'object' &&
			'scope' in saved &&
			typeof saved.scope === 'string' &&
			'text' in saved &&
			typeof saved.text === 'string' &&
			saved.text.length <= EXTENDED_PROMPT_MAX_LENGTH &&
			'expires' in saved &&
			typeof saved.expires === 'number' &&
			saved.expires > Date.now()
		)
			return { scope: saved.scope, text: saved.text, expires: saved.expires };
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		// The composer also works when tab storage is unavailable.
	}
	return undefined;
}

export function clearOnboardingDraftEdits(instanceId: string, ownerId: string, id: string) {
	try {
		if (readEdits()?.scope === JSON.stringify([instanceId, ownerId, id]))
			sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		// Storage can be disabled between edits.
	}
}

/** Open only after Cloud verifies this claim for the current owner and instance. */
export function openOnboardingDraftEdits(instanceId: string, ownerId: string, id: string) {
	const scope = JSON.stringify([instanceId, ownerId, id]);
	const saved = readEdits();
	const current = saved?.scope === scope ? saved : undefined;
	const expires = current?.expires ?? Date.now() + CLOUD_CLAIM_TTL;
	return {
		text: current?.text,
		save(text: string) {
			try {
				if (text.length <= EXTENDED_PROMPT_MAX_LENGTH && Date.now() < expires) {
					sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ scope, text, expires }));
				}
			} catch {
				// Storage limits must not interrupt typing.
			}
		},
		clear() {
			clearOnboardingDraftEdits(instanceId, ownerId, id);
		},
	};
}
