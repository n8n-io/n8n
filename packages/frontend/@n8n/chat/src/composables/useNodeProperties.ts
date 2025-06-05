import { inject } from 'vue';
import type { Ref } from 'vue';

export const NodePropertiesSymbol = Symbol('nodeProperties');

export interface NodeProperties {
	allowFileUploads: Ref<boolean>;
	allowedFilesMimeTypes: Ref<string>;
}

export function useNodeProperties() {
	const properties = inject(NodePropertiesSymbol) as NodeProperties;

	return {
		properties,
	};
}
