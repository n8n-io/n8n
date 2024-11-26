import type { Schema } from '@/Interface';
import { ApplicationError, type INodeExecutionData } from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useDataSchema } from '@/composables/useDataSchema';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { generateCodeForPrompt } from '../../api/ai';
import { useRootStore } from '../../stores/root.store';
import { type AskAiRequest } from '../../types/assistant.types';
import { useSettingsStore } from '../../stores/settings.store';
import { format } from 'prettier';
import jsParser from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';

export function getParentNodes() {
	const activeNode = useNDVStore().activeNode;
	const { getCurrentWorkflow, getNodeByName } = useWorkflowsStore();
	const workflow = getCurrentWorkflow();

	if (!activeNode || !workflow) return [];

	return workflow
		.getParentNodesByDepth(activeNode?.name)
		.filter(({ name }, i, nodes) => {
			return name !== activeNode.name && nodes.findIndex((node) => node.name === name) === i;
		})
		.map((n) => getNodeByName(n.name))
		.filter((n) => n !== null);
}

export function getSchemas() {
	const parentNodes = getParentNodes();
	const parentNodesNames = parentNodes.map((node) => node?.name);
	const { getSchemaForExecutionData, getInputDataWithPinned } = useDataSchema();
	const parentNodesSchemas: Array<{ nodeName: string; schema: Schema }> = parentNodes
		.map((node) => {
			const inputData: INodeExecutionData[] = getInputDataWithPinned(node);

			return {
				nodeName: node?.name || '',
				schema: getSchemaForExecutionData(executionDataToJson(inputData), false),
			};
		})
		.filter((node) => node.schema?.value.length > 0);

	const inputSchema = parentNodesSchemas.shift();

	return {
		parentNodesNames,
		inputSchema,
		parentNodesSchemas,
	};
}

export async function generateCodeForAiTransform(prompt: string, path: string, retries = 1) {
	const schemas = getSchemas();

	const payload: AskAiRequest.RequestPayload = {
		question: prompt,
		context: {
			schema: schemas.parentNodesSchemas,
			inputSchema: schemas.inputSchema!,
			ndvPushRef: useNDVStore().pushRef,
			pushRef: useRootStore().pushRef,
		},
		forNode: 'transform',
	};

	let value;
	if (useSettingsStore().isAskAiEnabled) {
		const { restApiContext } = useRootStore();

		let code = '';

		while (retries > 0) {
			try {
				const { code: generatedCode } = await generateCodeForPrompt(restApiContext, payload);
				code = generatedCode;
				break;
			} catch (e) {
				if (!retries) throw e;
				retries--;
			}
		}

		value = code;
	} else {
		throw new ApplicationError('AI code generation is not enabled');
	}

	if (value === undefined) return;

	const formattedCode = await format(String(value), {
		parser: 'babel',
		plugins: [jsParser, estree],
	});

	const updateInformation = {
		name: path,
		value: formattedCode,
	};

	return updateInformation;
}
