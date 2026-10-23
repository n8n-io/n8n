import { readFileSync } from 'node:fs';
import { render } from '@testing-library/vue';

import Logo from './Logo.vue';
const source = readFileSync('src/components/N8nLogo/Logo.vue', 'utf8');

const { useFavicon } = vi.hoisted(() => ({ useFavicon: vi.fn() }));
vi.mock('@vueuse/core', () => ({ useFavicon }));

describe('Logo', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it.each(['stable', 'beta', 'nightly', 'rc'] as const)(
		'leaves the favicon unchanged for %s',
		(releaseChannel) => {
			const createObjectURL = vi.fn();
			vi.stubGlobal('URL', { createObjectURL });
			render(Logo, { props: { size: 'large', releaseChannel } });
			expect(createObjectURL).not.toHaveBeenCalled();
			expect(useFavicon).not.toHaveBeenCalled();
		},
	);

	it('uses the gray SVG favicon for dev', () => {
		const createObjectURL = vi.fn(() => 'blob:dev-logo');
		const blob = vi.fn();
		vi.stubGlobal('URL', { createObjectURL });
		vi.stubGlobal('Blob', blob);
		render(Logo, { props: { size: 'large', releaseChannel: 'dev' } });
		expect(blob).toHaveBeenCalledWith([expect.stringContaining('path { fill: #898989; }')], {
			type: 'image/svg+xml',
		});
		expect(useFavicon).toHaveBeenCalledWith('blob:dev-logo');
	});

	it('skips the dev favicon without object URL support', () => {
		vi.stubGlobal('URL', {});
		render(Logo, { props: { size: 'large', releaseChannel: 'dev' } });
		expect(useFavicon).not.toHaveBeenCalled();
	});

	it('uses height tokens for logo sizes', () => {
		expect(source).toContain('height: var(--height--3xs)');
		expect(source).toContain('height: var(--height--2xs)');
	});
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
