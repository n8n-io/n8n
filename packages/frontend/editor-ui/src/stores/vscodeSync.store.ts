import { defineStore } from 'pinia';
import type { PushMessage } from '@n8n/api-types';

import { STORES } from '@n8n/stores';
import { useWebSocketClient } from '@/push-connection/useWebSocketClient';

export type OnPushMessageHandler = (event: PushMessage) => void;

export const useVsCodeSyncStore = defineStore(STORES.VSCODE_SYNC, () => {
	const wsClient = useWebSocketClient({
		url: 'ws://localhost:3000/',
		onMessage: (rawData) => {
			// @ts-expect-error abc
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, n8n-local-rules/no-uncaught-json-parse
			const msg = JSON.parse(rawData);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (msg.type === 'vscode:sync-start') {
				console.log('Sending message to vscode');
				wsClient.sendMessage(
					JSON.stringify({
						type: 'n8n:sync-start',
						nodeId: '1bca7e7f-c9b2-4252-b4b9-c8dbd142771d',
						workflowId: 'kQnN8JVCt5lxmWpU',
					}),
				);
				return;
			}

			if (msg.type === 'vscode:file-updated') {
				console.log(msg);
			}
		},
	});

	return wsClient;
});
