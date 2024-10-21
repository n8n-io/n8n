import { createComponentRenderer } from '@/__tests__/render';
import ResourceListHeader from './ResourceListHeader.vue';

const renderComponent = createComponentRenderer(ResourceListHeader);

describe('WorkflowHeader', () => {
	it('should render icon prop', () => {
		const icon = 'home';
		const { container } = renderComponent({ props: { icon } });
		expect(container.querySelector(`.fa-${icon}`)).toBeVisible();
	});
	test.each([
		['title', 'title slot'],
		['subtitle', 'subtitle slot'],
		['actions', 'actions slot'],
	])('should render "%s" slot', (slot, content) => {
		const { getByText } = renderComponent({ props: { icon: 'home' }, slots: { [slot]: content } });
		expect(getByText(content)).toBeVisible();
	});
});
