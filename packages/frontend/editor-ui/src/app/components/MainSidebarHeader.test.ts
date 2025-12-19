import { reactive } from 'vue';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { defaultSettings } from '@/__tests__/defaults';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import MainSidebarHeader from './MainSidebarHeader.vue';
import { COMMAND_BAR_EXPERIMENT } from '../constants';

vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: vi.fn(() => ({ meta: {} })),
	}),
	useRoute: () => reactive({}),
	RouterLink: {
		template: '<a><slot /></a>',
	},
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		isVariantEnabled: vi.fn().mockImplementation((name) => name === COMMAND_BAR_EXPERIMENT.name),
	}),
}));

let settingsStore: MockedStore<typeof useSettingsStore>;
let sourceControlStore: MockedStore<typeof useSourceControlStore>;
let pinia: ReturnType<typeof createTestingPinia>;

describe('MainSidebarHeader', () => {
	beforeEach(() => {
		pinia = createTestingPinia();
		settingsStore = mockedStore(useSettingsStore);
		sourceControlStore = mockedStore(useSourceControlStore);
		settingsStore.settings = defaultSettings;
	});

	it('renders header without error', () => {
		expect(() =>
			createComponentRenderer(MainSidebarHeader, {
				pinia,
				props: { isCollapsed: false },
			})(),
		).not.toThrow();
	});

	it('renders collapsed header without error', () => {
		expect(() =>
			createComponentRenderer(MainSidebarHeader, {
				pinia,
				props: { isCollapsed: true },
			})(),
		).not.toThrow();
	});

	test.each([
		[false, true, true],
		[true, false, false],
		[true, true, false],
		[false, false, false],
	])(
		'should render readonly tooltip when is collapsed %s and the environment is readonly %s',
		(isCollapsed, branchReadOnly, shouldRender) => {
			sourceControlStore.preferences.branchReadOnly = branchReadOnly;

			const { queryByTestId } = createComponentRenderer(MainSidebarHeader, {
				pinia,
				props: { isCollapsed },
			})();

			expect(queryByTestId('read-only-env-icon') !== null).toBe(shouldRender);
		},
	);

	it('should render beta icon when not collapsed and isBeta is true', () => {
		const { queryByTestId } = createComponentRenderer(MainSidebarHeader, {
			pinia,
			props: { isCollapsed: false, isBeta: true },
		})();

		expect(queryByTestId('beta-icon') !== null).toBe(true);
	});

	it('renders the logo link only when not collapsed', async () => {
		const { container, rerender } = createComponentRenderer(MainSidebarHeader, {
			pinia,
			props: { isCollapsed: false, hideCreate: true },
		})();

		expect(container.querySelector('a')).toBeInTheDocument();

		await rerender({ isCollapsed: true, hideCreate: true });

		expect(container.querySelector('a')).not.toBeInTheDocument();
	});

	it('displays create button', () => {
		const { queryByTestId } = createComponentRenderer(MainSidebarHeader, {
			pinia,
			props: { isCollapsed: false },
		})();

		expect(queryByTestId('universal-add')).toBeInTheDocument();
	});

	it('hides create button when hideCreate is true', () => {
		const { queryByTestId } = createComponentRenderer(MainSidebarHeader, {
			pinia,
			props: { isCollapsed: false, hideCreate: true },
		})();

		expect(queryByTestId('universal-add')).not.toBeInTheDocument();
	});

	it('emits "collapse" when toggle sidebar is clicked', async () => {
		const { getByRole, emitted } = createComponentRenderer(MainSidebarHeader, {
			pinia,
			props: { isCollapsed: false, hideCreate: true },
		})();

		await fireEvent.click(getByRole('button', { name: 'Toggle sidebar' }));

		expect(emitted('collapse')).toHaveLength(1);
	});

	it('emits "openCommandBar" with the click event when command bar button is clicked', async () => {
		const { getByRole, emitted } = createComponentRenderer(MainSidebarHeader, {
			pinia,
			props: { isCollapsed: false, hideCreate: true },
		})();

		await fireEvent.click(getByRole('button', { name: 'Open command palette' }));

		const emits = emitted('openCommandBar');
		expect(emits).toHaveLength(1);

		const [[event]] = emits as Array<[Event]>;
		expect(event).toBeInstanceOf(MouseEvent);
		expect((event as MouseEvent).type).toBe('click');
	});
});
