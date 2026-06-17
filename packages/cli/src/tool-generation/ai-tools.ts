import type { Types } from 'n8n-core';
import type {
	INodeProperties,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	KnownNodesAndCredentials,
} from 'n8n-workflow';
import { deepCopy, NodeConnectionTypes } from 'n8n-workflow';

import { copyCredentialSupport, isFullDescription, setToolCodex } from './utils';

/**
 * Find the index of the last callout property in a list of properties.
 * Used to position new properties after callouts.
 */
export function findLastCalloutIndex(properties: INodeProperties[]): number {
	for (let i = properties.length - 1; i >= 0; i--) {
		if (properties[i].type === 'callout') return i;
	}

	return -1;
}

/**
 * Modifies the description of the passed in object, such that it can be used
 * as an AI Agent Tool.
 * Returns the modified item (not copied)
 */
export function convertNodeToAiTool<
	T extends object & { description: INodeTypeDescription | INodeTypeBaseDescription },
>(item: T): T {
	if (isFullDescription(item.description)) {
		item.description.name += 'Tool';
		item.description.inputs = [];
		item.description.outputs = [NodeConnectionTypes.AiTool];
		item.description.displayName += ' Tool';
		delete item.description.usableAsTool;

		const hasResource = item.description.properties.some((prop) => prop.name === 'resource');
		const hasOperation = item.description.properties.some((prop) => prop.name === 'operation');

		if (!item.description.properties.map((prop) => prop.name).includes('toolDescription')) {
			const descriptionType: INodeProperties = {
				displayName: 'Tool Description',
				name: 'descriptionType',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Set Automatically',
						value: 'auto',
						description: 'Automatically set based on resource and operation',
					},
					{
						name: 'Set Manually',
						value: 'manual',
						description: 'Manually set the description',
					},
				],
				default: 'auto',
			};

			const descProp: INodeProperties = {
				displayName: 'Description',
				name: 'toolDescription',
				type: 'string',
				default: item.description.description,
				required: true,
				typeOptions: { rows: 2 },
				description:
					'Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often',
			};

			const lastCallout = findLastCalloutIndex(item.description.properties);

			item.description.properties.splice(lastCallout + 1, 0, descProp);

			// If node has resource or operation we can determine pre-populate tool description based on it
			// so we add the descriptionType property as the first property after possible callout param(s).
			if (hasResource || hasOperation) {
				item.description.properties.splice(lastCallout + 1, 0, descriptionType);

				descProp.displayOptions = {
					show: {
						descriptionType: ['manual'],
					},
				};
			}
		}
	}

	setToolCodex(item.description, 'Other Tools', true);
	return item;
}

/**
 * Creates all AI Agent tools by duplicating the node descriptions for
 * all nodes that are marked as `usableAsTool`. It basically modifies the
 * description. The actual wrapping happens in the langchain code for getting
 * the connected tools.
 */
export function createAiTools(types: Types, known: KnownNodesAndCredentials): void {
	const usableNodes: INodeTypeDescription[] = types.nodes.filter((nodeType) =>
		Boolean(nodeType.usableAsTool),
	);

	for (const usableNode of usableNodes) {
		const description =
			typeof usableNode.usableAsTool === 'object'
				? {
						...deepCopy(usableNode),
						...usableNode.usableAsTool?.replacements,
					}
				: deepCopy(usableNode);
		const wrapped = convertNodeToAiTool({ description }).description;

		types.nodes.push(wrapped);
		known.nodes[wrapped.name] = { ...known.nodes[usableNode.name] };
		copyCredentialSupport(known, usableNode.name, wrapped.name);
	}
}
