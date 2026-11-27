import { post } from '@n8n/rest-api-client';
import { v4 as uuidv4, validate as isUuid } from 'uuid';

const SESSION_KEY = 'n8n.cloud.onboardingBuild';
const RECEIPT_KEY = 'n8n.cloud.onboardingBuild.sent';
// Cloud expires a handoff after ten minutes. Keep a receipt for a little longer.
const RECEIPT_TTL = 15 * 60_000;

type Claim = {
	id: string;
	claimId: string;
};

/** Store only the two opaque IDs. Cloud binds the claim to the owner and instance. */
let inMemoryClaim: Claim | undefined;

function claimFor(id: string): Claim {
	if (id !== inMemoryClaim?.id) inMemoryClaim = { id, claimId: uuidv4() };
	try {
		const [previousId, claimId] = (sessionStorage.getItem(SESSION_KEY) ?? '').split('/');
		if (id === previousId && claimId && isUuid(claimId)) {
			inMemoryClaim = { id, claimId };
		} else {
			sessionStorage.setItem(SESSION_KEY, `${id}/${inMemoryClaim.claimId}`);
		}
	} catch {
		// The current tab can still recover the prompt if browser storage is unavailable.
	}
	return inMemoryClaim;
}

export async function claimOnboardingBuild(
	baseUrl: string,
	id: string,
): Promise<{ prompt: string; intent?: 'draft' }> {
	const { claimId } = claimFor(id);
	const result: unknown = await post(baseUrl, '/cloud/proxy/onboarding-prompt/claim', {
		id,
		claimId,
	});
	if (
		!result ||
		typeof result !== 'object' ||
		!('prompt' in result) ||
		typeof result.prompt !== 'string' ||
		!result.prompt.trim() ||
		result.prompt.length > 16000 ||
		('intent' in result && result.intent !== 'draft')
	) {
		throw new Error('Invalid onboarding prompt response');
	}
	return 'intent' in result
		? { prompt: result.prompt, intent: 'draft' }
		: { prompt: result.prompt };
}

/** A duplicated tab can inherit session storage. Both tabs must honor the same send receipt. */
export async function reserveOnboardingBuildSend(id: string): Promise<boolean> {
	try {
		return await navigator.locks.request(RECEIPT_KEY, () => {
			const now = Date.now();
			const saved: unknown = JSON.parse(localStorage.getItem(RECEIPT_KEY) ?? '{}');
			const live = Object.fromEntries(
				Object.entries(saved && typeof saved === 'object' ? saved : {}).filter(
					([, expiry]) => typeof expiry === 'number' && expiry > now,
				),
			);
			if (live[id]) return false;
			live[id] = now + RECEIPT_TTL;
			localStorage.setItem(RECEIPT_KEY, JSON.stringify(live));
			return true;
		});
	} catch {
		// Without a shared receipt, leave the prompt in the composer for manual submission.
		return false;
	}
}
