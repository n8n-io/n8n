import type { ICellEditorParams, IDateParams } from 'ag-grid-community';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';

import DataGridDateEditor from './DataGridDateEditor.vue';
import DataGridDateFilter from './DataGridDateFilter.vue';
import DataGridDatePicker from './DataGridDatePicker.vue';

type PickerExposed = {
	getDate: () => Date | null;
	setDate: (date: Date | null) => void;
};

const START = new Date(2026, 0, 2, 3, 4, 5);
const TYPED = new Date(2026, 2, 4, 5, 6, 0);

const wrappers: VueWrapper[] = [];

const track = <T extends VueWrapper>(wrapper: T) => {
	wrappers.push(wrapper);
	return wrapper;
};

const mountPicker = async (initialValue: Date | null = START) => {
	const wrapper = track(
		mount(DataGridDatePicker, {
			props: { initialValue, teleported: false, variant: 'editor' },
			attachTo: document.body,
		}),
	);
	await flushPromises();
	return { wrapper, picker: wrapper.vm as unknown as PickerExposed, input: wrapper.find('input') };
};

const pressKey = (input: Element, key: string) => {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
	const stopPropagation = vi.spyOn(event, 'stopPropagation');
	input.dispatchEvent(event);
	return { event, stopPropagation };
};

afterEach(() => {
	wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

describe('DataGridDatePicker', () => {
	it('should show the starting value and focus the input after mounting', async () => {
		const { picker, input } = await mountPicker();

		expect(input.element.value).toBe('2026-01-02 03:04:05');
		expect(document.activeElement).toBe(input.element);
		expect(picker.getDate()).toEqual(START);
	});

	it('should return null without a starting value', async () => {
		const { picker, input } = await mountPicker(null);

		expect(input.element.value).toBe('');
		expect(picker.getDate()).toBeNull();
	});

	it('should prefer a typed date over the picker value', async () => {
		const { picker, input } = await mountPicker();

		await input.setValue('2026-3-4 5:6');

		expect(picker.getDate()).toEqual(TYPED);
	});

	it('should commit a typed date on Enter and handle the key', async () => {
		const { wrapper, picker, input } = await mountPicker();
		await input.setValue('2026-3-4 5:6');

		const { event, stopPropagation } = pressKey(input.element, 'Enter');

		expect(wrapper.emitted('commit')).toHaveLength(1);
		expect(event.defaultPrevented).toBe(true);
		expect(stopPropagation).toHaveBeenCalled();
		expect(picker.getDate()).toEqual(TYPED);
	});

	it('should leave Enter to the picker when the typed text is not a date', async () => {
		const { wrapper, input } = await mountPicker();
		await input.setValue('2026-02-30');

		const { event } = pressKey(input.element, 'Enter');

		expect(wrapper.emitted('commit')).toBeUndefined();
		expect(event.defaultPrevented).toBe(false);
	});

	it('should cancel on Escape, stop the event and restore the starting value', async () => {
		const { wrapper, picker, input } = await mountPicker();
		await input.setValue('2026-3-4 5:6');
		pressKey(input.element, 'Enter');
		await input.setValue('');

		const { stopPropagation } = pressKey(input.element, 'Escape');

		expect(wrapper.emitted('cancel')).toHaveLength(1);
		expect(stopPropagation).toHaveBeenCalled();
		expect(picker.getDate()).toEqual(START);
	});

	it('should clear the date and report the change when the clear icon is clicked', async () => {
		const { wrapper, picker } = await mountPicker();

		await wrapper.find('.el-date-editor').trigger('mouseenter');
		await flushPromises();
		await wrapper.find('.clear-icon').trigger('click');
		await flushPromises();

		expect(wrapper.emitted('change')).toBeDefined();
		expect(picker.getDate()).toBeNull();
	});

	it('should set the date and the value that Escape restores', async () => {
		const { picker, input } = await mountPicker();
		const date = new Date(2027, 5, 6, 7, 8, 9);

		picker.setDate(date);
		await flushPromises();

		expect(input.element.value).toBe('2027-06-06 07:08:09');
		expect(picker.getDate()).toEqual(date);

		await input.setValue('');
		pressKey(input.element, 'Escape');
		expect(picker.getDate()).toEqual(date);
	});
});

describe('DataGridDateEditor', () => {
	const mountEditor = async (value: unknown) => {
		const stopEditing = vi.fn();
		const params = {
			value,
			stopEditing,
			column: { getActualWidth: () => 200 },
		} as unknown as ICellEditorParams;
		const wrapper = track(
			mount(DataGridDateEditor, { props: { params }, attachTo: document.body }),
		);
		await flushPromises();
		return {
			wrapper,
			stopEditing,
			editor: wrapper.vm as unknown as { getValue: () => Date | null; isPopup: () => boolean },
		};
	};

	it('should start from the cell value, including date strings', async () => {
		const { editor } = await mountEditor('2026-01-02T03:04:05.000Z');

		expect(editor.getValue()).toEqual(new Date('2026-01-02T03:04:05.000Z'));
		expect(editor.isPopup()).toBe(true);
	});

	it('should stop editing on commit, cancel and change', async () => {
		const { wrapper, stopEditing } = await mountEditor(START);
		const picker = wrapper.findComponent(DataGridDatePicker);

		picker.vm.$emit('commit');
		picker.vm.$emit('cancel');
		picker.vm.$emit('change');

		expect(stopEditing).toHaveBeenCalledTimes(3);
	});

	it('should fit the input into the cell', async () => {
		const { wrapper } = await mountEditor(START);

		expect(wrapper.findComponent(DataGridDatePicker).props('width')).toBe(196);
	});
});

describe('DataGridDateFilter', () => {
	const mountFilter = async () => {
		const onDateChanged = vi.fn();
		const params = { onDateChanged } as unknown as IDateParams;
		const wrapper = track(
			mount(DataGridDateFilter, { props: { params }, attachTo: document.body }),
		);
		await flushPromises();
		return { wrapper, onDateChanged, filter: wrapper.vm as unknown as PickerExposed };
	};

	it('should report a changed date on commit and change', async () => {
		const { wrapper, onDateChanged } = await mountFilter();
		const picker = wrapper.findComponent(DataGridDatePicker);

		picker.vm.$emit('commit');
		picker.vm.$emit('change');

		expect(onDateChanged).toHaveBeenCalledTimes(2);
	});

	it('should set and return the filter date', async () => {
		const { filter } = await mountFilter();

		filter.setDate(START);
		await flushPromises();

		expect(filter.getDate()).toEqual(START);
	});

	it('should clear the filter date and report it on cancel', async () => {
		const { wrapper, filter, onDateChanged } = await mountFilter();
		filter.setDate(START);
		await flushPromises();

		wrapper.findComponent(DataGridDatePicker).vm.$emit('cancel');
		await flushPromises();

		expect(filter.getDate()).toBeNull();
		expect(onDateChanged).toHaveBeenCalledOnce();
	});
});
