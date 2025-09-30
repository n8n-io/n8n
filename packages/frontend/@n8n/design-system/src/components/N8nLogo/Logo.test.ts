import { render } from '@testing-library/vue';

import Logo from './Logo.vue';

describe('Logo', () => {
	it('renders the logo for authView location', () => {
		const wrapper = render(Logo, {
			props: { size: 'large', releaseChannel: 'stable' },
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders the logo for sidebar location when sidebar is expanded', () => {
		const wrapper = render(Logo, {
			props: { size: 'small', collapsed: false, releaseChannel: 'stable' },
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders the logo for sidebar location when sidebar is collapsed', () => {
		const wrapper = render(Logo, {
			props: { size: 'small', collapsed: true, releaseChannel: 'stable' },
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
