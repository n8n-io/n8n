import { render } from '@testing-library/vue';

import Logo from './Logo.vue';

describe('Logo', () => {
	it('renders the logo for authView location', () => {
		const wrapper = render(Logo, {
			props: { location: 'authView', releaseChannel: 'stable' },
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders the logo for sidebar location when sidebar is expanded', () => {
		const wrapper = render(Logo, {
			props: { location: 'sidebar', collapsed: false, releaseChannel: 'stable' },
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders the logo for sidebar location when sidebar is collapsed', () => {
		const wrapper = render(Logo, {
			props: { location: 'sidebar', collapsed: true, releaseChannel: 'stable' },
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
