import { describe, it, expect, vi } from 'vitest';
import { h, defineComponent, ref } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { renderComponent } from '@/__tests__/render';
import type { ICellEditorParams } from 'ag-grid-community';
import JsonCellEditor from '@/features/dataTable/components/dataGrid/JsonCellEditor.vue';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/features/editors/components/JsonEditor/JsonEditor.vue', () => ({
	default: defineComponent({
		name: 'JsonEditorStub',
		props: {
			modelValue: { type: String, default: '' },
			rows: { type: Number, default: 4 },
			fillParent: { type: Boolean, default: false },
		},
		emits: ['update:modelValue'],
		setup(props, { emit, expose }) {
			const local = ref(props.modelValue);
			function focus() {}
			expose({ focus });
			return () =>
				h('textarea', {
					'data-test-id': 'json-editor-input',
					value: local.value,
					rows: props.rows,
					onInput: (e: Event) => {
						const target = e.target as HTMLTextAreaElement;
						local.value = target.value;
						emit('update:modelValue', target.value);
					},
				});
		},
	}),
}));

function createParams(
	initialValue: Record<string, unknown>,
	apiOverrides: Partial<ICellEditorParams['api']> = {},
) {
	const api = {
		stopEditing: vi.fn(),
		...apiOverrides,
	} as unknown as ICellEditorParams['api'];

	return {
		value: initialValue,
		api,
	} as unknown as ICellEditorParams;
}

describe('JsonCellEditor', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('renders with initial value and binds v-model', async () => {
		const params = createParams({ foo: 1 });
		const { getByTestId } = renderComponent(JsonCellEditor, {
			props: { params },
		});

		const input = getByTestId('json-editor-input');
		expect((input as HTMLInputElement).value).toBe(JSON.stringify({ foo: 1 }, null, 2));

		await fireEvent.update(input, '{"bar":2}');
		expect((input as HTMLInputElement).value).toBe('{"bar":2}');
	});

	it('pressing Escape cancels editing via grid api', async () => {
		const params = createParams({ a: 1 });
		const { container } = renderComponent(JsonCellEditor, {
			props: { params },
		});

		const wrapper = container.querySelector('.grid-cell-json-editor');
		expect(wrapper).not.toBeNull();
		await fireEvent.keyDown(wrapper as Element, { key: 'Escape' });

		expect(params.api.stopEditing).toHaveBeenCalledTimes(1);
		expect(params.api.stopEditing).toHaveBeenCalledWith(true);
	});
});
