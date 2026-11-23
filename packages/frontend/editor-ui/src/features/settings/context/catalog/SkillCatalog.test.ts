import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { within, waitFor } from '@testing-library/vue';
import { reactive } from 'vue';
import { mock } from 'vitest-mock-extended';
import { createTestingPinia } from '@pinia/testing';
import type { SkillSourceListItem } from '@n8n/api-types';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

const track = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));

const query = reactive<Record<string, string | undefined>>({});
vi.mock('vue-router', () => ({
	useRoute: () => ({ query }),
	useRouter: () => ({
		push: ({ query: next }: { query: typeof query }) => Object.assign(query, next),
	}),
}));
vi.mock('./SkillCatalogDetail.vue', () => ({
	__esModule: true,
	default: {
		props: ['entry'],
		template: '<div data-test-id="skill-catalog-detail">{{ entry.id }}</div>',
	},
}));
beforeEach(() => {
	track.mockReset();
	createTestingPinia();
	for (const key of Object.keys(query)) delete query[key];
});

import SkillCatalog from './SkillCatalog.vue';
import { SKILL_CATALOG } from './skillCatalog';

const renderCatalog = createComponentRenderer(SkillCatalog);

describe('SkillCatalog', () => {
	it('combines the purpose filter and search and explains empty results', async () => {
		const view = renderCatalog();
		await userEvent.click(view.getByTestId('skill-catalog-category'));
		await userEvent.click(await view.findByRole('option', { name: 'Write and plan content' }));
		expect(view.queryByTestId('skill-catalog-n8n-error-handling-official')).not.toBeInTheDocument();
		expect(
			view.getByTestId('skill-catalog-coreyhaines31/marketingskills/copywriting'),
		).toBeVisible();
		await userEvent.type(view.getByTestId('skill-catalog-search'), 'copywriting');
		expect(view.getAllByTestId('skill-catalog-details')).toHaveLength(1);
		await userEvent.type(view.getByTestId('skill-catalog-search'), ' no match');
		expect(view.getByTestId('skill-catalog-empty')).toHaveTextContent(/search|category/i);
		await view.rerender({ sources: [] });
		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_VIEWED_SKILL_CATALOG,
			expect.any(Object),
		);
	});

	it('opens a shareable detail page and keeps the search when returning', async () => {
		const view = renderCatalog();
		const entry = SKILL_CATALOG[0];
		await userEvent.type(view.getByTestId('skill-catalog-search'), 'workflow');
		await userEvent.click(
			within(view.getByTestId(`skill-catalog-${entry.id}`)).getByRole('button'),
		);
		await view.findByTestId('skill-catalog-detail');
		expect(query.catalogSkill).toBe(entry.id);
		expect(view.getByTestId('skill-catalog')).toHaveFocus();
		await userEvent.click(view.getByRole('button', { name: 'Back to Discover' }));
		await waitFor(() => expect(view.queryByTestId('skill-catalog-detail')).not.toBeInTheDocument());
		expect(view.getByTestId('skill-catalog-search')).toHaveValue('workflow');
		expect(view.queryByRole('dialog')).not.toBeInTheDocument();
		expect(track.mock.calls.map(([event]) => event)).toEqual([
			TELEMETRY_EVENT.CONTEXT.USER_VIEWED_SKILL_CATALOG,
			TELEMETRY_EVENT.CONTEXT.USER_VIEWED_CATALOG_SKILL,
			TELEMETRY_EVENT.CONTEXT.USER_VIEWED_SKILL_CATALOG,
		]);
		expect(track.mock.calls[1][1]).toMatchObject({
			flow_id: track.mock.calls[0][1].flow_id,
			catalog_skill_id: entry.id,
			opened_from: 'search',
		});
	});
	it('attributes a direct detail link without reporting a list view', () => {
		query.catalogSkill = SKILL_CATALOG[0].id;
		query.skillsFrom = 'agent_picker_discover';
		renderCatalog();
		expect(track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.CONTEXT.USER_VIEWED_CATALOG_SKILL,
			expect.objectContaining({
				navigation_source: 'agent_picker_discover',
				opened_from: 'direct',
				catalog_skill_id: SKILL_CATALOG[0].id,
			}),
		);
	});
	it.each(['n8n-io/skills', 'N8N-IO/Skills'])(
		'matches an installed folder from %s and shows its scope',
		(repository) => {
			const entry = SKILL_CATALOG[0];
			const view = renderCatalog({
				props: {
					sources: [
						mock<SkillSourceListItem>({
							projectId: null,
							skills: [
								{ id: 'renamed-skill', webUrl: entry.url.replace('n8n-io/skills', repository) },
							],
						}),
					],
				},
			});
			expect(
				within(view.getByTestId(`skill-catalog-${entry.id}`)).getByText('Added to Global'),
			).toBeVisible();
			expect(view.getAllByTestId('skill-catalog-installed')).toHaveLength(1);
		},
	);
});
