import type {
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	INodeTypeDescription,
} from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

const DISCRIMINATOR_NAMES = new Set(['operation', 'mode', 'resource']);

const isCollection = (
	item: INodePropertyOptions | INodeProperties | INodePropertyCollection,
): item is INodePropertyCollection => 'values' in item;

const isProperty = (
	item: INodePropertyOptions | INodeProperties | INodePropertyCollection,
): item is INodeProperties => 'type' in item;

const visit = (
	items: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection> | undefined,
	nodeName: string,
): void => {
	for (const item of items ?? []) {
		if (isCollection(item)) {
			visit(item.values, nodeName);
			continue;
		}
		if (!isProperty(item)) continue;

		if (
			DISCRIMINATOR_NAMES.has(item.name) &&
			item.type === 'options' &&
			item.builderHint !== undefined
		) {
			throw new UnexpectedError(
				`Node "${nodeName}" has a builderHint on the "${item.name}" discriminator property. ` +
					'builderHint on discriminator properties (operation/mode/resource) is not rendered to the AI workflow builder. ' +
					'Move the hint to the relevant option, or to the node-level builderHint.searchHint.',
			);
		}

		visit(item.options, nodeName);
	}
};

/**
 * Validate a node description for known structural mistakes that would
 * silently break AI workflow builder rendering.
 *
 * Currently checks: builderHint on `operation` / `mode` / `resource`
 * discriminator properties — those hints are dropped because the
 * extractors only walk discriminator *options*, not the property itself.
 */
export const validateNodeDescription = (description: INodeTypeDescription): void => {
	visit(description.properties, description.name);
};
