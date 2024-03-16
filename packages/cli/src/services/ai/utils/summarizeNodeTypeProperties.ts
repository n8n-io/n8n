/* eslint-disable @typescript-eslint/no-use-before-define */
import type { INodeProperties, INodePropertyCollection, INodePropertyOptions } from 'n8n-workflow';

export function summarizeOption(
	option: INodePropertyOptions | INodeProperties | INodePropertyCollection,
): Partial<INodePropertyOptions | INodeProperties | INodePropertyCollection> {
	if ('value' in option) {
		return {
			name: option.name,
			value: option.value,
		};
	} else if ('values' in option) {
		return {
			name: option.name,
			values: option.values.map(summarizeProperty) as INodeProperties[],
		};
	} else {
		return summarizeProperty(option);
	}
}

export function summarizeProperty(property: INodeProperties): Partial<INodeProperties> {
	return {
		name: property.displayName,
		type: property.type,
		...(property.displayOptions ? { displayOptions: property.displayOptions } : {}),
		...((property.options
			? { options: property.options.map(summarizeOption) }
			: {}) as INodeProperties['options']),
	};
}

export function summarizeNodeTypeProperties(nodeTypeProperties: INodeProperties[]) {
	return nodeTypeProperties.map(summarizeProperty);
}
