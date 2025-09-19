import { computed, nextTick, ref } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/vue';
import Assignment from './Assignment.vue';
import { defaultSettings } from '@/__tests__/defaults';
import { STORES } from '@n8n/stores';
import merge from 'lodash/merge';
import * as useResolvedExpression from '@/composables/useResolvedExpression';

const DEFAULT_SETUP = {
	pinia: createTestingPinia({
		initialState: { [STORES.SETTINGS]: { settings: merge({}, defaultSettings) } },
	}),
	props: {
		path: 'parameters.fields.0',
		modelValue: {
			name: '',
			type: 'string',
			value: '',
		},
		issues: [],
	},
};

const renderComponent = createComponentRenderer(Assignment, DEFAULT_SETUP);

describe('Assignment.vue', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('can edit name, type and value', async () => {
		const { getByTestId, baseElement, emitted } = renderComponent();

		const nameField = getByTestId('assignment-name').querySelector('input') as HTMLInputElement;
		const valueField = getByTestId('assignment-value').querySelector('input') as HTMLInputElement;

		expect(getByTestId('assignment')).toBeInTheDocument();
		expect(getByTestId('assignment-name')).toBeInTheDocument();
		expect(getByTestId('assignment-value')).toBeInTheDocument();
		expect(getByTestId('assignment-type-select')).toBeInTheDocument();

		await userEvent.type(nameField, 'New name');
		await userEvent.type(valueField, 'New value');

		await userEvent.click(baseElement.querySelectorAll('.option')[3]);

		await waitFor(() =>
			expect(emitted('update:model-value')[0]).toEqual([
				{ name: 'New name', type: 'array', value: 'New value' },
			]),
		);
	});

	it('can remove itself', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('assignment-remove'));

		expect(emitted('remove')).toEqual([[]]);
	});

	it('should not display parameter input hint if expressionOutput is not set', () => {
		const { getByTestId } = renderComponent();

		// Check if the parameter input hint is not displayed
		expect(() => getByTestId('parameter-input-hint')).toThrow();
	});

	it('should shorten the expression preview hint if options are on the bottom', async () => {
		vi.spyOn(useResolvedExpression, 'useResolvedExpression').mockReturnValueOnce({
			resolvedExpressionString: ref('foo'),
			resolvedExpression: ref(null),
			isExpression: computed(() => true),
		});
		const { getByTestId } = renderComponent();

		const previewValue = getByTestId('parameter-expression-preview-value');

		expect(previewValue).not.toHaveClass('optionsPadding');

		await fireEvent.mouseEnter(getByTestId('assignment-value'));
		await nextTick();

		expect(previewValue).toHaveClass('optionsPadding');
	});
});
