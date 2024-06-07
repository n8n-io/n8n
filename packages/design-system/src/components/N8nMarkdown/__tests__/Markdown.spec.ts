import { render, fireEvent } from '@testing-library/vue';
import N8nMarkdown from '../Markdown.vue';

describe('components', () => {
	describe('N8nMarkdown', () => {
		it('should render unchecked checkboxes', () => {
			const wrapper = render(N8nMarkdown, {
				props: {
					content: '__TODO__\n- [ ] Buy milk\n- [ ] Buy socks\n',
				},
			});
			const checkboxes = wrapper.getAllByRole('checkbox');
			expect(checkboxes).toHaveLength(2);
			checkboxes.forEach((checkbox) => {
				expect(checkbox).not.toBeChecked();
			});
		});

		it('should render checked checkboxes', () => {
			const wrapper = render(N8nMarkdown, {
				props: {
					content: '__TODO__\n- [X] Buy milk\n- [X] Buy socks\n',
				},
			});
			const checkboxes = wrapper.getAllByRole('checkbox');
			expect(checkboxes).toHaveLength(2);
			checkboxes.forEach((checkbox) => {
				expect(checkbox).toBeChecked();
			});
		});

		it('should toggle checkboxes when clicked', async () => {
			const wrapper = render(N8nMarkdown, {
				props: {
					content: '__TODO__\n- [ ] Buy milk\n- [ ] Buy socks\n',
				},
			});
			const checkboxes = wrapper.getAllByRole('checkbox');
			expect(checkboxes).toHaveLength(2);
			expect(checkboxes[0]).not.toBeChecked();
			expect(checkboxes[1]).not.toBeChecked();

			await fireEvent.click(checkboxes[0]);
			expect(checkboxes[0]).toBeChecked();
			expect(checkboxes[1]).not.toBeChecked();

			const updatedContent = wrapper.emitted()['update-content'][0];
			expect(updatedContent).toEqual(['__TODO__\n- [x] Buy milk\n- [ ] Buy socks\n']);
		});

		it('should render inputs as plain text', () => {
			const wrapper = render(N8nMarkdown, {
				props: {
					content:
						'__TODO__\n- [X] Buy milk\n- <input type="text" data-testid="text-input" value="Something"/>\n',
				},
			});
			const checkboxes = wrapper.getAllByRole('checkbox');
			expect(checkboxes).toHaveLength(1);
			expect(wrapper.queryByTestId('text-input')).toBeNull();
			expect(wrapper.html()).toContain(
				'&lt;input type=“text” data-testid=“text-input” value=“Something”/&gt;',
			);
		});
	});
});
