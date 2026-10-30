import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { defineComponent, nextTick, ref } from 'vue';

import N8nListbox from './Listbox.vue';
import N8nListboxItem from './ListboxItem.vue';

const Harness = defineComponent({
	components: { N8nListbox, N8nListboxItem },
	props: {
		modelValue: { type: String, required: false },
	},
	emits: ['update:modelValue', 'select'],
	setup(props, { emit }) {
		const value = ref(props.modelValue);
		function onUpdate(next: string | undefined) {
			value.value = next;
			emit('update:modelValue', next);
		}
		function onKeep(event: Event) {
			event.preventDefault();
			emit('select', event);
		}
		return { value, onUpdate, onKeep };
	},
	template: `
		<N8nListbox :model-value="value" label="Versions" @update:model-value="onUpdate">
			<N8nListboxItem value="v2">
				<span data-test-id="v2-body">v2</span>
			</N8nListboxItem>
			<N8nListboxItem value="v1">
				<span data-test-id="v1-body">v1</span>
			</N8nListboxItem>
			<N8nListboxItem value="v0" disabled>v0</N8nListboxItem>
			<N8nListboxItem value="keep" @select="onKeep">Keep</N8nListboxItem>
		</N8nListbox>
	`,
});

const ControlledFrozen = defineComponent({
	components: { N8nListbox, N8nListboxItem },
	template: `
		<N8nListbox model-value="v1" label="Versions">
			<N8nListboxItem value="v2">v2</N8nListboxItem>
			<N8nListboxItem value="v1">v1</N8nListboxItem>
		</N8nListbox>
	`,
});

const ControlledExternal = defineComponent({
	components: { N8nListbox, N8nListboxItem },
	setup() {
		const value = ref('v1');
		return { value };
	},
	template: `
		<div>
			<button type="button" @click="value = 'v2'">Set v2</button>
			<N8nListbox v-model="value" label="Versions">
				<N8nListboxItem value="v2">v2</N8nListboxItem>
				<N8nListboxItem value="v1">v1</N8nListboxItem>
			</N8nListbox>
		</div>
	`,
});

const Uncontrolled = defineComponent({
	components: { N8nListbox, N8nListboxItem },
	template: `
		<N8nListbox default-value="v1" label="Versions">
			<N8nListboxItem value="v2">v2</N8nListboxItem>
			<N8nListboxItem value="v1">v1</N8nListboxItem>
		</N8nListbox>
	`,
});

const SelectionHarness = defineComponent({
	components: { N8nListbox, N8nListboxItem },
	props: {
		selectionBehavior: { type: String, required: true },
	},
	setup() {
		const value = ref<string | undefined>('v2');
		return { value };
	},
	template: `
		<N8nListbox v-model="value" :selection-behavior="selectionBehavior" label="Versions">
			<N8nListboxItem value="v2">v2</N8nListboxItem>
			<N8nListboxItem value="v1">v1</N8nListboxItem>
		</N8nListbox>
	`,
});

const HoverHarness = defineComponent({
	components: { N8nListbox, N8nListboxItem },
	props: {
		highlightOnHover: { type: Boolean, required: true },
	},
	setup() {
		const value = ref('v2');
		return { value };
	},
	template: `
		<N8nListbox v-model="value" :highlight-on-hover="highlightOnHover" label="Versions">
			<N8nListboxItem value="v2">v2</N8nListboxItem>
			<N8nListboxItem value="v1">v1</N8nListboxItem>
		</N8nListbox>
	`,
});

const HorizontalHarness = defineComponent({
	components: { N8nListbox, N8nListboxItem },
	setup() {
		const value = ref('compact');
		return { value };
	},
	template: `
		<N8nListbox v-model="value" orientation="horizontal" label="Density">
			<N8nListboxItem value="compact">Compact</N8nListboxItem>
			<N8nListboxItem value="comfortable">Comfortable</N8nListboxItem>
			<N8nListboxItem value="spacious">Spacious</N8nListboxItem>
		</N8nListbox>
	`,
});

