import userEvent from '@testing-library/user-event';
import { fireEvent, render, waitFor } from '@testing-library/vue';

import SegmentControl from './SegmentControl.vue';

describe('components.N8nSegmentControl', () => {
	const options = [
		{ label: 'One', value: 'one' },
		{ label: 'Two', value: 'two' },
		{ label: 'Three', value: 'three' },
	];

	describe('rendering', () => {
		it('renders a radiogroup with options', () => {
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
			expect(getByRole('radiogroup')).toBeInTheDocument();
			expect(getAllByRole('radio')).toHaveLength(3);
			expect(getByRole('radio', { name: 'One' })).toBeChecked();
		});

		it('renders option labels when no option slot is provided', () => {
			const { getByRole } = render(SegmentControl, {
				props: {
					modelValue: 'one',
					options,
				},
			});

			expect(getByRole('radio', { name: 'One' })).toHaveTextContent('One');
			expect(getByRole('radio', { name: 'Two' })).toHaveTextContent('Two');
			expect(getByRole('radio', { name: 'Three' })).toHaveTextContent('Three');
		});

		it('renders custom option slot content', () => {
			const { getByRole, getByTestId } = render({
				components: { SegmentControl },
				template: `
					<SegmentControl :model-value="'one'" :options="options">
						<template #option="option">
							<span :data-test-id="'slot-' + option.value">{{ option.label }}-slot</span>
						</template>
					</SegmentControl>
				`,
				data: () => ({ options }),
			});

			expect(getByRole('radio', { name: 'One' })).toHaveTextContent('One-slot');
			expect(getByTestId('slot-two')).toHaveTextContent('Two-slot');
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

			const [value, event] = emitted('update:modelValue')![0] as [string, MouseEvent];
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

			const [, event] = emitted('update:modelValue')![0] as [string, MouseEvent];
			expect(event.ctrlKey).toBe(true);
			expect(event.metaKey).toBe(true);
		});

		it('supports boolean option values', async () => {
			const { getByRole, emitted } = render(SegmentControl, {
				props: {
					modelValue: false,
					options: [
						{ label: 'Off', value: false },
						{ label: 'On', value: true },
					],
				},
			});

			expect(getByRole('radio', { name: 'Off' })).toBeChecked();

			await userEvent.click(getByRole('radio', { name: 'On' }));

			await waitFor(() => {
				const [value] = emitted('update:modelValue')![0] as [boolean, MouseEvent];
				expect(value).toBe(true);
			});
		});

		it('emits boolean false when selecting the false option', async () => {
			const { getByRole, emitted } = render(SegmentControl, {
				props: {
					modelValue: true,
					options: [
						{ label: 'Ask', value: false },
						{ label: 'Build', value: true },
					],
				},
			});

			await userEvent.click(getByRole('radio', { name: 'Ask' }));

			await waitFor(() => {
				const [value] = emitted('update:modelValue')![0] as [boolean, MouseEvent];
				expect(value).toBe(false);
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
				const [value] = emitted('update:modelValue')![0] as [string | boolean, MouseEvent];
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
				const [value] = emitted('update:modelValue')![0] as [string, MouseEvent];
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
				template: `
					<div @keydown.stop>
						<SegmentControl :model-value="modelValue" :options="options" @update:model-value="onUpdate" />
					</div>
				`,
				data: () => ({
					modelValue: 'one' as string,
					options,
				}),
				methods: {
					onUpdate(value: string) {
						this.modelValue = value;
					},
				},
			});

			getByRole('radio', { name: 'One' }).focus();
			await user.keyboard('{ArrowRight}');

			await waitFor(() => {
				expect(getByRole('radio', { name: 'Two' })).toBeChecked();
			});
		});

		it('stops arrow key propagation so parent handlers do not run', async () => {
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
			await user.keyboard('{ArrowRight}');

			expect(onParentKeydown).not.toHaveBeenCalled();
		});

		it('loops from the last option to the first with ArrowRight', async () => {
			const user = userEvent.setup();
			const { getByRole } = render({
				components: { SegmentControl },
				template: `
					<SegmentControl :model-value="modelValue" :options="options" @update:model-value="onUpdate" />
				`,
				data: () => ({
					modelValue: 'three' as string,
					options,
				}),
				methods: {
					onUpdate(value: string) {
						this.modelValue = value;
					},
				},
			});

			getByRole('radio', { name: 'Three' }).focus();
			await user.keyboard('{ArrowRight}');

			await waitFor(() => {
				expect(getByRole('radio', { name: 'One' })).toBeChecked();
			});
		});

		it('moves selection with ArrowLeft', async () => {
			const user = userEvent.setup();
			const { getByRole } = render({
				components: { SegmentControl },
				template: `
					<SegmentControl :model-value="modelValue" :options="options" @update:model-value="onUpdate" />
				`,
				data: () => ({
					modelValue: 'two' as string,
					options,
				}),
				methods: {
					onUpdate(value: string) {
						this.modelValue = value;
					},
				},
			});

			getByRole('radio', { name: 'Two' }).focus();
			await user.keyboard('{ArrowLeft}');

			await waitFor(() => {
				expect(getByRole('radio', { name: 'One' })).toBeChecked();
			});
		});
	});
});
