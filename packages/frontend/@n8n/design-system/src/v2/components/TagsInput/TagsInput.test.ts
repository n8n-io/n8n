import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { h } from 'vue';

import { TagsInputItemDelete, TagsInputItemText, TagsInputInput } from './reka-ui';
import TagsInput from './TagsInput.vue';

describe('v2/components/TagsInput', () => {
	describe('rendering', () => {
		it('should render tags from modelValue', () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: ['alpha', 'beta'],
				},
			});

			expect(wrapper.getByText('alpha')).toBeVisible();
			expect(wrapper.getByText('beta')).toBeVisible();
		});

		it('should render with placeholder text when empty', () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: [],
					placeholder: 'Add tags...',
				},
			});

			expect(wrapper.getByPlaceholderText('Add tags...')).toBeInTheDocument();
		});

		it('should hide placeholder when tags are present', () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: ['alpha'],
					placeholder: 'Add tags...',
				},
			});

			expect(wrapper.queryByPlaceholderText('Add tags...')).not.toBeInTheDocument();
		});

		it('should render disabled state', () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: ['locked'],
					disabled: true,
				},
			});

			expect(wrapper.container.querySelector('input')).toBeDisabled();
		});

		it('should render object tags via displayValue', () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: [{ label: 'production' }],
					displayValue: (value) =>
						typeof value === 'object' && value !== null && 'label' in value
							? String(value.label)
							: '',
				},
			});

			expect(wrapper.getByText('production')).toBeVisible();
		});

		it('should fall back to label on object tags without displayValue', () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: [{ label: 'billing' }],
				},
			});

			expect(wrapper.getByText('billing')).toBeVisible();
		});
	});

	describe('sizes', () => {
		test.each([
			[undefined, 'large'],
			['mini' as const, 'mini'],
			['small' as const, 'small'],
			['medium' as const, 'medium'],
			['large' as const, 'large'],
			['xlarge' as const, 'xlarge'],
		])('size %s should apply %s class', (size, expected) => {
			const wrapper = render(TagsInput, {
				props: {
					size,
					modelValue: ['tag'],
				},
			});

			const root = wrapper.container.firstElementChild;
			expect(root?.className).toContain(expected);
		});
	});

	describe('v-model', () => {
		it('should emit update:modelValue when a tag is removed', async () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: ['alpha', 'beta'],
				},
			});

			await userEvent.click(wrapper.getByRole('button', { name: 'alpha' }));

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['beta']]);
			});
		});

		it('should add a tag on Enter', async () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: [],
					placeholder: 'Add tags...',
				},
			});

			const input = wrapper.getByPlaceholderText('Add tags...');
			await userEvent.type(input, 'gamma{Enter}');

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['gamma']]);
			});
		});

		it('should add a tag on delimiter', async () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: [],
					placeholder: 'Add tags...',
					delimiter: ',',
				},
			});

			const input = wrapper.getByPlaceholderText('Add tags...');
			await userEvent.type(input, 'delta,');

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['delta']]);
			});
		});

		it('should not add a tag when disabled', async () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: [],
					placeholder: 'Add tags...',
					disabled: true,
				},
			});

			const input = wrapper.getByPlaceholderText('Add tags...');
			await userEvent.type(input, 'gamma{Enter}');

			expect(wrapper.emitted('update:modelValue')).toBeFalsy();
		});
	});

	describe('defaultValue', () => {
		it('should render tags from defaultValue when uncontrolled', () => {
			const wrapper = render(TagsInput, {
				props: {
					defaultValue: ['alpha', 'beta'],
				},
			});

			expect(wrapper.getByText('alpha')).toBeVisible();
			expect(wrapper.getByText('beta')).toBeVisible();
		});
	});

	describe('constraints', () => {
		it('should not add beyond max and should clear the draft input', async () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: ['alpha'],
					max: 1,
					placeholder: 'Add tags...',
				},
			});

			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			await userEvent.type(input!, 'beta{Enter}');

			await waitFor(() => {
				expect(input).toHaveValue('');
			});
			expect(wrapper.emitted('update:modelValue')).toBeFalsy();
		});

		it('should move an existing tag to the end when a duplicate is added', async () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: ['alpha', 'beta', 'gamma'],
					placeholder: 'Add tags...',
				},
			});

			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			await userEvent.type(input!, 'alpha{Enter}');

			await waitFor(() => {
				expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['beta', 'gamma', 'alpha']]);
			});
			expect(wrapper.emitted('invalid')).toBeFalsy();
			expect(input).toHaveValue('');
		});
	});

	describe('keyboard', () => {
		it('should highlight the last tag when Backspace is pressed on an empty input', async () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: ['alpha', 'beta'],
				},
			});

			const input = wrapper.container.querySelector('input');
			expect(input).toBeTruthy();
			input!.focus();
			await userEvent.keyboard('{Backspace}');

			await waitFor(() => {
				const activeTag = wrapper.container.querySelector('[data-state="active"]');
				expect(activeTag).toBeTruthy();
				expect(activeTag).toHaveTextContent('beta');
			});
		});
	});

	describe('slots', () => {
		it('should render custom tag slot content', () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: ['alpha'],
				},
				slots: {
					tag: ({
						displayValue,
						ui,
					}: {
						displayValue: string;
						ui: { text: string; delete: string };
					}) =>
						h('span', { 'data-test-id': 'custom-tag' }, [
							h(TagsInputItemText, { class: ui.text }, () => displayValue),
							h(TagsInputItemDelete, { class: ui.delete }),
						]),
				},
			});

			expect(wrapper.getByTestId('custom-tag')).toBeInTheDocument();
			expect(wrapper.getByText('alpha')).toBeVisible();
		});

		it('should pass class to the input slot', () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: [],
					placeholder: 'Add tags...',
				},
				slots: {
					input: (slotProps: { class: string; placeholder: string }) =>
						h(TagsInputInput, {
							class: slotProps.class,
							placeholder: slotProps.placeholder,
							'data-test-id': 'custom-input',
						}),
				},
			});

			const input = wrapper.getByTestId('custom-input');
			expect(input.className.length).toBeGreaterThan(0);
			expect(wrapper.getByPlaceholderText('Add tags...')).toBe(input);
		});
	});

	describe('form integration', () => {
		it('should apply id to the input', () => {
			const wrapper = render(TagsInput, {
				props: {
					modelValue: [],
					id: 'workflow-tags',
					placeholder: 'Add tags...',
				},
			});

			expect(wrapper.getByPlaceholderText('Add tags...')).toHaveAttribute('id', 'workflow-tags');
		});
	});
});
