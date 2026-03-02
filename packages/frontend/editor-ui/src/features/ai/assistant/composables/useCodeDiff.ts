import { ref, computed, h } from 'vue';
import type { Ref } from 'vue';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import type { INodeParameters } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import { assert } from '@n8n/utils/assert';
import { replaceCode } from '@/features/ai/assistant/assistant.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { codeNodeEditorEventBus } from '@/app/event-bus';
import { ndvEventBus } from '@/features/ndv/shared/ndv.eventBus';
import type { IUpdateInformation } from '@/Interface';
import AiUpdatedCodeMessage from '@/app/components/AiUpdatedCodeMessage.vue';

export interface UseCodeDiffOptions {
	chatMessages: Ref<ChatUI.AssistantMessage[]>;
	getTargetNodeName: (codeDiffMessage: ChatUI.CodeDiffMessage) => string;
	getSessionId: (codeDiffMessage: ChatUI.CodeDiffMessage) => string;
}

export function useCodeDiff(options: UseCodeDiffOptions) {
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = computed(() =>
		workflowsStore.workflowId
			? useWorkflowDocumentStore(createWorkflowDocumentId(workflowsStore.workflowId))
			: undefined,
	);
	const ndvStore = useNDVStore();
	const locale = useI18n();

	const suggestions = ref<{
		[suggestionId: string]: {
			previous: INodeParameters;
			suggested: INodeParameters;
		};
	}>({});

	function updateParameters(nodeName: string, parameters: INodeParameters) {
		if (ndvStore.activeNodeName === nodeName) {
			Object.keys(parameters).forEach((key) => {
				const update: IUpdateInformation = {
					node: nodeName,
					name: `parameters.${key}`,
					value: parameters[key],
				};

				ndvEventBus.emit('updateParameterValue', update);
			});
		} else {
			workflowDocumentStore.value?.setNodeParameters(
				{
					name: nodeName,
					value: parameters,
				},
				true,
			);
		}
	}

	function getRelevantParameters(
		parameters: INodeParameters,
		keysToKeep: string[],
	): INodeParameters {
		return keysToKeep.reduce((accu: INodeParameters, key: string) => {
			accu[key] = deepCopy(parameters[key]);
			return accu;
		}, {} as INodeParameters);
	}

	function showCodeUpdateToastIfNeeded(errorNodeName: string) {
		if (errorNodeName !== ndvStore.activeNodeName) {
			useToast().showMessage({
				type: 'success',
				title: locale.baseText('aiAssistant.codeUpdated.message.title'),
				message: h(AiUpdatedCodeMessage, {
					nodeName: errorNodeName,
				}),
				duration: 4000,
			});
		}
	}

	async function applyCodeDiff(index: number) {
		const codeDiffMessage = options.chatMessages.value[index];
		if (!codeDiffMessage || codeDiffMessage.type !== 'code-diff') {
			throw new Error('No code diff to apply');
		}

		const codeDiff = codeDiffMessage as ChatUI.CodeDiffMessage;

		try {
			const nodeName = options.getTargetNodeName(codeDiff);
			const sessionId = options.getSessionId(codeDiff);
			assert(nodeName, 'No target node for code diff');

			codeDiff.replacing = true;
			const suggestionId = codeDiff.suggestionId;

			const workflowObject = workflowsStore.workflowObject;
			const activeNode = workflowObject.getNode(nodeName);
			assert(activeNode);

			const cached = suggestions.value[suggestionId];
			if (cached) {
				updateParameters(activeNode.name, cached.suggested);
			} else {
				const { parameters: suggested } = await replaceCode(rootStore.restApiContext, {
					suggestionId: codeDiff.suggestionId,
					sessionId,
				});

				suggestions.value[suggestionId] = {
					previous: getRelevantParameters(activeNode.parameters, Object.keys(suggested)),
					suggested,
				};
				updateParameters(activeNode.name, suggested);
			}

			codeDiff.replaced = true;
			codeNodeEditorEventBus.emit('codeDiffApplied');
			showCodeUpdateToastIfNeeded(activeNode.name);
		} catch (e) {
			console.error(e);
			codeDiff.error = true;
		}
		codeDiff.replacing = false;
	}

	async function undoCodeDiff(index: number) {
		const codeDiffMessage = options.chatMessages.value[index];
		if (!codeDiffMessage || codeDiffMessage.type !== 'code-diff') {
			throw new Error('No code diff to apply');
		}

		const codeDiff = codeDiffMessage as ChatUI.CodeDiffMessage;

		try {
			const nodeName = options.getTargetNodeName(codeDiff);
			assert(nodeName, 'No target node for code diff');

			codeDiff.replacing = true;
			const suggestionId = codeDiff.suggestionId;

			const suggestion = suggestions.value[suggestionId];
			assert(suggestion);

			const workflowObject = workflowsStore.workflowObject;
			const activeNode = workflowObject.getNode(nodeName);
			assert(activeNode);

			const suggested = suggestion.previous;
			updateParameters(activeNode.name, suggested);

			codeDiff.replaced = false;
			codeNodeEditorEventBus.emit('codeDiffApplied');
			showCodeUpdateToastIfNeeded(activeNode.name);
		} catch (e) {
			console.error(e);
			codeDiff.error = true;
		}
		codeDiff.replacing = false;
	}

	return {
		suggestions,
		applyCodeDiff,
		undoCodeDiff,
	};
}
