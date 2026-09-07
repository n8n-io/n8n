import type { IconOrEmoji } from '@n8n/design-system';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import type { INodeProperties } from 'n8n-workflow';
import { defineComponent, type PropType } from 'vue';

import IconParameterInput from './IconParameterInput.vue';

/**
 * Stands in for `N8nIconPicker`, whose own behaviour design-system tests. What is
 * under test here is the adapter: the props this module hands down, and the value
 * it emits back up.
 */
const IconPickerStub = defineComponent({
	name: 'N8nIconPicker',
	props: {
		modelValue: { type: Object as PropType<IconOrEmoji | undefined>, default: undefined },
		buttonTooltip: { type: String, default: '' },
		buttonSize: { type: String, default: '' },
		isReadOnly: { type: Boolean, default: false },
	},
	emits: ['update:modelValue', 'focus', 'blur'],
	template: `<button
		data-test-id="picker"
		:data-model="JSON.stringify(modelValue ?? null)"
		:data-tooltip="buttonTooltip"
		:data-size="buttonSize"
		:data-read-only="String(isReadOnly)"
		@click="$emit('update:modelValue', { type: 'emoji', value: '\u{1F60E}' })"
		@focus="$emit('focus')"
		@blur="$emit('blur')"
	/>`,
});

const parameter = (overrides: Partial<INodeProperties> = {}): INodeProperties => ({
	displayName: 'Agent Icon',
	name: 'agentIcon',
	type: 'icon',
	default: { type: 'icon', value: 'bot' },
	...overrides,
});

const renderComponent = createComponentRenderer(IconParameterInput, {
	props: {
		parameter: parameter(),
		modelValue: { type: 'icon', value: 'bot' },
		isReadOnly: false,
		hideLabel: false,
	},
	global: {
		// eslint-disable-next-line @typescript-eslint/naming-convention -- a stub key is a component name
		stubs: { N8nIconPicker: IconPickerStub },
	},
});

describe('IconParameterInput', () => {
	describe('the value it shows', () => {
		it('reads the icon out of the parameter value', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('picker')).toHaveAttribute(
				'data-model',
				JSON.stringify({ type: 'icon', value: 'bot' }),
			);
		});

		it('shows an emoji value', () => {
			const { getByTestId } = renderComponent({
				props: { modelValue: { type: 'emoji', value: '🐶' } },
			});

			expect(getByTestId('picker')).toHaveAttribute(
				'data-model',
				JSON.stringify({ type: 'emoji', value: '🐶' }),
			);
		});

		// The old built-in adapter returned `undefined` for anything the schema rejects,
		// which is what puts the picker on its placeholder icon.
		it.each([
			['an expression', '={{ $json.icon }}'],
			['an empty string', ''],
			['a wrong shape', { type: 'sticker', value: 'x' }],
		])('shows no selection for %s', (_label, modelValue) => {
			const { getByTestId } = renderComponent({ props: { modelValue } });

			expect(getByTestId('picker')).toHaveAttribute('data-model', 'null');
		});

		// The schema carries `type` and `value` only. A stored `color` is not part of the
		// contract and must not reach the picker.
		it('drops any extra key the stored value carries', () => {
			const { getByTestId } = renderComponent({
				props: { modelValue: { type: 'icon', value: 'bot', color: '--node--icon--color--blue' } },
			});

			expect(getByTestId('picker')).toHaveAttribute(
				'data-model',
				JSON.stringify({ type: 'icon', value: 'bot' }),
			);
		});
	});

	describe('the value it emits', () => {
		it('emits the picked value as a plain type/value pair', async () => {
			const { getByTestId, emitted } = renderComponent();

			await userEvent.click(getByTestId('picker'));

			expect(emitted('update:modelValue')).toEqual([[{ type: 'emoji', value: '😎' }]]);
		});

		// The shell debounces `update:modelValue` by 100 ms before the value returns on
		// `modelValue`. The picker renders from the prop, so without the optimistic hold
		// the button would show the previous icon until then.
		it('shows the picked value before the shell sends it back', async () => {
			const { getByTestId } = renderComponent();

			await userEvent.click(getByTestId('picker'));

			expect(getByTestId('picker')).toHaveAttribute(
				'data-model',
				JSON.stringify({ type: 'emoji', value: '😎' }),
			);
		});

		it('yields to the shell once a new value arrives', async () => {
			const { getByTestId, rerender } = renderComponent();
			await userEvent.click(getByTestId('picker'));

			await rerender({ modelValue: { type: 'icon', value: 'star' } });

			expect(getByTestId('picker')).toHaveAttribute(
				'data-model',
				JSON.stringify({ type: 'icon', value: 'star' }),
			);
		});

		it('passes focus and blur through to the shell', () => {
			const { getByTestId, emitted } = renderComponent();

			getByTestId('picker').focus();
			getByTestId('picker').blur();

			expect(emitted('focus')).toHaveLength(1);
			expect(emitted('blur')).toHaveLength(1);
		});
	});

	// One render against the real picker, so this suite fails if the module stops being
	// able to mount a design-system component at all. The stubbed cases above cover the
	// adapter; design-system tests the picker itself.
	describe('against the real picker', () => {
		const renderReal = createComponentRenderer(IconParameterInput, {
			props: {
				parameter: parameter(),
				modelValue: { type: 'icon', value: 'star' },
				isReadOnly: false,
				hideLabel: false,
			},
		});

		it('names the trigger with the tooltip', () => {
			const { getByRole } = renderReal();

			expect(getByRole('button', { name: 'Select icon or emoji' })).toBeEnabled();
		});

		it('disables the trigger for a read-only parameter', () => {
			const { getByRole } = renderReal({ props: { isReadOnly: true } });

			expect(getByRole('button', { name: 'Select icon or emoji' })).toBeDisabled();
		});

		it('shows an emoji value on the trigger', () => {
			const { getByRole } = renderReal({
				props: { modelValue: { type: 'emoji', value: '\u{1F436}' } },
			});

			expect(getByRole('button', { name: 'Select icon or emoji' })).toHaveTextContent('\u{1F436}');
		});
	});

	describe('the props it hands down', () => {
		it('uses the placeholder of the parameter as the button tooltip', () => {
			const { getByTestId } = renderComponent({
				props: { parameter: parameter({ placeholder: 'Pick the agent icon' }) },
			});

			expect(getByTestId('picker')).toHaveAttribute('data-tooltip', 'Pick the agent icon');
		});

		it('falls back to the shared tooltip string', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('picker')).toHaveAttribute('data-tooltip', 'Select icon or emoji');
		});

		it.each([
			[false, 'large'],
			[true, 'small'],
		])('sizes the button for hideLabel=%s', (hideLabel, size) => {
			const { getByTestId } = renderComponent({ props: { hideLabel } });

			expect(getByTestId('picker')).toHaveAttribute('data-size', size);
		});

		it('passes the read-only state', () => {
			const { getByTestId } = renderComponent({ props: { isReadOnly: true } });

			expect(getByTestId('picker')).toHaveAttribute('data-read-only', 'true');
		});

		// The shell hands every `ParameterInputProps` to the input slot. `inheritAttrs: false`
		// is what keeps the ones this input does not read off the DOM.
		it('keeps the props it does not read off the DOM', () => {
			const { getByTestId } = renderComponent({
				attrs: { path: 'parameters.agentIcon', displayTitle: 'Agent Icon' },
			});

			const picker = getByTestId('picker');
			expect(picker).not.toHaveAttribute('path');
			expect(picker).not.toHaveAttribute('displaytitle');
		});
	});
});
