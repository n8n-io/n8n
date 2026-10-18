import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import type { SkillDetail, SkillListItem } from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/vue';

import SkillsTable from './SkillsTable.vue';
import { useSkillsStore } from '../skills.store';

const push = vi.fn();
const resolve = vi.fn(({ params }: { params: { projectId: string; agentId: string } }) => ({
	href: `/projects/${params.projectId}/agents/${params.agentId}`,
}));

vi.mock('vue-router', () => ({
	useRouter: () => ({ push, resolve }),
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
		agentId: null,
		agentName: null,
		source: 'ui',
		createdBy: null,
		latestVersion: 1,
		latestVersionLabel: null,
		latestVersionSavedBy: null,
		usedByAgents: 0,
		canEdit: true,
		canDelete: true,
		gitSource: null,
		createdAt: '2026-10-01T00:00:00.000Z',
		updatedAt: '2026-10-01T00:00:00.000Z',
		...overrides,
	};
}

const renderTable = createComponentRenderer(SkillsTable);

function render(skills: SkillListItem[]) {
	return renderTable({
		props: { skills, itemsLength: skills.length, loading: false },
	});
}

async function openActions(row: HTMLElement) {
	await userEvent.click(within(row).getByTestId('skill-actions').querySelector('button')!);
}

describe('SkillsTable', () => {
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
		['FirstClassDarwin only', skill({ scope: 'agent', agentName: 'FirstClassDarwin' })],
	])('labels the scope "%s"', (label, row) => {
		const { getByTestId } = render([row]);

		expect(getByTestId('skill-scope-badge')).toHaveTextContent(label);
	});

	it('shows the creator with the user cell of the users table', () => {
		const { getByTestId } = render([
			skill({
				createdBy: { id: 'u1', email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' },
			}),
		]);

		const cell = getByTestId('skill-created-by');
		expect(cell).toHaveTextContent('Ada Lovelace');
		expect(cell).toHaveTextContent('ada@example.com');
	});

	it('shows a dash when the creator is gone', () => {
		const { getByTestId, queryByTestId } = render([skill({ createdBy: null })]);

		expect(getByTestId('skill-created-by-none')).toHaveTextContent('—');
		expect(queryByTestId('skill-created-by')).not.toBeInTheDocument();
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
						version: 1,
						pinned: false,
					},
				],
				pins: [{ agentId: 'a1', agentName: 'FirstClassDarwin', projectId: 'p1', version: 1 }],
				hiddenAgents: 0,
			},
		} as SkillDetail);
		const { getByTestId, findAllByText } = render([skill({ usedByAgents: 1 })]);

		expect(getByTestId('skill-agents-trigger')).toHaveTextContent('1');
		await userEvent.click(getByTestId('skill-agents-trigger'));

		expect(skillsStore.fetchSkill).toHaveBeenCalledWith('s1');
		// A draft and a published version of one agent show as one entry.
		expect(await findAllByText('FirstClassDarwin')).toHaveLength(1);
	});

	it('shows the version each agent uses next to its name', async () => {
		const skillsStore = mockedStore(useSkillsStore);
		skillsStore.fetchSkill.mockResolvedValue({
			usedBy: {
				drafts: [
					{ agentId: 'a1', agentName: 'Support bot', projectId: 'p1', version: 4, pinned: false },
					{
						agentId: 'a2',
						agentName: 'Returns triage',
						projectId: 'p1',
						version: 4,
						pinned: false,
					},
					{ agentId: 'a3', agentName: 'Billing agent', projectId: 'p1', version: 3, pinned: true },
				],
				pins: [
					{ agentId: 'a2', agentName: 'Returns triage', projectId: 'p1', version: 3 },
					{ agentId: 'a4', agentName: 'Live only', projectId: 'p1', version: 2 },
				],
				hiddenAgents: 0,
			},
		} as SkillDetail);
		const { getByTestId } = render([skill({ usedByAgents: 4, latestVersion: 4 })]);

		await userEvent.click(getByTestId('skill-agents-trigger'));

		await waitFor(() =>
			expect(document.querySelectorAll('[data-test-id="skill-agents-version"]')).toHaveLength(4),
		);
		const badges = [...document.querySelectorAll('[data-test-id="skill-agents-version"]')];
		expect(badges.map((badge) => badge.textContent?.trim())).toEqual([
			'Latest (v4)',
			'Latest (v4)',
			'v3',
			'Published (v2)',
		]);
		// No published agent runs it, the published agent is behind, pinned, published.
		expect(badges.map((badge) => badge.className)).toEqual([
			expect.stringMatching(/warning/),
			expect.stringMatching(/warning/),
			expect.stringMatching(/outline/),
			expect.stringMatching(/success/),
		]);
		expect(badges[2].querySelector('svg')).not.toBeNull();
		expect(document.querySelector('[data-test-id="skill-agents-menu"]')).toHaveTextContent(
			'Used by',
		);

		await userEvent.hover(badges[1]);
		expect(await screen.findByText('Published agent uses v3')).toBeInTheDocument();
	});

	it('names the agent count in the trigger label', () => {
		const { getByTestId } = render([skill({ usedByAgents: 3 })]);

		expect(getByTestId('skill-agents-trigger')).toHaveAttribute('aria-label', 'Show 3 agents');
	});

	it('shows a draft as latest when the published agent runs the same content', async () => {
		const skillsStore = mockedStore(useSkillsStore);
		skillsStore.fetchSkill.mockResolvedValue({
			usedBy: {
				drafts: [
					{
						agentId: 'a1',
						agentName: 'Support bot',
						projectId: 'p1',
						version: 10,
						pinned: false,
						liveHasSameContent: true,
					},
				],
				pins: [{ agentId: 'a1', agentName: 'Support bot', projectId: 'p1', version: 7 }],
				hiddenAgents: 0,
			},
		} as SkillDetail);
		const { getByTestId, findByText } = render([skill({ usedByAgents: 1, latestVersion: 10 })]);

		await userEvent.click(getByTestId('skill-agents-trigger'));

		const badge = await waitFor(() => {
			const found = document.querySelector('[data-test-id="skill-agents-version"]');
			expect(found).not.toBeNull();
			return found!;
		});
		expect(badge).toHaveTextContent('Latest (v10)');
		expect(badge.className).toMatch(/success/);
		await userEvent.hover(badge);
		expect(await findByText('Same content as the published v7')).toBeInTheDocument();
	});

	it('opens an agent from the agents list in a new tab', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const skillsStore = mockedStore(useSkillsStore);
		skillsStore.fetchSkill.mockResolvedValue({
			usedBy: {
				drafts: [
					{ agentId: 'a1', agentName: 'Support bot', projectId: 'p1', version: 1, pinned: false },
				],
				pins: [],
				hiddenAgents: 0,
			},
		} as unknown as SkillDetail);
		const { getByTestId } = render([skill({ usedByAgents: 1 })]);

		await userEvent.click(getByTestId('skill-agents-trigger'));
		await userEvent.click(await screen.findByText('Support bot'));

		expect(open).toHaveBeenCalledWith('/projects/p1/agents/a1', '_blank', 'noopener');
		expect(push).not.toHaveBeenCalled();
		open.mockRestore();
	});

	it('has no version column', () => {
		const { queryByTestId, queryByText } = render([skill({ latestVersion: 4 })]);

		expect(queryByTestId('skills-table-version')).not.toBeInTheDocument();
		expect(queryByText('Version')).not.toBeInTheDocument();
	});

	it('shows who saved the latest version', () => {
		const { getByTestId } = render([
			skill({
				latestVersionSavedBy: {
					id: 'u1',
					email: 'ada@example.com',
					firstName: 'Ada',
					lastName: null,
				},
			}),
		]);

		expect(getByTestId('skill-updated-by')).toHaveTextContent('by Ada');
	});

	it.each(['timeline', 'compare'] as const)('emits open with the %s view', async (view) => {
		const row = skill({ latestVersion: 3 });
		const { getByTestId, emitted } = render([row]);

		await openActions(getByTestId('skills-table'));
		await waitFor(() =>
			expect(document.querySelector(`[data-test-id="action-${view}"]`)).toBeInTheDocument(),
		);
		await userEvent.click(document.querySelector(`[data-test-id="action-${view}"]`)!);

		expect(emitted('open')).toEqual([[row, view]]);
	});

	it('disables Compare versions for a skill with one version', async () => {
		const { getByTestId } = render([skill({ latestVersion: 1 })]);

		await openActions(getByTestId('skills-table'));

		await waitFor(() =>
			expect(document.querySelector('[data-test-id="action-compare"]')).toHaveAttribute(
				'data-disabled',
			),
		);
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

	describe('GitHub sync', () => {
		const gitSource = (overrides: Partial<NonNullable<SkillListItem['gitSource']>> = {}) => ({
			owner: 'acme',
			repo: 'agent-skills',
			ref: 'main',
			refType: 'branch' as const,
			path: 'skills/notes',
			htmlUrl: 'https://github.com/acme/agent-skills/tree/main/skills/notes',
			syncedCommitSha: 'a'.repeat(40),
			status: 'ok' as const,
			lastError: null,
			lastCheckedAt: null,
			update: null,
			...overrides,
		});

		it('names the source of each skill', () => {
			const { getAllByTestId, getByTestId } = render([
				skill({ id: 's1', gitSource: gitSource() }),
				skill({ id: 's2' }),
			]);

			expect(getByTestId('skill-source-github')).toHaveTextContent('agent-skills');
			expect(getAllByTestId('skill-source-n8n')[0]).toHaveTextContent('Created in n8n');
		});

		it.each([
			[{ update: { status: 'pending' as const, toCommitSha: 'b'.repeat(40) } }, 'Update available'],
			[{ update: { status: 'blocked' as const, toCommitSha: 'b'.repeat(40) } }, 'Update blocked'],
			[{ status: 'unavailable' as const }, 'Source unavailable'],
			[{ status: 'rate_limited' as const }, 'Checks delayed'],
			[{ refType: 'tag' as const, ref: 'v1.0.0' }, 'Fixed to a tag or commit'],
		])('shows a chip for %j', (overrides, label) => {
			const { getByTestId } = render([skill({ gitSource: gitSource(overrides) })]);

			expect(getByTestId('skill-git-state')).toHaveTextContent(label);
		});

		it('shows no chip for a synced skill that is up to date', () => {
			const { queryByTestId } = render([skill({ gitSource: gitSource() })]);

			expect(queryByTestId('skill-git-state')).not.toBeInTheDocument();
		});

		it('emits review and stop syncing from the row menu', async () => {
			const row = skill({
				gitSource: gitSource({ update: { status: 'pending', toCommitSha: 'b'.repeat(40) } }),
			});
			const { getByTestId, emitted } = render([row]);

			await openActions(getByTestId('skills-table'));
			await waitFor(() =>
				expect(document.querySelector('[data-test-id="action-reviewUpdate"]')).toBeInTheDocument(),
			);
			await userEvent.click(document.querySelector('[data-test-id="action-reviewUpdate"]')!);
			expect(emitted('review')).toEqual([[row]]);

			await openActions(getByTestId('skills-table'));
			await waitFor(() =>
				expect(document.querySelector('[data-test-id="action-stopSync"]')).toBeInTheDocument(),
			);
			await userEvent.click(document.querySelector('[data-test-id="action-stopSync"]')!);
			expect(emitted('stopSync')).toEqual([[row]]);
		});

		it('offers no GitHub actions to a user who cannot edit the skill', async () => {
			const { getByTestId } = render([skill({ canEdit: false, gitSource: gitSource() })]);

			await openActions(getByTestId('skills-table'));
			await waitFor(() =>
				expect(document.querySelector('[data-test-id="action-delete"]')).toBeInTheDocument(),
			);
			expect(document.querySelector('[data-test-id="action-stopSync"]')).toBeNull();
		});
	});
});
