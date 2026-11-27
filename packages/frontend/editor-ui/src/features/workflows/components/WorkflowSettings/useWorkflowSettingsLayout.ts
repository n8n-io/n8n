import { useElementSize } from '@vueuse/core';
import { computed, type ComputedRef, type Ref } from 'vue';

export type WorkflowSettingsRowLayout = 'horizontal' | 'vertical';

export type WorkflowSettingsLayout = {
	rowLayout: ComputedRef<WorkflowSettingsRowLayout>;
};

/**
 * Below this container width, a row puts its control under its title.
 * Stay beside the title inside the workflow settings dialog.
 * A narrower container stacks the control under the title.
 */
const VERTICAL_LAYOUT_MAX_WIDTH = 520;

export function useWorkflowSettingsLayout(
	container: Ref<HTMLElement | null | undefined>,
): WorkflowSettingsLayout {
	const { width } = useElementSize(container);

	// A width of 0 means that the container has no measured size.
	const rowLayout = computed<WorkflowSettingsRowLayout>(() =>
		width.value > 0 && width.value < VERTICAL_LAYOUT_MAX_WIDTH ? 'vertical' : 'horizontal',
	);

	return { rowLayout };
}
