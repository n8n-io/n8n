import type { INodePropertyTypeOptions, ResourceMapperTypeOptions } from 'n8n-workflow';
import { computed } from 'vue';
import { i18n as locale } from '@n8n/i18n';

export function useNodeSpecificationValues(typeOptions: INodePropertyTypeOptions | undefined) {
	const resourceMapperTypeOptions = computed<ResourceMapperTypeOptions | undefined>(() => {
		return typeOptions?.resourceMapper;
	});

	const singularFieldWord = computed<string>(() => {
		const singularFieldWord =
			resourceMapperTypeOptions.value?.fieldWords?.singular || locale.baseText('generic.field');
		return singularFieldWord;
	});

	const singularFieldWordCapitalized = computed<string>(() => {
		return singularFieldWord.value.charAt(0).toUpperCase() + singularFieldWord.value.slice(1);
	});

	const pluralFieldWord = computed<string>(() => {
		return resourceMapperTypeOptions.value?.fieldWords?.plural || locale.baseText('generic.fields');
	});

	const pluralFieldWordCapitalized = computed<string>(() => {
		return pluralFieldWord.value.charAt(0).toUpperCase() + pluralFieldWord.value.slice(1);
	});

	return {
		resourceMapperTypeOptions,
		singularFieldWord,
		singularFieldWordCapitalized,
		pluralFieldWord,
		pluralFieldWordCapitalized,
	};
}
