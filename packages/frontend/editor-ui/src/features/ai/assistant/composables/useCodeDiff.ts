import { ref, h } from 'vue';
import type { ChatUI } from '@n8n/design-system/types/assistant';
import type { INodeParameters } from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';
import { assert } from '@n8n/utils/assert';
import { replaceCode } from '@/features/ai/assistant/assistant.api';
import { codeNodeEditorEventBus } from '@/app/event-bus';
import { ndvEventBus } from '@/features/ndv/shared/ndv.eventBus';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import AiUpdatedCodeMessage from '@/app/components/AiUpdatedCodeMessage.vue';
import type { IUpdateInformation } from '@/Interface';
import type { WorkflowState } from '@/app/composables/useWorkflowState';

export interface CodeDiffConfig {
	/** Returns the session ID to use for the replaceCode API call */
	getSessionId: (codeDiffMessage: ChatUI.CodeDiffMessage) => string | undefined;
	/** Returns the target node name for applying the code diff */
	getNodeName: (codeDiffMessage: ChatUI.CodeDiffMessage) => string | undefined;
}

export function useCodeDiff(config: CodeDiffConfig) {
	const ndvStore = useNDVStore();
	const workflowsStore = useWorkflowsStore();
	const rootStore = useRootStore();
	const locale = useI18n();

	const suggestions = ref<{
		[suggestionId: string]: {
			previous: INodeParameters;
			suggested: INodeParameters;
		};
	}>({});

	function updateParameters(
		workflowState: WorkflowState,
		nodeName: string,
		parameters: INodeParameters,
	) {
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
			workflowState.setNodeParameters(
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

	function showCodeUpdateToastIfNeeded(nodeName: string) {
		if (nodeName !== ndvStore.activeNodeName) {
			useToast().showMessage({
				type: 'success',
				title: locale.baseText('aiAssistant.codeUpdated.message.title'),
				message: h(AiUpdatedCodeMessage, {
					nodeName,
				}),
				duration: 4000,
			});
		}
	}

	async function applyCodeDiff(
		workflowState: WorkflowState,
		messages: ChatUI.AssistantMessage[],
		index: number,
	) {
		const codeDiffMessage = messages[index];
		if (!codeDiffMessage || codeDiffMessage.type !== 'code-diff') {
			throw new Error('No code diff to apply');
		}

		try {
			const sessionId = config.getSessionId(codeDiffMessage as ChatUI.CodeDiffMessage);
			assert(sessionId);

			const nodeName = config.getNodeName(codeDiffMessage as ChatUI.CodeDiffMessage);
			assert(nodeName);

			codeDiffMessage.replacing = true;
			const suggestionId = (codeDiffMessage as ChatUI.CodeDiffMessage).suggestionId;

			const workflowObject = workflowsStore.workflowObject;
			const activeNode = workflowObject.getNode(nodeName);
			assert(activeNode);

			const cached = suggestions.value[suggestionId];
			if (cached) {
				updateParameters(workflowState, activeNode.name, cached.suggested);
			} else {
				const { parameters: suggested } = await replaceCode(rootStore.restApiContext, {
					suggestionId,
					sessionId,
				});

				suggestions.value[suggestionId] = {
					previous: getRelevantParameters(activeNode.parameters, Object.keys(suggested)),
					suggested,
				};
				updateParameters(workflowState, activeNode.name, suggested);
			}

			codeDiffMessage.replaced = true;
			codeNodeEditorEventBus.emit('codeDiffApplied');
			showCodeUpdateToastIfNeeded(activeNode.name);
		} catch (e) {
			console.error(e);
			codeDiffMessage.error = true;
		}
		codeDiffMessage.replacing = false;
	}

	async function undoCodeDiff(
		workflowState: WorkflowState,
		messages: ChatUI.AssistantMessage[],
		index: number,
	) {
		const codeDiffMessage = messages[index];
		if (!codeDiffMessage || codeDiffMessage.type !== 'code-diff') {
			throw new Error('No code diff to apply');
		}

		try {
			const nodeName = config.getNodeName(codeDiffMessage as ChatUI.CodeDiffMessage);
			assert(nodeName);

			codeDiffMessage.replacing = true;
			const suggestionId = (codeDiffMessage as ChatUI.CodeDiffMessage).suggestionId;

			const suggestion = suggestions.value[suggestionId];
			assert(suggestion);

			const workflowObject = workflowsStore.workflowObject;
			const activeNode = workflowObject.getNode(nodeName);
			assert(activeNode);

			const previous = suggestion.previous;
			updateParameters(workflowState, activeNode.name, previous);

			codeDiffMessage.replaced = false;
			codeNodeEditorEventBus.emit('codeDiffApplied');
			showCodeUpdateToastIfNeeded(activeNode.name);
		} catch (e) {
			console.error(e);
			codeDiffMessage.error = true;
		}
		codeDiffMessage.replacing = false;
	}

	function resetSuggestions() {
		suggestions.value = {};
	}

	return {
		suggestions,
		applyCodeDiff,
		undoCodeDiff,
		resetSuggestions,
	};
}
