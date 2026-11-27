import { computed } from 'vue';
import { useEditorContext } from '@/app/composables/useEditorContext';

// Gate on Instance AI being available: without it the control is unusable and
// would suppress the legacy Focus AI action.
export function useIsNodeContextEnabled() {
	const { instanceAi } = useEditorContext();

	return computed(() => instanceAi.value);
}
