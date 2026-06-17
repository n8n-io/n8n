import type { Ref } from 'vue';
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type {
	INodeParameterResourceLocator,
	INodePropertyMode,
	ResourceLocatorModes,
} from 'n8n-workflow';
import type { Router } from 'vue-router';
import { useWorkflowResourcesLocator } from './useWorkflowResourcesLocator';

export function useWorkflowResourceLocatorModes(
	modelValue: Ref<INodeParameterResourceLocator>,
	router: Router,
) {
	const i18n = useI18n();
	const { getWorkflowName } = useWorkflowResourcesLocator(router);

	const supportedModes = computed<INodePropertyMode[]>(() => [
		{
			name: 'list',
			type: 'list',
			displayName: i18n.baseText('resourceLocator.mode.list'),
		},
		{
			type: 'string',
			name: 'id',
			displayName: i18n.baseText('resourceLocator.mode.id'),
		},
	]);

	const selectedMode = computed(() => modelValue.value?.mode || 'list');
	const isListMode = computed(() => selectedMode.value === 'list');

	function getUpdatedModePayload(value: ResourceLocatorModes): INodeParameterResourceLocator {
		if (typeof modelValue !== 'object') {
			return { __rl: true, value: modelValue, mode: value };
		}

		if (value === 'id' && selectedMode.value === 'list' && modelValue.value.value) {
			return { __rl: true, mode: value, value: modelValue.value.value };
		}

		return {
			__rl: true,
			mode: value,
			value: modelValue.value.value,
			cachedResultName: getWorkflowName(modelValue.value.value?.toString() ?? ''),
		};
	}

	function getModeLabel(mode: INodePropertyMode): string | undefined {
		if (mode.name === 'id' || mode.name === 'list') {
			return i18n.baseText(`resourceLocator.mode.${mode.name}`);
		}

		return mode.displayName;
	}

	return {
		supportedModes,
		selectedMode,
		isListMode,
		getUpdatedModePayload,
		getModeLabel,
	};
}
