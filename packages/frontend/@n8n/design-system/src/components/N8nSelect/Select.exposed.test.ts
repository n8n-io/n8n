import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';

import type { N8nSelectExposed } from './Select.types';
import N8nSelect from './Select.vue';
import N8nOption from '../N8nOption/Option.vue';

/**
 * Characterisation tests for what N8nSelect puts on its template ref.
 *
 * Two editor-ui components reach through it into the wrapped element-plus
 * instance and had no coverage at all:
 *
 *   TagsDropdown.vue        `selectRef.value?.innerSelect` -> `.$refs`, then `selectRef.value.blur()`
 *   CredentialsDropdown.vue `selectRefs.value?.innerSelect?.handleClose()`
 *
 * These assertions are deliberately written against the public contract only,
 * so the same file passes on the string-ref implementation and on the
 * function-ref one. A behavioural difference between the two shows up as a
 * failure here rather than as a runtime break in editor-ui.
 */

/**
 * Every wrapper here is attached to the document, and an attached wrapper left
 * mounted outlives the test environment — it surfaces as an unhandled
 * `document is not defined` blamed on an unrelated file, while every per-file
 * result still reads green. Tracked teardown rather than unmounting inline, so an
 * assertion failing mid-test cannot leak one.
 */
const mounted: Array<{ unmount: () => void }> = [];

afterEach(() => {
	while (mounted.length) mounted.pop()?.unmount();
});

const mountHost = () => {
	const Host = defineComponent({
		components: { N8nSelect, N8nOption },
		setup() {
			const selectRef = ref<N8nSelectExposed | null>(null);
			const selected = ref('');
			const placeholder = ref('first');
			return { selectRef, selected, placeholder };
		},
		template: `
			<N8nSelect ref="selectRef" v-model="selected" :placeholder="placeholder" :teleported="false">
				<N8nOption value="1" label="1" />
				<N8nOption value="2" label="2" />
			</N8nSelect>
		`,
	});

	const wrapper = mount(Host, { attachTo: document.body });
	mounted.push(wrapper);
	return wrapper;
};

const exposedOf = (wrapper: ReturnType<typeof mountHost>) =>
	wrapper.vm.selectRef as unknown as N8nSelectExposed;

describe('N8nSelect exposed template ref', () => {
	it('populates innerSelect with the wrapped element-plus instance after mount', async () => {
		const wrapper = mountHost();
		await nextTick();

		const inner = exposedOf(wrapper).innerSelect;

		expect(inner).not.toBeNull();
		// The two call sites depend on these three reaching element-plus, not on
		// anything N8nSelect proxies itself.
		expect(typeof inner?.handleClose).toBe('function');
		expect(typeof inner?.focus).toBe('function');
		expect(inner?.$refs).toBeTypeOf('object');
	});

	it('exposes focus, blur and focusOnInput as callable functions', async () => {
		const wrapper = mountHost();
		await nextTick();

		const exposed = exposedOf(wrapper);

		expect(typeof exposed.focus).toBe('function');
		expect(typeof exposed.blur).toBe('function');
		expect(typeof exposed.focusOnInput).toBe('function');

		// CredentialsDropdown.closeSelect() calls handleClose() then blur().
		expect(() => exposed.innerSelect?.handleClose()).not.toThrow();
		expect(() => exposed.blur()).not.toThrow();
		expect(() => exposed.focus()).not.toThrow();
		expect(() => exposed.focusOnInput()).not.toThrow();
	});

	it('delegates focus and blur to the wrapped instance', async () => {
		const wrapper = mountHost();
		await nextTick();

		const exposed = exposedOf(wrapper);
		const inner = exposed.innerSelect!;
		const focusSpy = vi.spyOn(inner, 'focus');
		const blurSpy = vi.spyOn(inner, 'blur');

		// Not just "does not throw": the proxies have to reach the instance the
		// function ref captured, which is what a mis-assigned ref would break.
		exposed.focus();
		expect(focusSpy).toHaveBeenCalledTimes(1);

		exposed.blur();
		expect(blurSpy).toHaveBeenCalledTimes(1);
	});

	it('focuses the inner input via focusOnInput', async () => {
		const wrapper = mountHost();
		await nextTick();

		exposedOf(wrapper).focusOnInput();

		// Reaches the input through `innerSelect.$refs.selectWrapper`, so this fails
		// if the exposed instance is null or not the real ElSelect.
		expect(wrapper.find('input').element).toBe(document.activeElement);
	});

	it('keeps the same innerSelect instance across a parent re-render', async () => {
		const wrapper = mountHost();
		await nextTick();

		const before = exposedOf(wrapper).innerSelect;
		expect(before).not.toBeNull();

		// A function ref whose identity changed per render would be invoked with
		// null and then the instance again on every patch, leaving a window where
		// consumers read null. Force a re-render of the ElSelect vnode.
		wrapper.vm.placeholder = 'second';
		await nextTick();
		wrapper.vm.placeholder = 'third';
		await nextTick();

		const after = exposedOf(wrapper).innerSelect;

		expect(after).not.toBeNull();
		expect(after).toBe(before);
	});

	it('survives being read repeatedly without re-wrapping', async () => {
		const wrapper = mountHost();
		await nextTick();

		const exposed = exposedOf(wrapper);

		// Reading through the expose proxy must yield the raw instance, not a Ref.
		expect(exposed.innerSelect).toBe(exposed.innerSelect);
		expect(exposed.innerSelect).not.toHaveProperty('value');
	});

	it('clears innerSelect on unmount', async () => {
		const wrapper = mountHost();
		await nextTick();

		const exposed = exposedOf(wrapper);
		expect(exposed.innerSelect).not.toBeNull();

		wrapper.unmount();
		await nextTick();

		expect(exposed.innerSelect).toBeNull();
	});

	it('renders the prepend and prefix slots; suffix is not an ElSelect slot', async () => {
		const Host = defineComponent({
			components: { N8nSelect, N8nOption },
			setup() {
				const selected = ref('');
				return { selected };
			},
			template: `
				<N8nSelect v-model="selected" :teleported="false">
					<template #prepend><span class="slot-prepend">P</span></template>
					<template #prefix><span class="slot-prefix">F</span></template>
					<template #suffix><span class="slot-suffix">S</span></template>
					<N8nOption value="1" label="1" />
				</N8nSelect>
			`,
		});

		const wrapper = mount(Host, { attachTo: document.body });
		mounted.push(wrapper);
		await nextTick();

		// `prepend` is rendered by N8nSelect itself, `prefix` is forwarded to a real
		// ElSelect slot.
		expect(wrapper.find('.slot-prepend').exists()).toBe(true);
		expect(wrapper.find('.slot-prefix').exists()).toBe(true);

		// `suffix` is forwarded to a slot element-plus does not define, so it never
		// renders. Pinned deliberately: this is long-standing behaviour, verified
		// identical before and after the string-ref -> function-ref change. If a
		// future element-plus adds the slot this flips, and that should be a
		// conscious change rather than a surprise.
		expect(wrapper.find('.slot-suffix').exists()).toBe(false);
	});
});
