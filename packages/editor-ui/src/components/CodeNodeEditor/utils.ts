import type * as esprima from 'esprima-next';
import type { Completion } from '@codemirror/autocomplete';
import type { Node } from 'estree';
import type { RangeNode } from './types';
import type { INodeUi, Schema } from '@/Interface';
import type { INodeExecutionData } from 'n8n-workflow';
import { sanitizeHtml } from '@/utils/htmlUtils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useDataSchema } from '@/composables/useDataSchema';
import { executionDataToJson } from '@/utils/nodeTypesUtils';

export function walk<T extends RangeNode>(
	node: Node | esprima.Program,
	test: (node: Node) => boolean,
	found: Node[] = [],
) {
	// @ts-ignore
	if (test(node)) found.push(node);

	for (const key in node) {
		if (!(key in node)) continue;

		// @ts-ignore
		const child = node[key];

		if (child === null || typeof child !== 'object') continue;

		if (Array.isArray(child)) {
			child.forEach((node) => walk(node, test, found));
		} else {
			walk(child, test, found);
		}
	}

	return found as T[];
}

export const escape = (str: string) =>
	str
		.replace('$', '\\$')
		.replace('(', '\\(')
		.replace(')', '\\)')
		.replace('[', '\\[')
		.replace(']', '\\]');

export const toVariableOption = (label: string) => ({ label, type: 'variable' });

export const addVarType = (option: Completion) => ({ ...option, type: 'variable' });

export const addInfoRenderer = (option: Completion): Completion => {
	const { info } = option;
	if (typeof info === 'string') {
		option.info = () => {
			const wrapper = document.createElement('span');
			wrapper.innerHTML = sanitizeHtml(info);
			return wrapper;
		};
	}
	return option;
};

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
				schema: getSchemaForExecutionData(executionDataToJson(inputData), true),
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