describe('N8nListbox', () => {
	it('selects an item and paints the whole option', async () => {
		const { getByRole, getByTestId, emitted } = render(Harness, { props: { modelValue: 'v1' } });
		const current = getByRole('option', { name: 'v2' });

		expect(getByRole('listbox', { name: 'Versions' })).toContainElement(current);
		expect(getByRole('option', { name: 'v1' })).toHaveAttribute('aria-selected', 'true');
		expect(current).toContainElement(getByTestId('v2-body'));

		await userEvent.click(current);

		expect(emitted('update:modelValue')).toEqual([['v2']]);
		expect(current).toHaveAttribute('aria-selected', 'true');
		expect(current).toHaveAttribute('data-highlighted');
	});

	it('moves the highlight with the arrow keys and selects on Enter', async () => {
		const { getByRole, emitted } = render(Harness, { props: { modelValue: 'v2' } });
		await nextTick();
		const current = getByRole('option', { name: 'v2' });
		current.focus();

		await userEvent.keyboard('{ArrowDown}');

		const next = getByRole('option', { name: 'v1' });
		expect(next).toHaveAttribute('data-highlighted');
		expect(next).toContainElement(next.querySelector('[data-test-id="v1-body"]'));
		expect(current).not.toHaveAttribute('data-highlighted');

		await userEvent.keyboard('{Enter}');

		expect(emitted('update:modelValue')).toEqual([['v1']]);
	});

	it('skips a disabled item', async () => {
		const { getByRole, emitted } = render(Harness, { props: { modelValue: 'v1' } });
		const disabled = getByRole('option', { name: 'v0' });

		expect(disabled).toHaveAttribute('aria-disabled', 'true');
		await userEvent.click(disabled);

		expect(emitted('update:modelValue')).toBeUndefined();
	});

	it('keeps the value when the item select event is cancelled', async () => {
		const { getByRole, emitted } = render(Harness, { props: { modelValue: 'v2' } });

		await userEvent.click(getByRole('option', { name: 'Keep' }));

		expect(emitted('select')).toHaveLength(1);
		expect(emitted('update:modelValue')).toBeUndefined();
		expect(getByRole('option', { name: 'v2' })).toHaveAttribute('aria-selected', 'true');
	});

	it('keeps the parent value until the parent accepts the update', async () => {
		const { getByRole } = render(ControlledFrozen);

		await userEvent.click(getByRole('option', { name: 'v2' }));

		expect(getByRole('option', { name: 'v1' })).toHaveAttribute('aria-selected', 'true');
		expect(getByRole('option', { name: 'v2' })).not.toHaveAttribute('aria-selected', 'true');
	});

	it('follows a value set from outside the list', async () => {
		const { getByRole } = render(ControlledExternal);

		await userEvent.click(getByRole('button', { name: 'Set v2' }));

		expect(getByRole('option', { name: 'v2' })).toHaveAttribute('aria-selected', 'true');
	});

	it('uses defaultValue when the parent does not bind a value', async () => {
		const { getByRole } = render(Uncontrolled);

		expect(getByRole('option', { name: 'v1' })).toHaveAttribute('aria-selected', 'true');

		await userEvent.click(getByRole('option', { name: 'v2' }));

		expect(getByRole('option', { name: 'v2' })).toHaveAttribute('aria-selected', 'true');
		expect(getByRole('option', { name: 'v1' })).not.toHaveAttribute('aria-selected', 'true');
	});

	it('keeps the value when the user activates the selected item again', async () => {
		const { getByRole } = render(SelectionHarness, { props: { selectionBehavior: 'replace' } });

		await userEvent.click(getByRole('option', { name: 'v2' }));

		expect(getByRole('option', { name: 'v2' })).toHaveAttribute('aria-selected', 'true');
	});

	it('clears the value when selection behavior is toggle', async () => {
		const { getByRole } = render(SelectionHarness, { props: { selectionBehavior: 'toggle' } });

		await userEvent.click(getByRole('option', { name: 'v2' }));

		expect(getByRole('option', { name: 'v2' })).not.toHaveAttribute('aria-selected', 'true');
		expect(getByRole('option', { name: 'v1' })).not.toHaveAttribute('aria-selected', 'true');
	});

	it('moves the highlight with the pointer when highlightOnHover is set', async () => {
		const { getByRole } = render(HoverHarness, { props: { highlightOnHover: true } });
		await nextTick();

		await userEvent.hover(getByRole('option', { name: 'v1' }));

		expect(getByRole('option', { name: 'v1' })).toHaveAttribute('data-highlighted');
		expect(getByRole('option', { name: 'v2' })).not.toHaveAttribute('data-highlighted');
	});

	it('does not move the highlight on hover when highlightOnHover is off', async () => {
		const { getByRole } = render(HoverHarness, { props: { highlightOnHover: false } });
		await nextTick();
		const current = getByRole('option', { name: 'v2' });
		current.focus();

		await userEvent.hover(getByRole('option', { name: 'v1' }));

		expect(current).toHaveAttribute('data-highlighted');
		expect(getByRole('option', { name: 'v1' })).not.toHaveAttribute('data-highlighted');
	});

	it('moves the highlight with Left and Right when orientation is horizontal', async () => {
		const { getByRole } = render(HorizontalHarness);
		await nextTick();
		const list = getByRole('listbox', { name: 'Density' });

		expect(list).toHaveAttribute('aria-orientation', 'horizontal');
		expect(list).toHaveAttribute('data-orientation', 'horizontal');

		getByRole('option', { name: 'Compact' }).focus();
		await userEvent.keyboard('{ArrowRight}');

		expect(getByRole('option', { name: 'Comfortable' })).toHaveAttribute('data-highlighted');

		await userEvent.keyboard('{ArrowDown}');

		expect(getByRole('option', { name: 'Comfortable' })).toHaveAttribute('data-highlighted');
		expect(getByRole('option', { name: 'Spacious' })).not.toHaveAttribute('data-highlighted');
	});
});
