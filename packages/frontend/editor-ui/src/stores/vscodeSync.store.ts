import { defineStore } from 'pinia';
import type { PushMessage } from '@n8n/api-types';

import { STORES } from '@n8n/stores';
import { useWebSocketClient } from '@/push-connection/useWebSocketClient';
import { jsonParse } from 'n8n-workflow';
import { useWorkflowsStore } from './workflows.store';
import { codeNodeEditorEventBus, ndvEventBus } from '@/event-bus';
import { useNDVStore } from '@/stores/ndv.store';
import type { IUpdateInformation } from '@/Interface';

export type OnPushMessageHandler = (event: PushMessage) => void;

export const useVsCodeSyncStore = defineStore(STORES.VSCODE_SYNC, () => {
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();

	let wsClient: ReturnType<typeof useWebSocketClient>;

	// Copied from assistant.store.ts, updates the code for the node
	function updateCode(nodeName: string, code: string) {
		if (ndvStore.activeNodeName === nodeName) {
			const update: IUpdateInformation = {
				node: nodeName,
				name: 'parameters.jsCode',
				value: code,
			};

			ndvEventBus.emit('updateParameterValue', update);
		} else {
			workflowsStore.setNodeParameters(
				{
					name: nodeName,
					value: {
						jsCode: code,
					},
				},
				true,
			);
		}
	}

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
				// @ts-expect-error abc
				updateCode(node.name, msg.content);
				codeNodeEditorEventBus.emit('codeDiffApplied');
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
