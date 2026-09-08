import type { FrontendModuleSettings } from '@n8n/api-types';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { InsightsModule } from '@n8n/frontend-module-insights/insights.module';
import { useInsightsStore } from '@n8n/frontend-module-insights';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { reactive } from 'vue';
import type { Component } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { defaultSettings, mockedStore } from '@n8n/frontend-test-utils';
import { getDropdownItems } from '@/__tests__/utils';

import { createProjectListItem } from '../__tests__/utils';
import { useProjectsStore } from '../projects.store';
import { registerComponentSlots } from '@/app/componentSlots.manifest';

/**
 * The `project-filter` slot, end to end, with no stub on either side.
 *
 * This is the only place the contract can be checked. `<component :is>` erases prop
 * types, so neither package's typecheck sees the other's half: the module passes
 * `placeholder` and `size` into a host it cannot import, and the host is written
 * against a module it must not import. Rename a prop on either side and only a test
 * that renders both together notices.
 *
 * Both halves are reached through their public entries — the dashboard through the
 * descriptor's own route record, so this test widens no package API.
 */
const teamProjects = Array.from({ length: 2 }, () => createProjectListItem('team'));

const mockRoute = reactive<{ params: { insightType: string } }>({
	params: { insightType: 'total' },
});

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: () => mockRoute,
}));

const moduleSettings: FrontendModuleSettings = {
	insights: {
		summary: false,
		dashboard: false,
		earliestDataDate: null,
		dateRanges: [{ key: 'week', licensed: true, granularity: 'day' }],
	},
};

/** The dashboard as the shell reaches it: the descriptor's lazy route component. */
const loadDashboard = async (): Promise<Component> => {
	const child = InsightsModule.routes?.[0]?.children?.[0];
	const loader = child?.components?.default ?? child?.component;
	if (typeof loader !== 'function') throw new Error('insights dashboard route component missing');
	const loaded = (await (loader as () => Promise<{ default: Component }>)()) as {
		default?: Component;
	};
	return loaded.default ?? (loaded as Component);
};

describe('project-filter slot, composed', () => {
	let insightsStore: ReturnType<typeof mockedStore<typeof useInsightsStore>>;
	let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;

	beforeEach(() => {
		vi.setSystemTime(new Date('2000-12-19T00:00:00.000Z'));
		mockRoute.params.insightType = 'total';

		createTestingPinia({
			initialState: { settings: { settings: defaultSettings, moduleSettings } },
		});

		insightsStore = mockedStore(useInsightsStore);
		// Both panels off, and `insightType` is not `timeSaved`, so the charts and the
		// table do not render. This test is about the slot, not the dashboard's content;
		// `charts.execute` still runs on every selection, which is the round trip below.
		insightsStore.isSummaryEnabled = false;
		insightsStore.isDashboardEnabled = false;
		insightsStore.earliestDataDate = null;
		insightsStore.dateRanges = [{ key: 'week', licensed: true, granularity: 'day' }];
		for (const key of ['summary', 'charts', 'table'] as const) {
			insightsStore[key] = {
				state: null,
				isLoading: false,
				execute: vi.fn(),
				executeImmediate: vi.fn(),
				isReady: true,
				error: null,
				then: vi.fn(),
			} as never;
		}

		projectsStore = mockedStore(useProjectsStore);
		projectsStore.myProjects = teamProjects;
		projectsStore.availableProjects = teamProjects;
		projectsStore.getAvailableProjects.mockResolvedValue();
		projectsStore.searchProjects.mockResolvedValue({
			count: teamProjects.length,
			data: teamProjects,
		});
		projectsStore.globalProjectPermissions = { list: true };

		componentRegistry.clear();
		registerComponentSlots();
	});

	afterEach(() => {
		componentRegistry.clear();
		vi.useRealTimers();
	});

	it("lands the module's placeholder and size props on the real host", async () => {
		const renderDashboard = createComponentRenderer(await loadDashboard());
		renderDashboard({ props: { insightType: 'total' } });

		const select = await screen.findByTestId('project-sharing-select');

		// `insights.dashboard.search.placeholder`, carried across the slot as a prop.
		// The host sets `inheritAttrs: false`, so a misspelled prop cannot reach the
		// input as a bare attribute and imitate a working contract — it falls back to
		// ProjectSharing's own default, 'Select project or user'.
		const input = select.querySelector('input') as HTMLInputElement;
		expect(input.placeholder).toBe('All projects');
		// `size="mini"` crosses the slot; N8nSelect maps it onto element-plus `small`.
		expect(select.querySelector('.el-select--small')).toBeInTheDocument();
		// The module styles the picker for its own layout (`.projectSelect` sets its
		// width), so `class` is forwarded explicitly past `inheritAttrs: false`.
		const styled = document.querySelector('[class*="projectSelect"]');
		expect(styled).toBeInTheDocument();
		expect(styled).toContainElement(select);
	});

	it('carries a selection from the real host back into the module', async () => {
		const renderDashboard = createComponentRenderer(await loadDashboard());
		renderDashboard({ props: { insightType: 'total' } });

		const select = await screen.findByTestId('project-sharing-select');
		await userEvent.click(select);

		const items = await getDropdownItems(select);
		const option = [...items].find(
			(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
		);
		expect(option).toBeDefined();
		await userEvent.click(option as Element);

		await waitFor(() => {
			expect(insightsStore.charts.execute).toHaveBeenCalledWith(
				0,
				expect.objectContaining({ projectId: teamProjects[0].id }),
			);
		});
	});
}, 30000);
