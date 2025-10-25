import type {
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';
import { deepCopy } from 'n8n-workflow';

export function getOptionParameterData(
	name: string,
	option: INodePropertyOptions | INodeProperties | INodePropertyCollection,
) {
	let parameterData: {
		name: string;
		value: NodeParameterValueType;
	};

	if ('typeOptions' in option && option.typeOptions?.multipleValues === true) {
		// Multiple values are allowed
		let newValue;
		if (option.type === 'fixedCollection') {
			// fixedCollection default values are always objects
			newValue = typeof option.default === 'object' ? deepCopy(option.default) : {};
		} else {
			newValue = [];
			if (Array.isArray(option.default)) {
				newValue = deepCopy(option.default);
			} else if (option.default !== undefined) {
				newValue = [deepCopy(option.default)];
			}
		}

		parameterData = {
			name,
			value: newValue as NodeParameterValueType,
		};
	} else {
		// Add a new option
		parameterData = {
			name,
			value: 'default' in option ? deepCopy(option.default) : null,
		};
	}
	return parameterData;
}
