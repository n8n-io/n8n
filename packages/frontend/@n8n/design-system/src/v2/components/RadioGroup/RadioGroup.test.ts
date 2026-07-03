import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import type {
	RadioGroupItemProps as RekaRadioGroupItemProps,
	RadioGroupRootEmits,
	RadioGroupRootProps,
} from 'reka-ui';

import type { RadioGroupEmits, RadioGroupProps } from './RadioGroup.types';
import type { RadioGroupItemProps } from './RadioGroupItem.types';
import RadioGroupItem from './RadioGroupItem.vue';
import RadioGroup from './RadioGroup.vue';

type ExpectedRadioGroupProps = Omit<
	RadioGroupRootProps,
	'as' | 'asChild' | 'modelValue' | 'defaultValue'
> & {
	modelValue?: string;
	defaultValue?: string;
	ariaLabel?: string;
};
type AssertRadioGroupPropsMatch = RadioGroupProps extends ExpectedRadioGroupProps
	? ExpectedRadioGroupProps extends RadioGroupProps
		? true
		: never
	: never;
type AssertRadioGroupEmitsMatch = RadioGroupEmits extends RadioGroupRootEmits
	? RadioGroupRootEmits extends RadioGroupEmits
		? true
		: never
	: never;

type ExpectedRadioGroupItemProps = Pick<RekaRadioGroupItemProps, 'value' | 'disabled'> & {
	label?: string;
	description?: string;
};
type AssertRadioGroupItemPropsMatch = RadioGroupItemProps extends ExpectedRadioGroupItemProps
	? ExpectedRadioGroupItemProps extends RadioGroupItemProps
		? true
		: never
	: never;

// Compile-time checks — fails if our props drift from Reka UI.
const _radioGroupPropsMatch: AssertRadioGroupPropsMatch = true;
const _radioGroupEmitsMatch: AssertRadioGroupEmitsMatch = true;
const _radioGroupItemPropsMatch: AssertRadioGroupItemPropsMatch = true;

void _radioGroupPropsMatch;
void _radioGroupEmitsMatch;
void _radioGroupItemPropsMatch;

const options = [
	{ value: 'all', label: 'All' },
	{ value: 'readOnly', label: 'Read only' },
	{ value: 'custom', label: 'Custom' },
] as const;

function renderRadioGroup(modelValue = 'all', extraProps: Record<string, unknown> = {}) {
	return render(RadioGroup, {
		props: {
			modelValue,
			...extraProps,
		},
		slots: {
			default: options
				.map(
					(option) =>
						`<RadioGroupItem value="${option.value}" label="${option.label}" test-id="radio-${option.value}" />`,
				)
				.join(''),
		},
		global: {
			components: { RadioGroupItem },
		},
	});
}

describe('v2/components/RadioGroup', () => {
	describe('rendering', () => {
		it('renders one accessible radio per option', () => {
			const { getAllByRole } = renderRadioGroup();

			expect(getAllByRole('radio')).toHaveLength(3);
		});

		it('renders option descriptions when provided', () => {
			const { getByText } = render(RadioGroup, {
				props: { modelValue: 'custom' },
				slots: {
					default:
						'<RadioGroupItem value="custom" label="Custom" description="Pick scopes individually" />',
				},
				global: { components: { RadioGroupItem } },
			});

			expect(getByText('Pick scopes individually')).toBeInTheDocument();
		});

		it('marks the option matching modelValue as checked', () => {
			const { getByRole } = renderRadioGroup('readOnly');

			expect(getByRole('radio', { name: 'Read only' })).toBeChecked();
			expect(getByRole('radio', { name: 'All' })).not.toBeChecked();
		});
	});

	describe('v-model', () => {
		it('emits update:modelValue with the selected value', async () => {
			const { getByRole, emitted } = renderRadioGroup('all');

			await userEvent.click(getByRole('radio', { name: 'Custom' }));

			await waitFor(() => {
				expect(emitted('update:modelValue')?.at(-1)).toEqual(['custom']);
			});
		});

		it('does not emit for a disabled option', async () => {
			const { getByRole, emitted } = render(RadioGroup, {
				props: { modelValue: 'all' },
				slots: {
					default: `
						<RadioGroupItem value="all" label="All" />
						<RadioGroupItem value="custom" label="Custom" :disabled="true" />
					`,
				},
				global: { components: { RadioGroupItem } },
			});

			await userEvent.click(getByRole('radio', { name: 'Custom' }));

			expect(emitted('update:modelValue')).toBeUndefined();
		});

		it('disables every option when the group is disabled', async () => {
			const { getByRole, emitted } = renderRadioGroup('all', { disabled: true });

			expect(getByRole('radio', { name: 'Custom' })).toBeDisabled();

			await userEvent.click(getByRole('radio', { name: 'Custom' }));

			expect(emitted('update:modelValue')).toBeUndefined();
		});
	});

	describe('orientation', () => {
		it('applies horizontal orientation class', () => {
			const { container } = render(RadioGroup, {
				props: { modelValue: 'all', orientation: 'horizontal' },
				slots: { default: '<RadioGroupItem value="all" label="All" />' },
				global: { components: { RadioGroupItem } },
			});

			expect(container.querySelector('[class*="horizontal"]')).toBeInTheDocument();
		});
	});

	describe('accessibility', () => {
		it('forwards aria-label to the group', () => {
			const { getByRole } = render(RadioGroup, {
				props: { modelValue: 'all', ariaLabel: 'Scope selection mode' },
				slots: { default: '<RadioGroupItem value="all" label="All" />' },
				global: { components: { RadioGroupItem } },
			});

			expect(getByRole('radiogroup', { name: 'Scope selection mode' })).toBeInTheDocument();
		});

		it('forwards testId to the radio item element', () => {
			const { getByTestId } = render(RadioGroup, {
				props: { modelValue: 'all' },
				slots: { default: '<RadioGroupItem value="all" label="All" test-id="mode-all" />' },
				global: { components: { RadioGroupItem } },
			});

			expect(getByTestId('mode-all')).toHaveAttribute('role', 'radio');
		});
	});

	describe('slots', () => {
		it('allows custom content via the default slot on RadioGroupItem', () => {
			const { getByTestId } = render(RadioGroup, {
				props: { modelValue: 'all' },
				slots: {
					default: `
						<RadioGroupItem value="all">
							<span data-test-id="custom-content">Custom option</span>
						</RadioGroupItem>
					`,
				},
				global: { components: { RadioGroupItem } },
			});

			expect(getByTestId('custom-content')).toBeInTheDocument();
		});
	});
});

describe('v2/components/RadioGroupItem', () => {
	it('renders label text', () => {
		const { getByText } = render(RadioGroup, {
			props: { modelValue: 'all' },
			slots: { default: '<RadioGroupItem value="all" label="All scopes" />' },
			global: { components: { RadioGroupItem } },
		});

		expect(getByText('All scopes')).toBeInTheDocument();
	});

	it('renders disabled state', () => {
		const { getByRole } = render(RadioGroup, {
			props: { modelValue: 'all' },
			slots: { default: '<RadioGroupItem value="all" label="All" :disabled="true" />' },
			global: { components: { RadioGroupItem } },
		});

		expect(getByRole('radio', { name: 'All' })).toBeDisabled();
	});
});
