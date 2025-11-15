import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { createTestNodeProperties } from '@/__tests__/mocks';
import ParameterInputExpanded from './ParameterInputExpanded.vue';
import type { INodePropertyCollection } from 'n8n-workflow';
import userEvent from '@testing-library/user-event';
import { nextTick } from 'vue';

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: vi.fn(),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	i18n: {
		baseText: vi.fn().mockImplementation((key) => key),
		credText: vi.fn().mockReturnValue({
			inputLabelDisplayName: () => 'Test label',
			inputLabelDescription: () => 'Test description',
			hint: () => 'Test hint',
			placeholder: () => 'Test placeholder',
		}),
		nodeText: vi.fn().mockReturnValue({
			inputLabelDisplayName: () => 'Test label',
			inputLabelDescription: () => 'Test description',
			hint: () => 'Test hint',
			placeholder: () => 'Test placeholder',
		}),
	},
	i18nInstance: {
		global: {
			t: vi.fn().mockImplementation((key) => key),
		},
	},
	useI18n: vi.fn().mockReturnValue({
		baseText: vi.fn().mockImplementation((key) => key),
		credText: vi.fn().mockReturnValue({
			inputLabelDisplayName: () => 'Test label',
			inputLabelDescription: () => 'Test description',
			hint: () => 'Test hint',
			placeholder: () => 'Test placeholder',
		}),
		nodeText: vi.fn().mockReturnValue({
			inputLabelDisplayName: () => 'Test label',
			inputLabelDescription: () => 'Test description',
			hint: () => 'Test hint',
			placeholder: () => 'Test placeholder',
		}),
	}),
}));

describe('ParameterInputExpanded.vue', () => {
	const mockPinia = createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: SETTINGS_STORE_DEFAULT_STATE,
			[STORES.UI]: {
				activeCredentialType: 'testCred',
			},
			[STORES.WORKFLOWS]: {
				workflowId: 'test-workflow',
			},
		},
	});

	const renderComponent = createComponentRenderer(ParameterInputExpanded, {
		pinia: mockPinia,
	});

	describe('FixedCollectionParameter', () => {
		const fixedCollectionParameter = createTestNodeProperties({
			name: 'headers',
			type: 'fixedCollection',
			displayName: 'Headers',
			typeOptions: {
				multipleValues: true,
			},
			options: [
				{
					name: 'values',
					displayName: 'Values',
					default: { values: [{ name: '', value: '' }] },
					values: [
						{
							name: 'name',
							type: 'string',
							displayName: 'Name',
							default: '',
						},
						{
							name: 'value',
							type: 'string',
							displayName: 'Value',
							default: '',
						},
					],
				} as INodePropertyCollection,
			],
		});

		it('should render FixedCollectionParameter for fixedCollection type', async () => {
			const nodeValues = {
				headers: { values: [{ name: '', value: '' }] },
			};
			const { getByTestId } = renderComponent({
				props: {
					parameter: fixedCollectionParameter,
					value: nodeValues.headers,
					nodeValues,
				},
			});
			await vi.dynamicImportSettled();

			expect(getByTestId('fixed-collection-wrapper')).toBeInTheDocument();
		});

		it('should update the value when the user types', async () => {
			const nodeValues = {
				headers: { values: [{ name: 'Content-', value: '' }] },
			};
			const { queryAllByTestId } = renderComponent({
				props: {
					parameter: fixedCollectionParameter,
					value: nodeValues.headers,
					nodeValues,
				},
			});
			await vi.dynamicImportSettled();
			const input = queryAllByTestId('parameter-input-field')[0];

			await userEvent.type(input, 'Type');
			await nextTick();

			expect(input).toHaveValue('Content-Type');
		});

		it('should add a new option when the user clicks the add button', async () => {
			const nodeValues = {
				headers: { values: [{ name: '', value: '' }] },
			};
			const { getByTestId, queryAllByTestId } = renderComponent({
				props: {
					parameter: fixedCollectionParameter,
					value: nodeValues.headers,
					nodeValues,
				},
			});
			await vi.dynamicImportSettled();

			const inputsBefore = queryAllByTestId('parameter-input-field');
			expect(inputsBefore.length).toBe(2);

			const button = getByTestId('fixed-collection-add');
			await userEvent.click(button);
			await nextTick();

			const inputsAfter = queryAllByTestId('parameter-input-field');
			expect(inputsAfter.length).toBe(4);
		});

		describe('ParameterInputWrapper', () => {
			const parameter = createTestNodeProperties({
				name: 'test',
				type: 'string',
			});

			it('should render ParameterInputWrapper for non fixedCollection type', async () => {
				const { getByTestId, queryByTestId } = renderComponent({
					props: {
						parameter,
						value: 'test',
					},
				});
				await vi.dynamicImportSettled();

				expect(getByTestId('parameter-input')).toBeInTheDocument();
				// verify that the fixed collection wrapper is not rendered as it too contains `parameter-input` fields
				expect(queryByTestId('fixed-collection-wrapper')).not.toBeInTheDocument();
			});

			it('should update the value when the user types', async () => {
				const { getByTestId } = renderComponent({
					props: {
						parameter,
						value: 'test',
					},
				});
				await vi.dynamicImportSettled();
				const input = getByTestId('parameter-input-field');

				await userEvent.type(input, '123');
				await nextTick();

				expect(input).toHaveValue('test123');
			});
		});
	});
});
