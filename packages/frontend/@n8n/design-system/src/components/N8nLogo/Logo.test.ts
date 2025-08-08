import { render } from '@testing-library/vue';
import N8nLogo from './Logo.vue';

// Mock URL.createObjectURL since it's used in the component
vi.stubGlobal('URL', {
	createObjectURL: vi.fn(),
});

describe('components', () => {
	describe('N8nLogo', () => {
		it('should render the logo for authView location', () => {
			const wrapper = render(N8nLogo, {
				props: { location: 'authView', releaseChannel: 'stable' },
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render the logo for sidebar location when sidebar is expanded', () => {
			const wrapper = render(N8nLogo, {
				props: { location: 'sidebar', collapsed: false, releaseChannel: 'stable' },
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render the logo for sidebar location when sidebar is collapsed', () => {
			const wrapper = render(N8nLogo, {
				props: { location: 'sidebar', collapsed: true, releaseChannel: 'stable' },
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render correctly with dev release channel', () => {
			const wrapper = render(N8nLogo, {
				props: { location: 'authView', releaseChannel: 'dev' },
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render correctly with beta release channel', () => {
			const wrapper = render(N8nLogo, {
				props: { location: 'authView', releaseChannel: 'beta' },
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
	});
});
