import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import type { DiscoverGitHubSkillsResponse, GitHubSkillCandidate } from '@n8n/api-types';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/vue';

import { AgentModalTestStub } from '@/features/agents/__tests__/utils/AgentModalTestStub';

import SkillGitHubImportModal from './SkillGitHubImportModal.vue';
import { useSkillsStore } from '../skills.store';

vi.mock('vue-router', () => ({
	useRouter: () => ({ push: vi.fn(), resolve: vi.fn() }),
	useRoute: () => ({ params: {}, query: {} }),
	RouterLink: vi.fn(),
}));

const SHA = 'e7f3b10'.padEnd(40, '0');
const LINK = 'https://github.com/acme/agent-skills';

function candidate(
	path: string,
	result: 'passed' | 'review' | 'blocked',
	findings: GitHubSkillCandidate['check']['findings'] = [],
): GitHubSkillCandidate {
	return {
		path,
		name: path.split('/').at(-1) ?? path,
		description: `About ${path}`,
		check: { result, findings },
		skippedFiles: [],
		importedTo: [],
	};
}

const FOUND: DiscoverGitHubSkillsResponse = {
	owner: 'acme',
	repo: 'agent-skills',
	ref: 'main',
	refType: 'branch',
	commitSha: SHA,
	skills: [
		candidate('skills/notes', 'passed'),
		candidate('skills/triage', 'review', [
			{
				level: 'review',
				code: 'external_links',
				message: 'Links to external domains',
				detail: 'example.com',
			},
		]),
		candidate('skills/hidden', 'blocked', [
			{ level: 'blocked', code: 'hidden_characters', message: 'Hidden characters' },
		]),
	],
};

const renderModal = createComponentRenderer(SkillGitHubImportModal, {
	global: { stubs: { AgentModal: AgentModalTestStub } },
});

function setup() {
	createTestingPinia();
	const store = mockedStore(useSkillsStore);
	const result = renderModal({
		props: {
			open: true,
			scopeOptions: [
				{ value: 'instance', label: 'Instance', icon: 'globe' },
				{ value: 'project:p1', label: 'Support', icon: 'layers' },
			],
			resolveScope: (value: string) =>
				value.startsWith('project:')
					? { scope: 'project' as const, projectId: value.slice('project:'.length) }
					: { scope: 'instance' as const },
		},
	});
	return { store, ...result };
}

async function find(store: ReturnType<typeof setup>['store']) {
	store.discoverGitHubSkills.mockResolvedValue(FOUND);
	await userEvent.type(screen.getByTestId('skill-github-link-input'), LINK);
	await userEvent.click(screen.getByTestId('skill-github-find'));
	await waitFor(() => expect(screen.getAllByTestId('skill-github-candidate')).toHaveLength(3));
}

describe('SkillGitHubImportModal', () => {
	it('shows the error GitHub gave for the link', async () => {
		const { store } = setup();
		store.discoverGitHubSkills.mockRejectedValue(new Error('n8n cannot read this repository.'));

		await userEvent.type(screen.getByTestId('skill-github-link-input'), LINK);
		await userEvent.click(screen.getByTestId('skill-github-find'));

		expect(await screen.findByTestId('skill-github-link-error')).toHaveTextContent(
			'n8n cannot read this repository.',
		);
		expect(screen.queryByTestId('skill-github-candidate')).not.toBeInTheDocument();
	});

	it('asks for a link before it reads GitHub', async () => {
		const { store } = setup();

		await userEvent.click(screen.getByTestId('skill-github-find'));

		expect(screen.getByTestId('skill-github-link-error')).toBeInTheDocument();
		expect(store.discoverGitHubSkills).not.toHaveBeenCalled();
	});

	it('picks every skill that can be imported and keeps a blocked one out', async () => {
		const { store } = setup();
		await find(store);

		const boxes = screen.getAllByTestId('skill-github-pick');
		expect(boxes[0]).toHaveAttribute('data-state', 'checked');
		expect(boxes[1]).toHaveAttribute('data-state', 'checked');
		expect(boxes[2]).toHaveAttribute('data-state', 'unchecked');
		expect(boxes[2]).toBeDisabled();
		expect(screen.getByTestId('skill-github-next')).toHaveTextContent('Check 2 skills');
	});

	it('needs the warnings confirmed, then imports at the commit it showed', async () => {
		const { store, emitted } = setup();
		store.importGitHubSkills.mockResolvedValue({
			created: [
				{ path: 'skills/notes', skillId: 's1', name: 'notes' },
				{ path: 'skills/triage', skillId: 's2', name: 'triage' },
			],
			failed: [],
		});
		await find(store);
		await userEvent.click(screen.getByTestId('skill-github-next'));

		const submit = screen.getByTestId('skill-github-import-submit');
		expect(submit).toBeDisabled();
		expect(screen.getAllByTestId('skill-github-check-row')).toHaveLength(2);

		await userEvent.click(screen.getByTestId('skill-github-ack'));
		expect(submit).toBeEnabled();
		await userEvent.click(submit);

		await waitFor(() =>
			expect(store.importGitHubSkills).toHaveBeenCalledWith({
				url: LINK,
				commitSha: SHA,
				paths: ['skills/notes', 'skills/triage'],
				scope: 'instance',
				acknowledgeWarnings: true,
			}),
		);
		expect(emitted('imported')).toHaveLength(1);
		expect(emitted('update:open')).toEqual([[false]]);
	});

	it('stays open and lists the reasons when nothing was imported', async () => {
		const { store, emitted } = setup();
		store.importGitHubSkills.mockResolvedValue({
			created: [],
			failed: [{ path: 'skills/notes', message: 'A skill named "notes" already exists here.' }],
		});
		await find(store);
		await userEvent.click(screen.getAllByTestId('skill-github-pick')[1]);
		await userEvent.click(screen.getByTestId('skill-github-next'));
		await userEvent.click(screen.getByTestId('skill-github-import-submit'));

		expect(await screen.findByTestId('skill-github-import-error')).toHaveTextContent(
			'notes: A skill named "notes" already exists here.',
		);
		expect(emitted('imported')).toBeUndefined();
	});
});
