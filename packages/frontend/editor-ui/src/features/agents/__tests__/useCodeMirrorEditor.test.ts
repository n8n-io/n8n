import { describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { javascript } from '@codemirror/lang-javascript';

import {
	useCodeMirrorEditor,
	type CodeMirrorEditorHandle,
} from '../composables/useCodeMirrorEditor';

interface HostInstance {
	handle: CodeMirrorEditorHandle;
	emitted: string[];
	setReadOnly: (value: boolean) => void;
}

function makeHost(initial: string) {
	const Host = defineComponent({
		setup(_, { expose }) {
			const container = ref<HTMLDivElement | null>(null);
			const readOnly = ref(false);
			const emitted: string[] = [];
			const handle = useCodeMirrorEditor({
				container,
				initialDoc: initial,
				extensions: [javascript({ typescript: true })],
				readOnly,
				onChange: (next) => emitted.push(next),
			});
			expose({
				handle,
				emitted,
				setReadOnly: (v: boolean) => {
					readOnly.value = v;
				},
			});
			return () => h('div', { ref: container });
		},
	});
	return Host;
}

describe('useCodeMirrorEditor', () => {
	it('mounts with the initial doc', async () => {
		const Host = makeHost('hello');
		const wrapper = mount(Host, { attachTo: document.body });
		await nextTick();
		const vm = wrapper.vm as unknown as HostInstance;
		expect(vm.handle.getView()?.state.doc.toString()).toBe('hello');
		wrapper.unmount();
	});

	it('replaceDoc updates the doc without firing onChange', async () => {
		const Host = makeHost('hello');
		const wrapper = mount(Host, { attachTo: document.body });
		await nextTick();
		const vm = wrapper.vm as unknown as HostInstance;
		vm.handle.replaceDoc('world');
		await nextTick();
		expect(vm.handle.getView()?.state.doc.toString()).toBe('world');
		expect(vm.emitted).toEqual([]);
		wrapper.unmount();
	});

	it('replaceDoc is a no-op when content matches', async () => {
		const Host = makeHost('same');
		const wrapper = mount(Host, { attachTo: document.body });
		await nextTick();
		const vm = wrapper.vm as unknown as HostInstance;
		vm.handle.replaceDoc('same');
		await nextTick();
		expect(vm.emitted).toEqual([]);
		wrapper.unmount();
	});

	it('toggling readOnly via the ref reconfigures the editor', async () => {
		const Host = makeHost('hello');
		const wrapper = mount(Host, { attachTo: document.body });
		await nextTick();
		const vm = wrapper.vm as unknown as HostInstance;
		expect(vm.handle.getView()?.state.readOnly).toBe(false);
		vm.setReadOnly(true);
		await nextTick();
		expect(vm.handle.getView()?.state.readOnly).toBe(true);
		wrapper.unmount();
	});

	it('destroys the view on unmount', async () => {
		const Host = makeHost('x');
		const wrapper = mount(Host, { attachTo: document.body });
		await nextTick();
		const vm = wrapper.vm as unknown as HostInstance;
		const view = vm.handle.getView();
		expect(view).not.toBeNull();
		wrapper.unmount();
		// After unmount the handle's own pointer should be cleared.
		expect(vm.handle.getView()).toBeNull();
	});
});
