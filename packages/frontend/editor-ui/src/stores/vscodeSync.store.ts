import { defineStore } from 'pinia';
import type { PushMessage } from '@n8n/api-types';

import { STORES } from '@n8n/stores';
import { useWebSocketClient } from '@/push-connection/useWebSocketClient';
import { jsonParse } from 'n8n-workflow';
import { useWorkflowsStore } from './workflows.store';
import { codeNodeEditorEventBus, ndvEventBus } from '@/event-bus';
import { useNDVStore } from '@/stores/ndv.store';
import type { IUpdateInformation } from '@/Interface';
import { computed, ref } from 'vue';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useRouter } from 'vue-router';
import { usePushConnectionStore } from '@/stores/pushConnection.store';

export type OnPushMessageHandler = (event: PushMessage) => void;

export const useVsCodeSyncStore = defineStore(STORES.VSCODE_SYNC, () => {
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();
	const { runWorkflow } = useRunWorkflow({ router: useRouter() });
	const pushConnectionStore = usePushConnectionStore();

	const wsClient = ref<ReturnType<typeof useWebSocketClient> | null>(null);
	const connectedNodeIds = ref<Set<string>>(new Set());

	const isConnected = computed(() => wsClient.value?.isConnected ?? false);

	function getNodeById(nodeId: string) {
		const node = workflowsStore.getNodesByIds([nodeId])[0];
		if (!node) {
			throw new Error(`Node not found: ${nodeId}`);
		}

		return node;
	}

	function getNodeByName(nodeName: string) {
		const node = workflowsStore.getNodeByName(nodeName);

		return node;
	}

	pushConnectionStore.addEventListener((msg) => {
		if (!isConnected.value) {
			return;
		}

		if (msg.type === 'nodeExecuteAfter') {
			const node = getNodeByName(msg.data.nodeName);
			if (!node) return;

			if (connectedNodeIds.value.has(node.id)) {
				wsClient.value?.sendMessage(
					JSON.stringify({
						type: 'n8n:run-node',
						result: msg.data.data.data?.main?.[0],
					}),
				);
			}
		}
	});

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

		connectedNodeIds.value.add(opts.nodeId);

		function onMessage(rawData: string) {
			if (!wsClient.value) {
				return;
			}

			console.log('Received message', rawData);
			const msg = jsonParse(rawData);

			// @ts-expect-error abc
			if (msg.type === 'vscode:sync-start') {
				console.log('Sending message to vscode');
				wsClient.value.sendMessage(
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
				// @ts-expect-error abc
				const node = getNodeById(msg.nodeId);

				console.log(msg);
				// @ts-expect-error abc
				updateCode(node.name, msg.content);
				codeNodeEditorEventBus.emit('codeDiffApplied');
			}

			// @ts-expect-error abc
			if (msg.type === 'vscode:run-node') {
				console.log('Running node', msg);
				// @ts-expect-error abc
				const node = getNodeById(msg.nodeId);

				void runWorkflow({
					destinationNode: node.name,
					source: 'vscode:run-node',
				});
			}
		}

		wsClient.value = useWebSocketClient({
			url: 'ws://localhost:3000/',
			onMessage,
		});

		wsClient.value!.connect();
	}

	function stopSync() {
		connectedNodeIds.value.clear();
		wsClient.value?.disconnect();
		wsClient.value = null;
	}

	return {
		startSync,
		stopSync,
		isConnected,
	};
});
