import { vi } from 'vitest';
import { defineComponent, onMounted, ref } from 'vue';

/** Stands in for NodeToolSettingsContent: exposes the node and reports validity on mount. */
export function createToolSettingsStub(emitValid: boolean) {
	return defineComponent({
		props: ['initialNode', 'existingToolNames'],
		emits: ['update:valid', 'update:node-name'],
		setup(props, { emit, expose }) {
			expose({
				node: ref(props.initialNode),
				handleChangeName: vi.fn(),
				nodeTypeDescription: ref(null),
			});
			onMounted(() => {
				emit('update:valid', emitValid);
				emit('update:node-name', props.initialNode?.name ?? '');
			});
			return {};
		},
		template: '<div data-test-id="tool-settings-content" />',
	});
}
