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
	useRouter: () => ({ push }),
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
		canEdit: true,
		canDelete: true,
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
				drafts: [{ agentId: 'a1', agentName: 'FirstClassDarwin', projectId: 'p1' }],
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
});
