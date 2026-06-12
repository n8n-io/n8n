import {
	isDisplayableConfirmationRequest,
	type InstanceAiConfirmationRequestPayload,
} from '@n8n/api-types';
import { Notification } from 'electron';

import type { LocalPermissionPromptRequest } from '../shared/types';

/** Upper bound for the notified-requestId dedupe set; far above any realistic pending count. */
const MAX_REMEMBERED_REQUEST_IDS = 200;

export interface PromptNotifierDeps {
	isWindowFocused: () => boolean;
	showWindow: () => void;
}

export interface PromptNotifier {
	notifyLocalPrompt(prompt: LocalPermissionPromptRequest): void;
	notifyConfirmationRequest(payload: InstanceAiConfirmationRequestPayload): void;
	/** A one-shot task run resolved (done/handoff/error). Strings come localized from the renderer. */
	notifyTaskResult(title: string, body: string): void;
}

/**
 * System notifications for permission prompts that arrive while the window is not
 * in front of the user (hidden, or open but unfocused); clicking brings it up.
 * Instance confirmations are deduped by requestId because the SSE stream
 * replays events (e.g. a chat reopened with an older cursor).
 */
export function createPromptNotifier(deps: PromptNotifierDeps): PromptNotifier {
	const notifiedRequestIds = new Set<string>();

	function show(title: string, body: string): void {
		if (!Notification.isSupported() || deps.isWindowFocused()) return;
		const notification = new Notification({ title, body });
		notification.on('click', () => deps.showWindow());
		notification.show();
	}

	return {
		notifyLocalPrompt(prompt) {
			show('Permission needed', prompt.resource.description);
		},

		notifyConfirmationRequest(payload) {
			if (!isDisplayableConfirmationRequest(payload)) return;
			if (notifiedRequestIds.has(payload.requestId)) return;
			if (notifiedRequestIds.size >= MAX_REMEMBERED_REQUEST_IDS) notifiedRequestIds.clear();
			notifiedRequestIds.add(payload.requestId);
			show('AI Assistant needs your input', payload.message);
		},

		notifyTaskResult(title, body) {
			show(title, body);
		},
	};
}
