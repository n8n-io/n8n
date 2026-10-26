import { mount } from '@vue/test-utils';

import RememberedHosts from './RememberedHosts.vue';

function render(hosts: string[]) {
	return mount(RememberedHosts, { props: { hosts } });
}

describe('RememberedHosts', () => {
	it('renders nothing when no host has been allowed', () => {
		expect(render([]).text()).toBe('');
	});

	it('names every allowed host, so none is silently trusted', () => {
		const wrapper = render(['acme.app.n8n.cloud', 'localhost:5678']);

		const names = wrapper.findAll('.host-name').map((el) => el.text());
		expect(names).toEqual(['acme.app.n8n.cloud', 'localhost:5678']);
	});

	it('revokes only the host whose control was used', async () => {
		const wrapper = render(['acme.app.n8n.cloud', 'localhost:5678']);

		await wrapper.findAll('.host-remove')[1].trigger('click');

		expect(wrapper.emitted('forget')).toEqual([['localhost:5678']]);
	});

	it('labels the control for pointer and screen reader alike', () => {
		const button = render(['localhost:5678']).find('.host-remove');

		expect(button.attributes('title')).toBe('Ask before connecting to localhost:5678');
		expect(button.attributes('aria-label')).toBe('Ask before connecting to localhost:5678');
	});
});
