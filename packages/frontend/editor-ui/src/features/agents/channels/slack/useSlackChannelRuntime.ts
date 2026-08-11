import { useRootStore } from '@n8n/stores/useRootStore';
import { readonly, ref } from 'vue';

import type { AgentChannelRuntime, AgentChannelRuntimeContext } from '../types';
import { createSlackAgentApp } from './api';

const SLACK_APP_SETUP_POLL_INTERVAL_MS = 2000;
const SLACK_APP_SETUP_TIMEOUT_MS = 2 * 60 * 1000;

export interface SlackChannelRuntime extends AgentChannelRuntime {
	setupApp: (
		appConfigurationToken: string,
		onConnected: () => void | Promise<void>,
	) => Promise<boolean>;
}

export function isSlackChannelRuntime(
	runtime: AgentChannelRuntime,
): runtime is SlackChannelRuntime {
	return 'setupApp' in runtime && typeof runtime.setupApp === 'function';
}

export function useSlackChannelRuntime(context: AgentChannelRuntimeContext): SlackChannelRuntime {
	const rootStore = useRootStore();
	const loading = ref(false);

	function openAuthorizationPopup(installUrl: string): Window {
		const parsedUrl = new URL(installUrl);
		if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
			throw new Error('Invalid Slack installation URL');
		}

		const popup = window.open(
			parsedUrl.toString(),
			'Slack App Authorization',
			'scrollbars=no,resizable=yes,status=no,titlebar=no,location=no,toolbar=no,menubar=no,width=500,height=700',
		);
		if (!popup) throw new Error('Slack authorization popup was blocked');
		return popup;
	}

	async function waitForSetupCompletion(popup: Window): Promise<boolean> {
		return await new Promise((resolve) => {
			const oauthChannel = new BroadcastChannel('oauth-callback');
			let activePoll: Promise<void> | null = null;
			let settled = false;

			const closePopup = () => {
				try {
					popup.close();
				} catch {}
			};

			const settle = (success: boolean) => {
				if (settled) return;
				settled = true;
				window.clearInterval(pollInterval);
				window.clearTimeout(timeout);
				oauthChannel.close();
				if (success) closePopup();
				resolve(success);
			};

			const pollStatus = async () => {
				if (activePoll || settled) return;
				activePoll = (async () => {
					try {
						await context.fetchStatus(['slack']);
						if (context.isConfigured('slack')) settle(true);
					} finally {
						activePoll = null;
					}
				})();
				await activePoll;
			};

			const pollInterval = window.setInterval(() => {
				if (popup.closed) {
					void (activePoll ?? Promise.resolve())
						.catch(() => {})
						.then(pollStatus)
						.finally(() => settle(false));
					return;
				}
				void pollStatus();
			}, SLACK_APP_SETUP_POLL_INTERVAL_MS);
			const timeout = window.setTimeout(() => settle(false), SLACK_APP_SETUP_TIMEOUT_MS);

			oauthChannel.addEventListener('message', (event: MessageEvent) => {
				settle(event.data === 'success');
			});

			void pollStatus();
		});
	}

	async function setupApp(
		appConfigurationToken: string,
		onConnected: () => void | Promise<void>,
	): Promise<boolean> {
		loading.value = true;
		try {
			await context.ensureAgentPersisted?.();
			const { installUrl } = await createSlackAgentApp(
				rootStore.restApiContext,
				context.projectId.value,
				context.agentId.value,
				appConfigurationToken,
			);
			const connected = await waitForSetupCompletion(openAuthorizationPopup(installUrl));
			if (!connected) throw new Error('Slack app installation was not completed');

			await context.fetchStatus(['slack']);
			await onConnected();
			return true;
		} finally {
			loading.value = false;
		}
	}

	return {
		load: async () => {},
		loading: readonly(loading),
		setupApp,
	};
}
