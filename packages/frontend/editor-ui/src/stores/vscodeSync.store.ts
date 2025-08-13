import { defineStore } from 'pinia';
import type { PushMessage } from '@n8n/api-types';

import { STORES } from '@n8n/stores';
import { useWebSocketClient } from '@/push-connection/useWebSocketClient';
import { jsonParse } from 'n8n-workflow';
import { useWorkflowsStore } from './workflows.store';

export type OnPushMessageHandler = (event: PushMessage) => void;

export const useVsCodeSyncStore = defineStore(STORES.VSCODE_SYNC, () => {
	const workflowsStore = useWorkflowsStore();

	let wsClient: ReturnType<typeof useWebSocketClient>;

	function startSync(opts: {
		nodeId: string;
	}) {
		console.log('Starting sync', opts);

		function onMessage(rawData: string) {
			console.log('Received message', rawData);
			const msg = jsonParse(rawData);

			// @ts-expect-error abc
			if (msg.type === 'vscode:sync-start') {
				console.log('Sending message to vscode');
				wsClient.sendMessage(
					JSON.stringify({
						type: 'n8n:sync-start',
						nodeId: opts.nodeId,
						workflowId: workflowsStore.workflowId,
					}),
				);
				return;
			}

			// @ts-expect-error abc
			if (msg.type === 'vscode:file-updated') {
				const node = workflowsStore.getNodesByIds([opts.nodeId])[0];

				console.log(msg);
				workflowsStore.setNodeParameters(
					{
						name: node.name,
						value: {
							// @ts-expect-error abc
							jsCode: msg.content,
						},
					},
					true,
				);
			}
		}

		wsClient = useWebSocketClient({
			url: 'ws://localhost:3000/',
			onMessage,
		});

		wsClient.connect();
	}

	return {
		startSync,
	};
});
