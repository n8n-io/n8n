import { createComponentRenderer } from '@/__tests__/render';
import Logo from '../Logo.vue';

const { useSettingsStore } = vi.hoisted(() => ({
	useSettingsStore: vi.fn(() => ({
		settings: { releaseChannel: 'stable' },
	})),
}));

vi.mock('@/stores/settings.store', () => ({ useSettingsStore }));

vi.stubGlobal('URL', {
	createObjectURL: vi.fn(),
});

describe('Logo', () => {
	const renderComponent = createComponentRenderer(Logo);

	it('renders the logo for authView location', () => {
		const wrapper = renderComponent({
			props: { location: 'authView' },
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders the logo for sidebar location when sidebar is expanded', () => {
		const wrapper = renderComponent({
			props: { location: 'sidebar', collapsed: false },
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders the logo for sidebar location when sidebar is collapsed', () => {
		const wrapper = renderComponent({
			props: { location: 'sidebar', collapsed: true },
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders the releaseChannelTag for non-stable releaseChannel', async () => {
		useSettingsStore.mockReturnValue({
			settings: { releaseChannel: 'dev' },
		});
		const wrapper = renderComponent({
			props: { location: 'authView' },
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
