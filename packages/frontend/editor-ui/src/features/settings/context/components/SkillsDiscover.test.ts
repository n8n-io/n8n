import { createTestingPinia } from '@pinia/testing';
import type { SkillCatalogItem, SkillDetail } from '@n8n/api-types';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { mock } from 'vitest-mock-extended';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createAgent } from '@/features/agents/composables/useAgentApi';
import type { AgentCreationResource } from '@/features/agents/types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';

import SkillsDiscover from './SkillsDiscover.vue';
import {
	browseSkillCatalog,
	getSkillCatalogMetadata,
	getSkillCatalogDetail,
	getSkill,
	searchSkillCatalog,
} from '../skills.api';

const state = vi.hoisted(() => ({ push: vi.fn(), showError: vi.fn(), imported: true }));
vi.mock('vue-router', async (original) => ({
	...(await original<typeof import('vue-router')>()),
	useRouter: () => ({ push: state.push }),
	useRoute: () => ({ query: {} }),
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: state.showError, showMessage: vi.fn() }),
}));
vi.mock('../skills.api', () => ({
	browseSkillCatalog: vi.fn(),
	getSkillCatalogMetadata: vi.fn(),
	getSkillCatalogDetail: vi.fn(),
	searchSkillCatalog: vi.fn(),
	getSkill: vi.fn(),
}));
vi.mock('@/features/agents/composables/useAgentApi', () => ({ createAgent: vi.fn() }));
vi.mock('./SkillSourceConnectDialog.vue', () => ({
	default: {
		props: ['open', 'scopeOptions', 'catalogSkill', 'intent'],
		emits: ['connected', 'update:open', 'openSource'],
		setup: () => ({ state }),
		template: `<div v-if="open" data-test-id="import-dialog"><span>{{ catalogSkill.githubUrl }}</span><span data-test-id="import-intent">{{ intent }}</span><button data-test-id="finish-import" @click="$emit('connected', {response:{sourceId:'source-1', imported:state.imported ? [{key:'skills/pdf',skillId:'local-skill',name:'pdf'}] : [],failed:[]},sourceLabel:'acme/skills',scopeLabel:'Personal project'}); $emit('update:open', false)">Import</button></div>`,
	},
}));

const item: SkillCatalogItem = {
	id: 'acme/skills/pdf',
	name: 'pdf',
	slug: 'pdf',
	source: 'acme/skills',
	installs: 42,
	githubUrl: 'https://github.com/acme/skills',
	catalogUrl: 'https://skills.sh/acme/skills/pdf',
};
const render = createComponentRenderer(SkillsDiscover, {
	props: {
		scopeOptions: [{ value: 'project:personal-1', label: 'Personal project', icon: 'user' }],
	},
});

