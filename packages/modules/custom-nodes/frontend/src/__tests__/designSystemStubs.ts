/**
 * Test stand-ins for design-system components that render into a portal. `N8nDialog` renders
 * inline, and `N8nSelect2` and `N8nCombobox2` are native selects with the same props and events.
 * The design system tests cover the real components.
 */
export const N8nDialogStub = {
	name: 'N8nDialog',
	props: ['open', 'size', 'header'],
	emits: ['update:open'],
	template: `
		<div v-if="open" role="dialog">
			<h2>{{ header }}</h2>
			<button type="button" data-test-id="dialog-close" @click="$emit('update:open', false)" />
			<slot />
		</div>
	`,
};

export const N8nSelect2Stub = {
	name: 'N8nSelect2',
	inheritAttrs: false,
	props: ['modelValue', 'items', 'disabled', 'placeholder'],
	emits: ['update:modelValue'],
	template: `
		<select
			v-bind="$attrs"
			:value="modelValue"
			:disabled="disabled"
			@change="$emit('update:modelValue', $event.target.value)"
		>
			<option value="" disabled>{{ placeholder }}</option>
			<option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option>
		</select>
	`,
};

export const N8nCombobox2Stub = { ...N8nSelect2Stub, name: 'N8nCombobox2' };
