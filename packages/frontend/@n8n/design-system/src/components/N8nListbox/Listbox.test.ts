import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/vue';
import { defineComponent, nextTick, ref } from 'vue';

import N8nListbox from './Listbox.vue';
import N8nListboxItem from './ListboxItem.vue';

const HarnessWithButton = defineComponent({
	components: { N8nListbox, N8nListboxItem },
	props: {
		modelValue: { type: String, required: false },
	},
	setup(props) {
		const value = ref(props.modelValue);
		return { value };
	},
	template: `
		<N8nListbox :model-value="value" label="Versions" @update:model-value="value = $event">
			<N8nListboxItem value="v2" aria-label="v2">
				<span>v2</span>
				<button type="button">Compare</button>
			</N8nListboxItem>
			<N8nListboxItem value="v1" aria-label="v1">v1</N8nListboxItem>
		</N8nListbox>
	`,
});

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

	it('tabs through a control inside the item before the next item', async () => {
		const { getByRole } = render(HarnessWithButton, { props: { modelValue: 'v2' } });
		await nextTick();
		const current = getByRole('option', { name: 'v2' });
		current.focus();

		await userEvent.tab();

		const compare = getByRole('button', { name: 'Compare' });
		expect(compare).toHaveFocus();
		expect(current).toHaveAttribute('data-highlighted');

		await userEvent.keyboard('{ArrowDown}');

		expect(current).toHaveAttribute('data-highlighted');
		expect(getByRole('option', { name: 'v1' })).not.toHaveAttribute('data-highlighted');

		await userEvent.tab();

		const next = getByRole('option', { name: 'v1' });
		expect(next).toHaveFocus();
		expect(next).toHaveAttribute('data-highlighted');

		await userEvent.tab({ shift: true });

		expect(compare).toHaveFocus();
	});

	it('moves the highlight with Tab and then with the arrow keys', async () => {
		const { getByRole } = render(Harness, { props: { modelValue: 'v2' } });
		await nextTick();
		getByRole('option', { name: 'v2' }).focus();

		await userEvent.tab();

		const next = getByRole('option', { name: 'v1' });
		expect(next).toHaveAttribute('data-highlighted');
		expect(next).toHaveFocus();

		await userEvent.tab({ shift: true });

		expect(getByRole('option', { name: 'v2' })).toHaveFocus();
		expect(getByRole('option', { name: 'v1' })).not.toHaveAttribute('data-highlighted');
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
});
