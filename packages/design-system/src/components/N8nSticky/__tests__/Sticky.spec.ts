import { render, fireEvent } from '@testing-library/vue';
import N8nSticky from '../Sticky.vue';
import N8nMarkdown from '../../N8nMarkdown/Markdown.vue';

describe('components', () => {
	describe('Sticky', () => {
		it('should render the component', async () => {
			const wrapper = render(N8nSticky, {
				props: {
					editMode: false,
					modelValue:
						'### Checkboxes test\n- [x] One\n- [x] Two\n- Something else\n- [ ] Three\n- [ ] Four',
				},
				global: {
					components: {
						'n8n-markdown': N8nMarkdown,
					},
				},
			});
			const checkboxes = wrapper.container.querySelectorAll('input[type="checkbox"][checked]');
			const allCheckboxes = wrapper.container.querySelectorAll('input[type="checkbox"]');
			expect(checkboxes).toHaveLength(2);
			// Should emit modelValue update when checkbox is clicked
			await fireEvent.change(allCheckboxes[2], { target: { checked: true } });
			expect(wrapper.emitted()['update:modelValue']).toBeDefined();
			// Emitted value should contain the new content (3rd checkbox checked)
			const newContent = (wrapper.emitted()['update:modelValue'][0] as string[])[0];
			expect(newContent).toContain('- [x] Three');
		});
	});
});