describe('SkillsDiscover', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		mockedStore(useProjectsStore).myProjects = [
			mock<ProjectListItem>({ id: 'personal-1', scopes: ['agent:create'] }),
		];
		state.imported = true;
		state.push.mockResolvedValue(undefined);
		vi.mocked(browseSkillCatalog).mockResolvedValue({
			items: [],
			fetchedAt: '2026-11-13T10:00:00Z',
		});
		vi.mocked(getSkillCatalogMetadata).mockResolvedValue({
			id: item.id,
			name: item.name,
			description: 'Read and edit PDF documents',
			category: 'documents',
		});
		vi.mocked(getSkillCatalogDetail).mockResolvedValue({
			id: item.id,
			name: item.name,
			description: 'Read and edit PDF documents',
			category: 'documents',
			instructions: 'Extract text from a PDF.',
			files: [{ path: 'SKILL.md', content: 'Read a PDF', supported: true }],
			fetchedAt: '2026-11-13T10:00:00Z',
		});
		vi.mocked(searchSkillCatalog).mockResolvedValue({
			items: [item],
			fetchedAt: '2026-11-12T10:00:00Z',
		});
		vi.mocked(getSkill).mockResolvedValue(
			mock<SkillDetail>({
				id: 'local-skill',
				projectId: 'personal-1',
				skill: { name: 'pdf', description: 'PDF', instructions: 'Read PDFs' },
			}),
		);
		vi.mocked(createAgent).mockResolvedValue(mock<AgentCreationResource>({ id: 'test-agent' }));
	});

	async function search() {
		const view = render();
		await userEvent.type(view.getByTestId('skill-catalog-search'), 'pdf');
		await userEvent.click(view.getByTestId('skill-catalog-search-button'));
		await view.findByTestId('skill-catalog-card');
		return view;
	}

	it('searches Skills.sh through the scoped backend and saves through the GitHub dialog', async () => {
		const view = await search();
		expect(searchSkillCatalog).toHaveBeenCalledWith(expect.anything(), 'pdf', 'personal-1');
		await userEvent.click(view.getByTestId('skill-catalog-save'));
		expect(view.getByTestId('import-dialog')).toHaveTextContent(item.githubUrl);
		await userEvent.click(view.getByTestId('finish-import'));
		expect(view.emitted('connected')).toHaveLength(1);
		expect(createAgent).not.toHaveBeenCalled();
	});

	it('creates a draft with the imported local skill and opens Agent Test', async () => {
		const view = await search();
		await userEvent.click(view.getByTestId('skill-catalog-try'));
		await userEvent.click(view.getByTestId('finish-import'));
		await waitFor(() =>
			expect(createAgent).toHaveBeenCalledWith(expect.anything(), 'personal-1', 'Try pdf', {
				config: {
					name: 'Try pdf',
					instructions: expect.any(String),
					skills: [{ type: 'skill', id: 'local-skill' }],
					integrations: [],
				},
			}),
		);
		await waitFor(() =>
			expect(state.push).toHaveBeenCalledWith({
				name: 'AgentBuilderView',
				params: { projectId: 'personal-1', agentId: 'test-agent' },
				query: { openPreview: 'true' },
			}),
		);
	});

	it('does not create a test agent when no skill was imported', async () => {
		state.imported = false;
		const view = await search();
		await userEvent.click(view.getByTestId('skill-catalog-try'));
		await userEvent.click(view.getByTestId('finish-import'));
		expect(getSkill).not.toHaveBeenCalled();
		expect(createAgent).not.toHaveBeenCalled();
	});

	it('uses the saved skill when Try follows Save on the same page', async () => {
		const view = await search();
		await userEvent.click(view.getByTestId('skill-catalog-save'));
		await userEvent.click(view.getByTestId('finish-import'));
		await userEvent.click(view.getByTestId('skill-catalog-try'));
		await waitFor(() => expect(createAgent).toHaveBeenCalledTimes(1));
		expect(view.queryByTestId('import-dialog')).not.toBeInTheDocument();
		expect(getSkill).toHaveBeenCalledWith(expect.anything(), 'local-skill');
	});

	it('reopens the same draft when navigation fails', async () => {
		state.push.mockRejectedValueOnce(new Error('Navigation failed'));
		const view = await search();
		await userEvent.click(view.getByTestId('skill-catalog-try'));
		await userEvent.click(view.getByTestId('finish-import'));
		await waitFor(() => expect(state.showError).toHaveBeenCalled());
		await userEvent.click(view.getByRole('button', { name: 'Open test agent' }));
		await waitFor(() => expect(state.push).toHaveBeenCalledTimes(2));
		expect(createAgent).toHaveBeenCalledTimes(1);
	});

	it('keeps the saved skill available when Agent creation fails', async () => {
		vi.mocked(createAgent).mockRejectedValueOnce(new Error('Failed'));
		const view = await search();
		await userEvent.click(view.getByTestId('skill-catalog-try'));
		await userEvent.click(view.getByTestId('finish-import'));
		await waitFor(() => expect(state.showError).toHaveBeenCalled());
		await userEvent.click(view.getByRole('button', { name: 'Open test agent' }));
		await waitFor(() => expect(createAgent).toHaveBeenCalledTimes(2));
		expect(getSkill).toHaveBeenCalledTimes(1);
	});

	it('does not offer Try without permission to create an agent', async () => {
		mockedStore(useProjectsStore).myProjects = [
			mock<ProjectListItem>({ id: 'personal-1', scopes: [] }),
		];
		const view = await search();
		expect(view.getByTestId('skill-catalog-try')).toBeDisabled();
		expect(view.getByTestId('skill-catalog-save')).toBeEnabled();
	});

	it('shows an unavailable state instead of an empty result after a failed search', async () => {
		vi.mocked(searchSkillCatalog).mockRejectedValueOnce(new Error('Unavailable'));
		const view = render();
		await userEvent.type(view.getByTestId('skill-catalog-search'), 'pdf');
		await userEvent.click(view.getByTestId('skill-catalog-search-button'));
		await view.findByTestId('skill-catalog-error');
		expect(view.queryByTestId('skill-catalog-empty')).not.toBeInTheDocument();
	});

	it('loads popular skills immediately and enriches their descriptions', async () => {
		vi.mocked(browseSkillCatalog).mockResolvedValue({
			items: [item],
			view: 'popular',
			fetchedAt: '2026-11-13T10:00:00Z',
		});
		const view = render();
		await view.findByText('Read and edit PDF documents');
		expect(browseSkillCatalog).toHaveBeenCalledWith(expect.anything(), 'popular', 'personal-1');
		expect(searchSkillCatalog).not.toHaveBeenCalled();
	});

	it('opens details inside n8n and keeps Save available on that page', async () => {
		const view = await search();
		await userEvent.click(view.getByTestId('skill-catalog-title'));
		await view.findByTestId('skill-catalog-detail');
		await waitFor(() =>
			expect(getSkillCatalogDetail).toHaveBeenCalledWith(expect.anything(), item.id, 'personal-1'),
		);
		expect(state.push).toHaveBeenCalledWith({ query: { catalogSkill: item.id } });
		await userEvent.click(view.getByTestId('skill-detail-save'));
		expect(view.getByTestId('import-dialog')).toHaveTextContent(item.githubUrl);
	});

	it('switches to the actual trending feed', async () => {
		const view = render();
		await userEvent.click(view.getByRole('tab', { name: 'Trending' }));
		await waitFor(() =>
			expect(browseSkillCatalog).toHaveBeenLastCalledWith(
				expect.anything(),
				'trending',
				'personal-1',
			),
		);
	});

	it('does not fetch the catalog while Discover is hidden', () => {
		render({ props: { active: false } });
		expect(browseSkillCatalog).not.toHaveBeenCalled();
	});

	it('filters categories without changing the feed order or requesting a new feed', async () => {
		const design = {
			...item,
			id: 'acme/skills/design',
			name: 'design',
			slug: 'design',
			category: 'design' as const,
		};
		vi.mocked(browseSkillCatalog).mockResolvedValue({
			items: [{ ...item, category: 'documents' }, design],
			fetchedAt: '2026-11-13T10:00:00Z',
		});
		vi.mocked(getSkillCatalogMetadata).mockImplementation(async (_context, id) => ({
			id,
			name: id,
			description: 'Description',
			category: id === item.id ? 'documents' : 'design',
		}));
		const view = render();
		await view.findByRole('button', { name: 'Design', exact: true });
		await userEvent.click(view.getByRole('button', { name: 'Design', exact: true }));
		expect(view.getAllByTestId('skill-catalog-card')).toHaveLength(1);
		expect(view.getByTestId('skill-catalog-title')).toHaveTextContent('design');
		expect(browseSkillCatalog).toHaveBeenCalledTimes(1);
	});

	it('shows instructions and raw files inside the detail page', async () => {
		const view = await search();
		await userEvent.click(view.getByTestId('skill-catalog-title'));
		await userEvent.click(view.getByRole('tab', { name: 'Instructions' }));
		expect(await view.findByTestId('skill-detail-instructions')).toHaveTextContent(
			'Extract text from a PDF.',
		);
		await userEvent.click(view.getByRole('tab', { name: 'Files' }));
		expect(view.getByTestId('skill-detail-file-content')).toHaveTextContent('Read a PDF');
	});

	it('retries failed detail metadata without losing the skill or import action', async () => {
		vi.mocked(getSkillCatalogDetail).mockRejectedValueOnce(new Error('Unavailable'));
		const view = await search();
		await userEvent.click(view.getByTestId('skill-catalog-title'));
		await view.findByTestId('skill-detail-error');
		expect(view.getByTestId('skill-detail-save')).toBeEnabled();
		await userEvent.click(view.getByRole('button', { name: 'Try again' }));
		await waitFor(() => expect(view.queryByTestId('skill-detail-error')).not.toBeInTheDocument());
		expect(getSkillCatalogDetail).toHaveBeenCalledTimes(2);
	});
});
