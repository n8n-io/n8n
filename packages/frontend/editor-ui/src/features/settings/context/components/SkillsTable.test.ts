import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import type { SkillDetail, SkillListItem } from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';

import SkillsTable from './SkillsTable.vue';
import { useSkillsStore } from '../skills.store';

const push = vi.fn();

vi.mock('vue-router', () => ({
	useRouter: () => ({
		push,
		resolve: ({ params }: { params: { projectId: string; agentId: string } }) => ({
			href: `/projects/${params.projectId}/agents/${params.agentId}`,
		}),
	}),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

function skill(overrides: Partial<SkillListItem> = {}): SkillListItem {
	return {
		id: 's1',
		name: 'research-search',
		description: 'Find research and cite the evidence.',
		scope: 'instance',
		projectId: null,
		projectName: null,
		projectType: null,
		source: 'ui',
		createdBy: null,
		latestVersion: 1,
		availableToAssistant: false,
		usedByAgents: 0,
		availableToMCP: false,
		canEdit: true,
		canDelete: true,
		canStopSyncing: false,
		syncState: null,
		canCheckForUpdates: false,
		createdAt: '2026-10-01T00:00:00.000Z',
		updatedAt: '2026-10-01T00:00:00.000Z',
		...overrides,
	};
}

const renderTable = createComponentRenderer(SkillsTable);

function render(skills: SkillListItem[], showMcpAvailability = false) {
	return renderTable({
		props: { skills, itemsLength: skills.length, loading: false, showMcpAvailability },
	});
}

async function openActions(row: HTMLElement) {
	await userEvent.click(within(row).getByTestId('skill-actions').querySelector('button')!);
}

describe('SkillsTable', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	beforeEach(() => {
		createTestingPinia({
			initialState: {
				[STORES.PROJECTS]: {
					personalProject: { id: 'personal-1', name: 'Me <me@n8n.io>', type: 'personal' },
				},
			},
		});
		push.mockClear();
	});

	it('shows the name and the description of each skill', () => {
		const { getByText } = render([skill()]);

		expect(getByText('research-search')).toBeInTheDocument();
		expect(getByText('Find research and cite the evidence.')).toBeInTheDocument();
	});

	it.each([
		['Global', skill({ scope: 'instance' })],
		[
			'Personal project',
			skill({
				scope: 'project',
				projectId: 'personal-1',
				projectName: 'Me',
				projectType: 'personal',
			}),
		],
		[
			'Marketing',
			skill({
				scope: 'project',
				projectId: 'team-1',
				projectName: 'Marketing',
				projectType: 'team',
			}),
		],
		// Another member's personal project: the editor does not list it, the row names its type.
		[
			'Ada Lovelace',
			skill({
				scope: 'project',
				projectId: 'personal-2',
				projectName: 'Ada Lovelace <ada@example.com>',
				projectType: 'personal',
			}),
		],
	])('labels the scope "%s"', (label, row) => {
		const { getByTestId } = render([row]);

		expect(getByTestId('skill-scope-badge')).toHaveTextContent(label);
	});

	it('shows the creator name and email without an avatar', () => {
		const { getByTestId } = render([
			skill({
				createdBy: { id: 'u1', email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' },
			}),
		]);

		const cell = getByTestId('skill-created-by');
		expect(cell).toHaveTextContent('Ada Lovelace');
		expect(cell).toHaveTextContent('ada@example.com');
		expect(within(cell).queryByTestId('user-avatar')).not.toBeInTheDocument();
	});

	it('shows a dash when the creator is gone', () => {
		const { getByTestId, queryByTestId } = render([skill({ createdBy: null })]);

		expect(getByTestId('skill-created-by-none')).toHaveTextContent('—');
		expect(queryByTestId('skill-created-by')).not.toBeInTheDocument();
	});

	it('marks a skill that is available to MCP clients', () => {
		const { getAllByTestId } = render(
			[skill({ id: 's1', availableToMCP: true }), skill({ id: 's2', availableToMCP: false })],
			true,
		);

		expect(getAllByTestId('skill-available-to-mcp-icon')).toHaveLength(1);
	});

	it('does not mark skills while the MCP skills extension is off', () => {
		const { queryByTestId } = render([skill({ availableToMCP: true })]);

		expect(queryByTestId('skill-available-to-mcp-icon')).not.toBeInTheDocument();
	});

	it('shows a dash for a skill that no agent uses', () => {
		const { getByTestId, queryByTestId } = render([skill({ usedByAgents: 0 })]);

		expect(getByTestId('skill-agents-none')).toHaveTextContent('—');
		expect(queryByTestId('skill-agents-trigger')).not.toBeInTheDocument();
	});

	it('lists the agents that use the skill when the count is opened', async () => {
		const skillsStore = mockedStore(useSkillsStore);
		skillsStore.fetchSkill.mockResolvedValue({
			usedBy: {
				drafts: [
					{
						agentId: 'a1',
						agentName: 'FirstClassDarwin',
						projectId: 'p1',
						version: 2,
						pinned: false,
					},
				],
				pins: [{ agentId: 'a1', agentName: 'FirstClassDarwin', projectId: 'p1', version: 1 }],
				hiddenAgents: 0,
			},
		} as SkillDetail);
		const { getByTestId, findAllByText, findByTestId, findByText } = render([
			skill({ usedByAgents: 1 }),
		]);

		expect(getByTestId('skill-agents-trigger')).toHaveTextContent('1');
		await userEvent.click(getByTestId('skill-agents-trigger'));

		expect(skillsStore.fetchSkill).toHaveBeenCalledWith('s1');
		// A draft and a published version of one agent show as one entry.
		expect(await findAllByText('FirstClassDarwin')).toHaveLength(1);
		const badge = await findByTestId('skill-agents-version');
		expect(badge).toHaveTextContent('Latest (v2)');
		// The published agent still runs v1, so the badge warns and names that version on hover.
		expect(badge).toHaveAttribute('data-variant', 'warning');
		await userEvent.hover(badge);
		expect(await findByText('Published agent uses v1')).toBeInTheDocument();
	});

	it('shows a green badge when the published agent runs the version the draft runs', async () => {
		const skillsStore = mockedStore(useSkillsStore);
		skillsStore.fetchSkill.mockResolvedValue({
			usedBy: {
				drafts: [
					{ agentId: 'a1', agentName: 'Darwin', projectId: 'p1', version: 2, pinned: false },
				],
				pins: [{ agentId: 'a1', agentName: 'Darwin', projectId: 'p1', version: 2 }],
				hiddenAgents: 0,
			},
		} as SkillDetail);
		const { getByTestId, findByTestId } = render([skill({ usedByAgents: 1 })]);

		await userEvent.click(getByTestId('skill-agents-trigger'));

		expect(await findByTestId('skill-agents-version')).toHaveAttribute('data-variant', 'success');
	});

	it('shows the pinned version of an agent and opens the agent in a new tab', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const skillsStore = mockedStore(useSkillsStore);
		skillsStore.fetchSkill.mockResolvedValue({
			usedBy: {
				drafts: [
					{ agentId: 'a1', agentName: 'Pinned bot', projectId: 'p1', version: 3, pinned: true },
				],
				pins: [],
				hiddenAgents: 0,
			},
		} as unknown as SkillDetail);
		const { getByTestId, findByTestId, findByText } = render([skill({ usedByAgents: 1 })]);

		await userEvent.click(getByTestId('skill-agents-trigger'));
		const pinnedBadge = await findByTestId('skill-agents-version');
		expect(pinnedBadge.textContent?.trim()).toBe('v3');
		expect(pinnedBadge).toHaveAttribute('data-variant', 'outline');
		await userEvent.click(await findByText('Pinned bot'));

		expect(open).toHaveBeenCalledWith('/projects/p1/agents/a1', '_blank', 'noopener');
		expect(push).not.toHaveBeenCalled();
	});

	it('sorts by name and by last update only', async () => {
		const { container, emitted } = render([skill()]);
		const header = (title: string) =>
			[...container.querySelectorAll('thead th')].find((th) => th.textContent?.includes(title))!;

		await userEvent.click(header('Scope'));
		await userEvent.click(header('Created by'));
		expect(emitted('update:options')).toBeUndefined();

		await userEvent.click(header('Skill'));
		await userEvent.click(header('Last updated'));
		expect(emitted('update:options')).toEqual([
			[expect.objectContaining({ sortBy: [{ id: 'name', desc: false }] })],
			[expect.objectContaining({ sortBy: [{ id: 'updatedAt', desc: false }] })],
		]);
	});

	it('lets the user resize every column except the actions column', () => {
		const { container } = render([skill()]);
		const headers = [...container.querySelectorAll('thead th')];

		expect(headers.slice(0, -1).every((th) => th.querySelector('.resizer'))).toBe(true);
		expect(headers.at(-1)?.querySelector('.resizer')).toBeNull();
	});

	it('emits open when a row is clicked', async () => {
		const row = skill();
		const { getByText, emitted } = render([row]);

		await userEvent.click(getByText('research-search'));

		expect(emitted('open')).toEqual([[row]]);
	});

	it('offers View instead of Edit for a skill the user cannot change', async () => {
		const { getByTestId, findByText, queryAllByText } = render([
			skill({ canEdit: false, canDelete: false }),
		]);

		await openActions(getByTestId('skills-table'));

		expect(await findByText('View')).toBeInTheDocument();
		expect(document.querySelector('[data-test-id="action-edit"]')).toHaveTextContent('View');
		expect(queryAllByText('Edit')).toHaveLength(0);
	});

	it('disables Delete while agents use the skill', async () => {
		const { getByTestId } = render([skill({ usedByAgents: 2 })]);

		await openActions(getByTestId('skills-table'));

		await waitFor(() =>
			expect(document.querySelector('[data-test-id="action-delete"]')).toHaveAttribute(
				'data-disabled',
			),
		);
	});

	it('emits delete for a skill that no agent uses', async () => {
		const row = skill();
		const { getByTestId, emitted } = render([row]);

		await openActions(getByTestId('skills-table'));
		await waitFor(() =>
			expect(document.querySelector('[data-test-id="action-delete"]')).toBeInTheDocument(),
		);
		await userEvent.click(document.querySelector('[data-test-id="action-delete"]')!);

		expect(emitted('delete')).toEqual([[row]]);
	});

	it('offers Stop syncing only for a synced skill the user may stop syncing', async () => {
		const { getByTestId } = render([skill({ source: 'github', canEdit: false })]);

		await openActions(getByTestId('skills-table'));

		await waitFor(() =>
			expect(document.querySelector('[data-test-id="action-download"]')).toBeInTheDocument(),
		);
		expect(document.querySelector('[data-test-id="action-stopSyncing"]')).not.toBeInTheDocument();
	});

	it('emits stopSyncing for a synced skill the user may stop syncing', async () => {
		const row = skill({ source: 'github', canEdit: false, canStopSyncing: true });
		const { getByTestId, emitted } = render([row]);

		await openActions(getByTestId('skills-table'));
		await waitFor(() =>
			expect(document.querySelector('[data-test-id="action-stopSyncing"]')).toHaveTextContent(
				'Stop syncing',
			),
		);
		await userEvent.click(document.querySelector('[data-test-id="action-stopSyncing"]')!);

		expect(emitted('stopSyncing')).toEqual([[row]]);
	});

	it('emits checkForUpdates for a synced skill the user may check', async () => {
		const row = skill({ source: 'github', canEdit: false, canCheckForUpdates: true });
		const { getByTestId, emitted } = render([row]);

		await openActions(getByTestId('skills-table'));
		await waitFor(() =>
			expect(document.querySelector('[data-test-id="action-checkForUpdates"]')).toHaveTextContent(
				'Check for updates',
			),
		);
		await userEvent.click(document.querySelector('[data-test-id="action-checkForUpdates"]')!);

		expect(emitted('checkForUpdates')).toEqual([[row]]);
	});

	it('offers no Check for updates for a skill the user may not check', async () => {
		const { getByTestId } = render([skill({ source: 'github', canEdit: false })]);

		await openActions(getByTestId('skills-table'));

		await waitFor(() =>
			expect(document.querySelector('[data-test-id="action-download"]')).toBeInTheDocument(),
		);
		expect(
			document.querySelector('[data-test-id="action-checkForUpdates"]'),
		).not.toBeInTheDocument();
	});

	it.each([
		{ syncState: 'update_available' as const, text: 'Update available' },
		{ syncState: 'update_blocked' as const, text: 'Update blocked' },
	])('shows $text on a synced skill whose source has an update', ({ syncState, text }) => {
		const { getByTestId } = render([skill({ source: 'github', syncState })]);

		expect(getByTestId(`skill-sync-badge-${syncState}`)).toHaveTextContent(text);
	});

	it.each([{ syncState: 'up_to_date' as const }, { syncState: null }])(
		'shows no sync badge for sync state $syncState',
		({ syncState }) => {
			const { queryByTestId } = render([skill({ syncState })]);

			expect(queryByTestId(/skill-sync-badge/)).toBeNull();
		},
	);

	it('emits download for any skill, also one the user cannot change', async () => {
		const row = skill({ canEdit: false, canDelete: false });
		const { getByTestId, emitted } = render([row]);

		await openActions(getByTestId('skills-table'));
		await waitFor(() =>
			expect(document.querySelector('[data-test-id="action-download"]')).toBeInTheDocument(),
		);
		await userEvent.click(document.querySelector('[data-test-id="action-download"]')!);

		expect(emitted('download')).toEqual([[row]]);
	});

	it('emits timeline for any skill, also one the user cannot change', async () => {
		const row = skill({ canEdit: false });
		const { getByTestId, emitted } = render([row]);

		await openActions(getByTestId('skills-table'));
		await waitFor(() =>
			expect(document.querySelector('[data-test-id="action-timeline"]')).toBeInTheDocument(),
		);
		await userEvent.click(document.querySelector('[data-test-id="action-timeline"]')!);

		expect(emitted('timeline')).toEqual([[row]]);
	});

	it('disables Compare versions for a skill with one version and emits it otherwise', async () => {
		const single = skill({ id: 's1', latestVersion: 1 });
		const { getByTestId, emitted, unmount } = render([single]);
		await openActions(getByTestId('skills-table'));
		await waitFor(() =>
			expect(document.querySelector('[data-test-id="action-compare"]')).toBeInTheDocument(),
		);
		expect(document.querySelector('[data-test-id="action-compare"]')).toHaveAttribute(
			'data-disabled',
		);
		unmount();

		const versioned = skill({ id: 's2', latestVersion: 3 });
		const second = render([versioned]);
		await openActions(second.getByTestId('skills-table'));
		await waitFor(() =>
			expect(document.querySelector('[data-test-id="action-compare"]')).toBeInTheDocument(),
		);
		await userEvent.click(document.querySelector('[data-test-id="action-compare"]')!);

		expect(second.emitted('compare')).toEqual([[versioned]]);
		expect(emitted('compare')).toBeUndefined();
	});
});
