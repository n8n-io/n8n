export type AssistantHomeMode = 'user' | 'power';

const STORAGE_KEY = 'n8n-instance-ai-home-mode';

/** User mode is the default. Power is the only stored choice. */
export function readHomeMode(): AssistantHomeMode {
	try {
		return localStorage.getItem(STORAGE_KEY) === 'power' ? 'power' : 'user';
	} catch {
		return 'user';
	}
}

export function writeHomeMode(mode: AssistantHomeMode): void {
	try {
		localStorage.setItem(STORAGE_KEY, mode);
	} catch {
		// Private browsing can reject storage. The choice still applies in this view.
	}
}
