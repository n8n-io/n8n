import userEvent from '@testing-library/user-event';
import { fireEvent, render, waitFor } from '@testing-library/vue';
import { ref } from 'vue';

import SegmentControl from './SegmentControl.vue';

describe('components.N8nSegmentControl', () => {
	const options = [
		{ label: 'One', value: 'one' },
		{ label: 'Two', value: 'two' },
		{ label: 'Three', value: 'three' },
	];

	describe('rendering', () => {
		it('renders a radiogroup with labeled options and selected value', () => {
			const { getByRole, getAllByRole } = render(SegmentControl, {
				props: {
					modelValue: 'one',
					options,
				},
				attrs: {
					'data-test-id': 'segment-control',
				},
			});

			expect(getByRole('radiogroup')).toHaveAttribute('data-test-id', 'segment-control');
			expect(getAllByRole('radio')).toHaveLength(3);
			expect(getByRole('radio', { name: 'One' })).toBeChecked();
			expect(getByRole('radio', { name: 'One' })).toHaveTextContent('One');
			expect(getByRole('radio', { name: 'Two' })).toHaveTextContent('Two');
		});

		it('renders no selection when modelValue is not in options', () => {
			const { getAllByRole } = render(SegmentControl, {
				props: {
					modelValue: 'missing',
					options,
				},
			});

			for (const radio of getAllByRole('radio')) {
				expect(radio).not.toBeChecked();
			}
		});

		it('renders custom option slot content and exposes option data', () => {
			const { getByRole, getByTestId } = render({
				components: { SegmentControl },
				template: `
					<SegmentControl :model-value="'one'" :options="options">
						<template #option="option">
							<span :data-test-id="'slot-' + option.value">
								{{ option.label }}-{{ option.data?.count }}
							</span>
						</template>
					</SegmentControl>
				`,
				data: () => ({
					options: [
						{ label: 'One', value: 'one', data: { count: 1 } },
						{ label: 'Two', value: 'two', data: { count: 2 } },
					],
				}),
			});

			expect(getByRole('radio', { name: 'One' })).toHaveTextContent('One-1');
			expect(getByTestId('slot-two')).toHaveTextContent('Two-2');
		});

		it('sets data-test-id on each option from its value', () => {
			const { getByTestId } = render(SegmentControl, {
				props: {
					modelValue: false,
					options: [
						{ label: 'Ask', value: false },
						{ label: 'Build', value: true },
						{ label: 'Other', value: 'other' },
					],
				},
			});

			expect(getByTestId('radio-button-false')).toBeInTheDocument();
			expect(getByTestId('radio-button-true')).toBeInTheDocument();
			expect(getByTestId('radio-button-other')).toBeInTheDocument();
		});

		it('applies class to the outer wrapper and forwards other attrs to the radiogroup', () => {
			const { container, getByRole } = render(SegmentControl, {
				props: {
					modelValue: 'one',
					options,
				},
				attrs: {
					class: 'custom-class',
					'data-test-id': 'segment-control',
					'aria-label': 'View mode',
				},
			});

			const wrapper = container.querySelector('.n8n-segment-control');
			expect(wrapper).toHaveClass('custom-class');
			expect(wrapper).not.toHaveAttribute('data-test-id');
			expect(getByRole('radiogroup')).toHaveAttribute('data-test-id', 'segment-control');
			expect(getByRole('radiogroup')).toHaveAttribute('aria-label', 'View mode');
		});
	});

	describe('selection', () => {
		it('emits update:modelValue with the selected value and mouse event on click', async () => {
			const { getByRole, emitted } = render(SegmentControl, {
				props: {
					modelValue: 'one',
					options,
				},
			});

			await userEvent.click(getByRole('radio', { name: 'Two' }));

			await waitFor(() => {
				expect(emitted('update:modelValue')).toBeTruthy();
			});

			const [value, event] = emitted('update:modelValue')[0] as [string, MouseEvent];
			expect(value).toBe('two');
			expect(event).toMatchObject({ type: 'click' });
		});

		it('preserves pointer modifiers on the emitted mouse event', async () => {
			const { getByRole, emitted } = render(SegmentControl, {
				props: {
					modelValue: 'one',
					options,
				},
			});

			await fireEvent.click(getByRole('radio', { name: 'Two' }), {
				ctrlKey: true,
				metaKey: true,
			});

			await waitFor(() => {
				expect(emitted('update:modelValue')).toBeTruthy();
			});

			const [, event] = emitted('update:modelValue')[0] as [string, MouseEvent];
			expect(event.ctrlKey).toBe(true);
			expect(event.metaKey).toBe(true);
		});

		it('supports boolean option values in both directions', async () => {
			const { getByRole, emitted, rerender } = render(SegmentControl, {
				props: {
					modelValue: false,
					options: [
						{ label: 'Ask', value: false },
						{ label: 'Build', value: true },
					],
				},
			});

			expect(getByRole('radio', { name: 'Ask' })).toBeChecked();

			await userEvent.click(getByRole('radio', { name: 'Build' }));

			await waitFor(() => {
				const [value] = emitted('update:modelValue')[0] as [boolean, MouseEvent];
				expect(value).toBe(true);
			});

			await rerender({
				modelValue: true,
				options: [
					{ label: 'Ask', value: false },
					{ label: 'Build', value: true },
				],
			});

			await userEvent.click(getByRole('radio', { name: 'Ask' }));

			await waitFor(() => {
				expect(emitted('update:modelValue').at(-1)).toEqual(expect.arrayContaining([false]));
			});
		});

		it('distinguishes boolean false from string "false"', async () => {
			const { getByRole, emitted } = render(SegmentControl, {
				props: {
					modelValue: false,
					options: [
						{ label: 'Boolean false', value: false },
						{ label: 'String false', value: 'false' },
					],
				},
			});

			expect(getByRole('radio', { name: 'Boolean false' })).toBeChecked();
			expect(getByRole('radio', { name: 'String false' })).not.toBeChecked();

			await userEvent.click(getByRole('radio', { name: 'String false' }));

			await waitFor(() => {
				const [value] = emitted('update:modelValue')[0] as [string | boolean, MouseEvent];
				expect(value).toBe('false');
			});
		});

		it('supports uncontrolled usage via defaultValue', async () => {
			const { getByRole, emitted } = render(SegmentControl, {
				props: {
					defaultValue: 'two',
					options,
				},
			});

			expect(getByRole('radio', { name: 'Two' })).toBeChecked();

			await userEvent.click(getByRole('radio', { name: 'Three' }));

			await waitFor(() => {
				const [value] = emitted('update:modelValue')[0] as [string, MouseEvent];
				expect(value).toBe('three');
			});
		});

		it('keeps the uncontrolled selection when options are reordered', async () => {
			const { getByRole, rerender } = render(SegmentControl, {
				props: {
					defaultValue: 'two',
					options,
				},
			});

			expect(getByRole('radio', { name: 'Two' })).toBeChecked();

			await rerender({
				defaultValue: 'two',
				options: [
					{ label: 'Two', value: 'two' },
					{ label: 'One', value: 'one' },
					{ label: 'Three', value: 'three' },
				],
			});

			expect(getByRole('radio', { name: 'Two' })).toBeChecked();
			expect(getByRole('radio', { name: 'One' })).not.toBeChecked();
		});
	});

	describe('disabled', () => {
		it('does not emit when disabled', async () => {
			const { getByRole, emitted } = render(SegmentControl, {
				props: {
					modelValue: 'one',
					options,
					disabled: true,
				},
			});

			await userEvent.click(getByRole('radio', { name: 'Two' }));

			expect(emitted('update:modelValue')).toBeUndefined();
		});

		it('does not emit when the option is disabled', async () => {
			const { getByRole, emitted } = render(SegmentControl, {
				props: {
					modelValue: 'one',
					options: [
						{ label: 'One', value: 'one' },
						{ label: 'Two', value: 'two', disabled: true },
					],
				},
			});

			await userEvent.click(getByRole('radio', { name: 'Two' }));

			expect(emitted('update:modelValue')).toBeUndefined();
		});

		it('does not change selection with arrow keys when disabled', async () => {
			const user = userEvent.setup();
			const { getByRole, emitted } = render(SegmentControl, {
				props: {
					modelValue: 'one',
					options,
					disabled: true,
				},
			});

			getByRole('radio', { name: 'One' }).focus();
			await user.keyboard('{ArrowRight}');

			expect(getByRole('radio', { name: 'One' })).toBeChecked();
			expect(emitted('update:modelValue')).toBeUndefined();
		});
	});

	describe('keyboard', () => {
		it('moves selection with arrow keys inside a keydown.stop container', async () => {
			const user = userEvent.setup();
			const { getByRole } = render({
				components: { SegmentControl },
				setup() {
					const modelValue = ref('one');
					return {
						modelValue,
						options,
						onUpdate(value: string) {
							modelValue.value = value;
						},
					};
				},
				template: `
					<div @keydown.stop>
						<SegmentControl :model-value="modelValue" :options="options" @update:model-value="onUpdate" />
					</div>
				`,
			});

			getByRole('radio', { name: 'One' }).focus();
			await user.keyboard('{ArrowRight}');

			await waitFor(() => {
				expect(getByRole('radio', { name: 'Two' })).toBeChecked();
			});
		});

		it.each(['{ArrowUp}', '{ArrowDown}', '{ArrowLeft}', '{ArrowRight}'] as const)(
			'stops %s propagation so parent handlers do not run',
			async (key) => {
				const user = userEvent.setup();
				const onParentKeydown = vi.fn();
				const { getByRole } = render({
					components: { SegmentControl },
					props: { onParentKeydown },
					template: `
						<div @keydown="onParentKeydown">
							<SegmentControl model-value="one" :options="options" />
						</div>
					`,
					data: () => ({ options }),
				});

				getByRole('radio', { name: 'One' }).focus();
				await user.keyboard(key);

				expect(onParentKeydown).not.toHaveBeenCalled();
			},
		);

		it('does not change selection with ArrowUp or ArrowDown', async () => {
			const user = userEvent.setup();
			const { getByRole, emitted } = render(SegmentControl, {
				props: {
					modelValue: 'one',
					options,
				},
			});

			getByRole('radio', { name: 'One' }).focus();
			await user.keyboard('{ArrowDown}');
			await user.keyboard('{ArrowUp}');

			expect(getByRole('radio', { name: 'One' })).toBeChecked();
			expect(emitted('update:modelValue')).toBeUndefined();
		});

		it('loops from the last option to the first with ArrowRight when loop is enabled', async () => {
			const user = userEvent.setup();
			const { getByRole } = render({
				components: { SegmentControl },
				setup() {
					const modelValue = ref('three');
					return {
						modelValue,
						options,
						onUpdate(value: string) {
							modelValue.value = value;
						},
					};
				},
				template: `
					<SegmentControl :model-value="modelValue" :options="options" @update:model-value="onUpdate" />
				`,
			});

			getByRole('radio', { name: 'Three' }).focus();
			await user.keyboard('{ArrowRight}');

			await waitFor(() => {
				expect(getByRole('radio', { name: 'One' })).toBeChecked();
			});
		});

		it('does not loop from the last option when loop is false', async () => {
			const user = userEvent.setup();
			const { getByRole, emitted } = render({
				components: { SegmentControl },
				setup() {
					const modelValue = ref('three');
					return {
						modelValue,
						options,
						onUpdate(value: string) {
							modelValue.value = value;
						},
					};
				},
				template: `
					<SegmentControl
						:model-value="modelValue"
						:options="options"
						:loop="false"
						@update:model-value="onUpdate"
					/>
				`,
			});

			getByRole('radio', { name: 'Three' }).focus();
			await user.keyboard('{ArrowRight}');

			expect(getByRole('radio', { name: 'Three' })).toBeChecked();
			expect(emitted('update:modelValue')).toBeUndefined();
		});

		it('moves selection with ArrowLeft', async () => {
			const user = userEvent.setup();
			const { getByRole } = render({
				components: { SegmentControl },
				setup() {
					const modelValue = ref('two');
					return {
						modelValue,
						options,
						onUpdate(value: string) {
							modelValue.value = value;
						},
					};
				},
				template: `
					<SegmentControl :model-value="modelValue" :options="options" @update:model-value="onUpdate" />
				`,
			});

			getByRole('radio', { name: 'Two' }).focus();
			await user.keyboard('{ArrowLeft}');

			await waitFor(() => {
				expect(getByRole('radio', { name: 'One' })).toBeChecked();
			});
		});
	});
});
