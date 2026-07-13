import userEvent from '@testing-library/user-event';
import { render, waitFor } from '@testing-library/vue';
import { mount } from '@vue/test-utils';

import TagsInput from './TagsInput.vue';

describe('v2/components/TagsInput', () => {
	it('should render tags from modelValue', () => {
		const wrapper = render(TagsInput, {
			props: {
				modelValue: ['alpha', 'beta'],
			},
		});

		expect(wrapper.getByText('alpha')).toBeVisible();
		expect(wrapper.getByText('beta')).toBeVisible();
	});

	it('should default size prop to large', () => {
		const wrapper = mount(TagsInput, {
			props: { modelValue: ['tag'] },
		});

		expect(wrapper.props('size')).toBe('large');
	});

	it('should accept a size prop', () => {
		const wrapper = mount(TagsInput, {
			props: { size: 'mini', modelValue: ['tag'] },
		});

		expect(wrapper.props('size')).toBe('mini');
	});

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
