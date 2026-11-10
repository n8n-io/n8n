import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import type {
	DiscoveredSkill,
	SkillSourceConnectResponse,
	SkillSourceCredentialOption,
	SkillSourceDiscovery,
	SkillSourceRepositoryList,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';

import { useUIStore } from '@/app/stores/ui.store';
import type { AgentSkillModalScopeOption } from '@/features/agents/components/AgentSkillModal.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project, ProjectListItem } from '@/features/collaboration/projects/projects.types';

import SkillSourceConnectDialog from './SkillSourceConnectDialog.vue';
import { useSkillsStore } from '../skills.store';

const showErrorMock = vi.fn();
const oauth = vi.hoisted(() => ({
	canOAuthCredentialQuickConnect: vi.fn(() => false),
	createAndAuthorize: vi.fn(),
}));
vi.mock('@/features/credentials/composables/useCredentialOAuth', () => ({
	useCredentialOAuth: () => oauth,
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock, showMessage: vi.fn() }),
}));

// N8nDialog teleports out of the tree (Reka UI's DialogPortal), so it renders inline here. The
// v2 select and combobox also open in a portal, so they are native controls with the same
// props and events. The design system tests cover their own search and keyboard behavior.
vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	const N8nDialog = {
		name: 'N8nDialog',
		props: ['open', 'size', 'header'],
		emits: ['update:open'],
		template: `
			<div v-if="open" role="dialog">
				<h2 data-test-id="dialog-title">{{ header }}</h2>
				<slot />
			</div>
		`,
	};
	const N8nSelect2 = {
		name: 'N8nSelect2',
		inheritAttrs: false,
		props: ['modelValue', 'items', 'disabled', 'placeholder'],
		emits: ['update:modelValue'],
		// A native option holds text only, so the custom item labels render after the select.
		template: `
			<select
				v-bind="$attrs"
				:value="modelValue"
				:disabled="disabled"
				@change="$emit('update:modelValue', $event.target.value)"
			>
				<option
					v-for="item in items.filter((entry) => entry.type !== 'separator')"
					:key="item.value"
					:value="item.value"
				>{{ item.label }}</option>
			</select>
			<template v-for="item in items.filter((entry) => entry.type !== 'separator')" :key="'label-' + item.value">
				<slot name="item-label" :item="item" />
			</template>
		`,
	};
	const N8nCombobox2 = {
		name: 'N8nCombobox2',
		props: ['modelValue', 'items', 'placeholder', 'emptyText', 'loading'],
		emits: ['update:modelValue', 'update:searchTerm'],
		template: `
			<div>
				<input
					:placeholder="placeholder"
					data-test-id="repository-search"
					@input="$emit('update:searchTerm', $event.target.value)"
				/>
				<span data-test-id="repository-value">{{ modelValue }}</span>
				<button
					v-for="item in items"
					:key="item.value"
					type="button"
					data-test-id="repository-option"
					@click="$emit('update:modelValue', item.value)"
				>{{ item.label }}</button>
				<span v-if="items.length === 0" data-test-id="repository-empty">{{ emptyText }}</span>
			</div>
		`,
	};
	return { ...actual, N8nDialog, N8nSelect2, N8nCombobox2 };
});

const SCOPES: AgentSkillModalScopeOption[] = [
	{ value: 'instance', label: 'Global', icon: 'globe' },
	{ value: 'project:personal-1', label: 'Personal project', icon: 'user' },
	{ value: 'project:team-1', label: 'Marketing', icon: 'layers' },
];

const SKILL_MD =
	'---\nname: brand-voice\ndescription: Write clear copy.\n---\n\nUse short sentences.';

function discovered(overrides: Partial<DiscoveredSkill> = {}): DiscoveredSkill {
	return {
		key: 'skills/brand-voice',
		location: 'skills/brand-voice',
		name: 'brand-voice',
		description: 'Write clear customer-facing copy.',
		skippedFiles: [],
		previewFiles: [{ path: 'SKILL.md', text: SKILL_MD }],
		previewTruncated: false,
		nameTaken: false,
		error: null,
		check: { verdict: 'pass', findings: [] },
		webUrl: 'https://github.com/acme/skills/tree/main/skills/brand-voice',
		...overrides,
	};
}

function discovery(overrides: Partial<SkillSourceDiscovery> = {}): SkillSourceDiscovery {
	return {
		source: {
			type: 'github',
			label: 'acme/skills',
			ref: 'main',
			path: '',
			webUrl: 'https://github.com/acme/skills',
		},
		duplicate: { kind: 'none' },
		skills: [
			discovered(),
			discovered({ key: 'skills/seo-check', location: 'skills/seo-check', name: 'seo-check' }),
		],
		truncated: false,
		...overrides,
	};
}

const renderDialog = createComponentRenderer(SkillSourceConnectDialog);

const TOKEN: SkillSourceCredentialOption = { id: 'cred-1', name: 'Ada token', type: 'githubApi' };
const APP: SkillSourceCredentialOption = { id: 'cred-2', name: 'Acme app', type: 'githubAppApi' };
const OAUTH: SkillSourceCredentialOption = {
	id: 'cred-3',
	name: 'Ada account',
	type: 'githubOAuth2Api',
};

const REPOSITORIES: SkillSourceRepositoryList = {
	repositories: [
		{ owner: 'acme', name: 'skills', private: true, url: 'https://github.com/acme/skills' },
		{ owner: 'acme', name: 'playbooks', private: false, url: 'https://github.com/acme/playbooks' },
		{ owner: 'ada', name: 'notes', private: true, url: 'https://github.com/ada/notes' },
	],
	truncated: false,
};

let skillsStore: MockedStore<typeof useSkillsStore>;
let uiStore: MockedStore<typeof useUIStore>;

type View = ReturnType<typeof render>;

function render(scopeOptions = SCOPES) {
	return renderDialog({ props: { open: true, scopeOptions } });
}

async function selectScope(view: View, value: string) {
	await userEvent.selectOptions(view.getByTestId('skill-source-scope-select'), value);
}

async function selectCredential(view: View, value: string) {
	const select = view.getByTestId('skill-source-credential-select');
	await waitFor(() => expect(within(select).getByRole('option', { name: value })).toBeTruthy());
	await userEvent.selectOptions(select, within(select).getByRole('option', { name: value }));
}

async function typeRepository(view: View, text: string) {
	await userEvent.type(view.getByTestId('repository-search'), text);
}

async function pickRepository(view: View, label: string) {
	await userEvent.click(await view.findByRole('button', { name: label }));
}

async function next(view: View) {
	await userEvent.click(view.getByTestId('skill-source-next'));
}

/** Pastes a link with no credential and goes to the review. */
async function review(view: View, link = 'https://github.com/acme/skills') {
	await typeRepository(view, link);
	await next(view);
	await view.findByTestId('skill-source-review');
}

describe('SkillSourceConnectDialog', () => {
	beforeEach(() => {
		oauth.canOAuthCredentialQuickConnect.mockReset().mockReturnValue(false);
		oauth.createAndAuthorize.mockReset();
		createTestingPinia();
		skillsStore = mockedStore(useSkillsStore);
		skillsStore.fetchSourceCredentials.mockResolvedValue([]);
		skillsStore.fetchSourceRepositories.mockResolvedValue({ repositories: [], truncated: false });
		uiStore = mockedStore(useUIStore);
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.personalProject = {
			id: 'personal-1',
			scopes: ['credential:create'],
		} as Project;
		projectsStore.myProjects = [
			{ id: 'team-1', type: 'team', name: 'Marketing', scopes: ['credential:create'] },
			{ id: 'team-2', type: 'team', name: 'Sales', scopes: ['credential:read'] },
		] as ProjectListItem[];
		showErrorMock.mockClear();
	});

	describe('the connect form', () => {
		it('asks for the scope, the credential and the repository in one modal', async () => {
			const view = render();

			expect(view.getByTestId('dialog-title')).toHaveTextContent('Import skills from GitHub');
			expect(view.getByText('Who can use these skills')).toBeInTheDocument();
			expect(view.getByText('GitHub credential')).toBeInTheDocument();
			expect(view.getByText('Repository')).toBeInTheDocument();
			expect(view.getByTestId('skill-source-scope-select')).toHaveValue('instance');
			expect(view.queryByTestId('skill-source-owner-select')).not.toBeInTheDocument();
			await waitFor(() =>
				expect(skillsStore.fetchSourceCredentials).toHaveBeenCalledWith({ scope: 'instance' }),
			);
			expect(view.getByTestId('skill-source-next')).toBeDisabled();
		});

		it('takes a pasted link with no credential, and reads it', async () => {
			skillsStore.discoverSource.mockResolvedValue(discovery());
			const view = render();

			await typeRepository(view, 'github.com/acme/skills/tree/main/skills');
			await next(view);

			expect(skillsStore.discoverSource).toHaveBeenCalledWith({
				url: 'https://github.com/acme/skills/tree/main/skills',
				scope: 'instance',
			});
			expect(await view.findByTestId('skill-source-review')).toBeInTheDocument();
		});

		it('asks for a link while no credential is picked', async () => {
			const view = render();

			await typeRepository(view, 'acme');

			expect(view.getByTestId('repository-empty')).toHaveTextContent(
				'Paste a link to a public repository, or pick a credential to list its repositories.',
			);
			expect(view.getByTestId('skill-source-next')).toBeDisabled();
		});

		it('lists the repositories of the credential across all owners, and reads the picked one', async () => {
			skillsStore.fetchSourceCredentials.mockResolvedValue([TOKEN, APP]);
			skillsStore.fetchSourceRepositories.mockResolvedValue(REPOSITORIES);
			skillsStore.discoverSource.mockResolvedValue(discovery());
			const view = render();

			await selectCredential(view, 'Ada token');

			await waitFor(() =>
				expect(skillsStore.fetchSourceRepositories).toHaveBeenCalledWith({
					scope: 'instance',
					credentialId: 'cred-1',
				}),
			);
			const options = await view.findAllByTestId('repository-option');
			expect(options.map((option) => option.textContent)).toEqual([
				'acme/skills',
				'acme/playbooks',
				'ada/notes',
			]);

			await pickRepository(view, 'ada/notes');
			await next(view);

			expect(skillsStore.discoverSource).toHaveBeenCalledWith({
				url: 'https://github.com/ada/notes',
				scope: 'instance',
				credentialId: 'cred-1',
			});
		});

		it('keeps the credential and the picked repository when the new scope can use them', async () => {
			skillsStore.fetchSourceCredentials.mockResolvedValue([TOKEN, APP]);
			skillsStore.fetchSourceRepositories.mockResolvedValue(REPOSITORIES);
			skillsStore.discoverSource.mockResolvedValue(discovery());
			const view = render();
			await selectCredential(view, 'Ada token');
			await pickRepository(view, 'ada/notes');

			await selectScope(view, 'project:team-1');
			await waitFor(() =>
				expect(skillsStore.fetchSourceRepositories).toHaveBeenLastCalledWith({
					scope: 'project',
					projectId: 'team-1',
					credentialId: 'cred-1',
				}),
			);
			await view.findAllByTestId('repository-option');
			await next(view);

			expect(skillsStore.discoverSource).toHaveBeenCalledWith({
				url: 'https://github.com/ada/notes',
				scope: 'project',
				projectId: 'team-1',
				credentialId: 'cred-1',
			});
		});

		it('clears the credential and the picked repository when the new scope cannot use them', async () => {
			skillsStore.fetchSourceCredentials.mockImplementation(async (target) =>
				target.scope === 'instance' ? [TOKEN] : [APP],
			);
			skillsStore.fetchSourceRepositories.mockResolvedValue(REPOSITORIES);
			const view = render();
			await selectCredential(view, 'Ada token');
			await pickRepository(view, 'ada/notes');

			await selectScope(view, 'project:team-1');

			await waitFor(() => expect(view.getByTestId('skill-source-next')).toBeDisabled());
			expect(view.getByTestId('skill-source-credential-select')).toHaveValue('__none__');
		});

		it('offers a pasted link as the first option next to the repositories of the credential', async () => {
			skillsStore.fetchSourceCredentials.mockResolvedValue([TOKEN]);
			skillsStore.fetchSourceRepositories.mockResolvedValue(REPOSITORIES);
			const view = render();
			await selectCredential(view, 'Ada token');
			await view.findAllByTestId('repository-option');

			await typeRepository(view, 'https://github.com/acme/other/tree/main/skills/pdf/SKILL.md');

			const options = view.getAllByTestId('repository-option');
			expect(options[0]).toHaveTextContent(
				'https://github.com/acme/other/tree/main/skills/pdf/SKILL.md',
			);
			expect(view.getByTestId('skill-source-next')).toBeEnabled();
		});

		it('sends the project of a project scope, and lists the credentials of that project', async () => {
			skillsStore.discoverSource.mockResolvedValue(discovery());
			const view = render();

			await selectScope(view, 'project:team-1');
			await review(view);

			expect(skillsStore.fetchSourceCredentials).toHaveBeenLastCalledWith({
				scope: 'project',
				projectId: 'team-1',
			});
			expect(skillsStore.discoverSource).toHaveBeenCalledWith({
				url: 'https://github.com/acme/skills',
				scope: 'project',
				projectId: 'team-1',
			});
		});

		it.each([
			{
				link: 'https://gitlab.com/acme/skills',
				message: 'Only GitHub links work for now. Use https://github.com/owner/repo.',
			},
			{
				link: 'https://github.com/acme',
				message: 'This is not a GitHub repository link. Use https://github.com/owner/repo.',
			},
		])('says why it cannot read $link, without a request', async ({ link, message }) => {
			const view = render();

			await typeRepository(view, link);
			await next(view);

			expect(view.getByTestId('skill-source-link-error')).toHaveTextContent(message);
			expect(skillsStore.discoverSource).not.toHaveBeenCalled();
		});

		it('shows the translated reason when the server cannot read the link', async () => {
			skillsStore.discoverSource.mockRejectedValue(
				new ResponseError('raw server text', { meta: { reason: 'rate_limited' } }),
			);
			const view = render();

			await typeRepository(view, 'https://github.com/acme/skills');
			await next(view);

			const error = await view.findByTestId('skill-source-link-error');
			expect(error).toHaveTextContent(
				'GitHub limits how often n8n can read it. Try again in a few minutes.',
			);
			expect(error).not.toHaveTextContent('raw server text');
		});

		it.each([
			{
				where: 'global' as const,
				scope: 'project:team-1',
				message:
					'acme/skills · main is already connected in Global. Every project can use its skills.',
			},
			{
				where: 'scope' as const,
				scope: 'project:team-1',
				message: 'acme/skills · main is already connected in Marketing.',
			},
		])(
			'blocks a repository that is already connected in $where, under the repository field',
			async ({ where, scope, message }) => {
				skillsStore.discoverSource.mockResolvedValue(
					discovery({ duplicate: { kind: 'blocked', where, sourceId: 'src-1' } }),
				);
				const view = render();
				await selectScope(view, scope);

				await typeRepository(view, 'https://github.com/acme/skills');
				await next(view);

				expect(await view.findByTestId('skill-source-duplicate')).toHaveTextContent(message);
				expect(view.queryByTestId('skill-source-review')).not.toBeInTheDocument();
				expect(view.getByTestId('skill-source-next')).toBeDisabled();
			},
		);

		it('drops a discover answer when the user changed the scope while n8n read the link', async () => {
			let answer: (value: SkillSourceDiscovery) => void = () => {};
			skillsStore.discoverSource.mockReturnValue(new Promise((resolve) => (answer = resolve)));
			const view = render();
			await typeRepository(view, 'https://github.com/acme/skills');
			await next(view);

			await selectScope(view, 'project:team-1');
			answer(discovery());

			await waitFor(() => expect(view.getByTestId('skill-source-next')).toBeEnabled());
			expect(view.queryByTestId('skill-source-review')).not.toBeInTheDocument();
		});
	});

	describe('the review', () => {
		const warning = discovered({
			key: 'skills/hidden',
			location: 'skills/hidden',
			name: 'hidden',
			webUrl: 'https://github.com/acme/skills/tree/main/skills/hidden',
			previewFiles: [
				{
					path: 'SKILL.md',
					text: '---\nname: hidden\ndescription: d\n---\n\nUse short⟦U+200B⟧ sentences.',
				},
				{ path: 'references/tone.md', text: 'Tone.' },
			],
			skippedFiles: ['scripts/run.sh', 'references/data.md'],
			check: {
				verdict: 'needs_review',
				findings: [
					{
						rule: 'hidden_unicode',
						severity: 'needs_review',
						file: 'SKILL.md',
						detail: 'raw detail',
						location: { line: 6, start: 9, end: 17 },
					},
					{ rule: 'file_skipped', severity: 'info', file: 'scripts/run.sh', detail: 'raw' },
					{ rule: 'file_unstorable', severity: 'info', file: 'references/data.md', detail: 'raw' },
				],
			},
		});
		const passed = discovered({ key: 'tools/lint', location: 'tools/lint', name: 'lint' });
		const blocked = discovered({
			key: 'skills/huge',
			location: 'skills/huge',
			name: 'huge',
			check: {
				verdict: 'blocked',
				findings: [
					{ rule: 'over_limit', severity: 'blocked', file: 'SKILL.md', detail: 'raw zod text' },
				],
			},
		});
		const taken = discovered({
			key: 'skills/taken',
			location: 'skills/taken',
			name: 'taken',
			nameTaken: true,
		});
		const unreadable = discovered({
			key: 'skills/broken',
			location: 'skills/broken',
			name: null,
			check: null,
			previewFiles: [],
			error: { reason: 'not_found', message: 'raw server message' },
		});

		const skills = [passed, warning, blocked, taken, unreadable];

		const tab = (view: View, name: string) => view.getByRole('tab', { name: new RegExp(name) });
		const rows = (view: View) =>
			view.getAllByTestId('skill-source-skill').map((row) => row.dataset.skillKey);

		it('shows Warning, Passed and Blocked tabs with counts, and opens on Warning', async () => {
			skillsStore.discoverSource.mockResolvedValue(discovery({ skills }));
			const view = render();

			await review(view);

			expect(tab(view, 'Warning')).toHaveTextContent('Warning (1)');
			expect(tab(view, 'Passed')).toHaveTextContent('Passed (1)');
			expect(tab(view, 'Blocked')).toHaveTextContent('Blocked (3)');
			expect(rows(view)).toEqual(['skills/hidden']);
			expect(view.getByTestId('skill-source-summary')).toHaveTextContent('acme/skills · main');
		});

		it('does not let the user tick a blocked skill, and says why in translated text', async () => {
			skillsStore.discoverSource.mockResolvedValue(discovery({ skills }));
			const view = render();
			await review(view);

			await userEvent.click(tab(view, 'Blocked'));

			const list = view.getByTestId('skill-source-skills');
			for (const checkbox of within(list).getAllByRole('checkbox')) {
				expect(checkbox).toBeDisabled();
			}
			const reasons = view.getAllByTestId('skill-source-skill-reason').map((r) => r.textContent);
			expect(reasons).toEqual([
				'Over the size limits in SKILL.md',
				'A skill named taken already exists in Global.',
				'n8n cannot read this repository. It is private or does not exist.',
			]);
			expect(list).not.toHaveTextContent('raw');
			expect(view.getByTestId('skill-source-select-all')).toBeDisabled();
		});

		it('selects and clears every skill of a tab with select all', async () => {
			skillsStore.discoverSource.mockResolvedValue(discovery({ skills }));
			const view = render();
			await review(view);
			expect(view.getByTestId('skill-source-import')).toHaveTextContent(
				'Import 2 skills to Global',
			);

			await userEvent.click(tab(view, 'Passed'));
			await userEvent.click(view.getByTestId('skill-source-select-all'));

			expect(view.getByTestId('skill-source-import')).toHaveTextContent('Import 1 skill to Global');

			await userEvent.click(view.getByTestId('skill-source-select-all'));

			expect(view.getByTestId('skill-source-import')).toHaveTextContent(
				'Import 2 skills to Global',
			);
		});

		it('finds skills in the tab by name, description or folder', async () => {
			const more = discovered({ key: 'skills/seo', location: 'skills/seo', name: 'seo' });
			skillsStore.discoverSource.mockResolvedValue(discovery({ skills: [passed, more] }));
			const view = render();
			await review(view);

			await userEvent.type(view.getByTestId('skill-source-search'), 'tools');

			expect(rows(view)).toEqual(['tools/lint']);
		});

		it('groups the skills by folder, with a checkbox for each group', async () => {
			const pdf = discovered({ key: 'skills/pdf', location: 'skills/pdf', name: 'pdf' });
			const docx = discovered({ key: 'skills/docx', location: 'skills/docx', name: 'docx' });
			skillsStore.discoverSource.mockResolvedValue(discovery({ skills: [pdf, passed, docx] }));
			const view = render();
			await review(view);

			const groups = view.getAllByTestId('skill-source-group');
			expect(groups.map((group) => group.dataset.folder)).toEqual(['skills', 'tools']);

			await userEvent.click(within(groups[0]).getByTestId('skill-source-group-checkbox'));

			expect(view.getByTestId('skill-source-import')).toHaveTextContent('Import 1 skill to Global');
		});

		it('shows the skipped files, then each file with its path, a GitHub link and the marked findings', async () => {
			skillsStore.discoverSource.mockResolvedValue(discovery({ skills }));
			const view = render();
			await review(view);

			const pane = view.getByTestId('skill-source-preview');
			const skipped = within(pane).getAllByTestId('skill-source-skipped-file');
			expect(skipped.map((row) => row.textContent)).toEqual([
				'skills/hidden/scripts/run.sh · A file that n8n leaves out',
				'skills/hidden/references/data.md · A file that n8n cannot store, because it has a NUL character',
			]);
			const files = within(pane).getAllByTestId('skill-source-file');
			expect(
				files.map((file) => within(file).getByTestId('skill-source-file-path').textContent),
			).toEqual(['skills/hidden/SKILL.md', 'skills/hidden/references/tone.md']);
			expect(within(files[0]).getByRole('link')).toHaveAttribute(
				'href',
				'https://github.com/acme/skills/blob/main/skills/hidden/SKILL.md',
			);
			const mark = within(files[0]).getByTestId('skill-source-finding-mark');
			expect(mark).toHaveTextContent('⟦U+200B⟧');
			expect(mark).toHaveAttribute('title', 'Hidden Unicode characters');
			// Skipped files come before the content.
			expect(
				skipped[0].compareDocumentPosition(files[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		});

		it('marks the most severe finding where two findings mark the same text', async () => {
			const location = { line: 4, start: 0, end: 4 };
			const skill = discovered({
				previewFiles: [
					{ path: 'SKILL.md', text: '---\nname: n\ndescription: d\nnote: "x"\n---\n\nBody.' },
				],
				check: {
					verdict: 'needs_review',
					findings: [
						{ rule: 'new_url', severity: 'info', file: 'SKILL.md', detail: 'd', location },
						{
							rule: 'suspicious_phrase',
							severity: 'needs_review',
							file: 'SKILL.md',
							detail: 'd',
							location,
						},
					],
				},
			});
			skillsStore.discoverSource.mockResolvedValue(discovery({ skills: [skill] }));
			const view = render();
			await review(view);

			expect(view.getByTestId('skill-source-finding-mark')).toHaveAttribute(
				'title',
				'Text that can change what the agent does',
			);
		});

		it('lists a finding in a part of the skill that the preview leaves out above the files', async () => {
			const skill = discovered({
				previewTruncated: true,
				check: {
					verdict: 'needs_review',
					findings: [
						{
							rule: 'hidden_unicode',
							severity: 'needs_review',
							file: 'references/late.md',
							detail: 'd',
							location: { line: 1, start: 0, end: 8 },
						},
					],
				},
			});
			skillsStore.discoverSource.mockResolvedValue(discovery({ skills: [skill] }));
			const view = render();
			await review(view);

			expect(view.getByTestId('skill-source-unplaced-finding')).toHaveTextContent(
				'Hidden Unicode characters in references/late.md',
			);
		});

		it('lists a warning above the files when an earlier mark covers its text', async () => {
			const skill = discovered({
				previewFiles: [{ path: 'SKILL.md', text: 'See https://evil.example/a⟦U+200B⟧b now.' }],
				check: {
					verdict: 'needs_review',
					findings: [
						{
							rule: 'new_url',
							severity: 'info',
							file: 'SKILL.md',
							detail: 'd',
							location: { line: 1, start: 4, end: 36 },
						},
						{
							rule: 'hidden_unicode',
							severity: 'needs_review',
							file: 'SKILL.md',
							detail: 'd',
							location: { line: 1, start: 26, end: 34 },
						},
					],
				},
			});
			skillsStore.discoverSource.mockResolvedValue(discovery({ skills: [skill] }));
			const view = render();
			await review(view);

			expect(view.getByTestId('skill-source-unplaced-finding')).toHaveTextContent(
				'Hidden Unicode characters in SKILL.md',
			);
		});

		it('encodes each part of a file path in its GitHub link', async () => {
			const skill = discovered({
				previewFiles: [
					{ path: 'SKILL.md', text: 'Body.' },
					{ path: 'references/50% #1?.md', text: 'Notes.' },
				],
			});
			skillsStore.discoverSource.mockResolvedValue(discovery({ skills: [skill] }));
			const view = render();
			await review(view);

			const files = view.getAllByTestId('skill-source-file');
			expect(within(files[1]).getByRole('link')).toHaveAttribute(
				'href',
				'https://github.com/acme/skills/blob/main/skills/brand-voice/references/50%25%20%231%3F.md',
			);
		});

		it('shows the files of the skill that the user clicks', async () => {
			skillsStore.discoverSource.mockResolvedValue(discovery({ skills }));
			const view = render();
			await review(view);

			await userEvent.click(tab(view, 'Passed'));
			await userEvent.click(within(view.getByTestId('skill-source-skills')).getByText('lint'));

			expect(view.getByTestId('skill-source-preview')).toHaveTextContent('tools/lint/SKILL.md');
		});

		it('says when a skill is too large to show in full', async () => {
			skillsStore.discoverSource.mockResolvedValue(
				discovery({ skills: [discovered({ previewTruncated: true })] }),
			);
			const view = render();
			await review(view);

			expect(view.getByTestId('skill-source-preview-truncated')).toBeInTheDocument();
		});

		it('names the projects that also connect the repository in one muted line', async () => {
			skillsStore.discoverSource.mockResolvedValue(
				discovery({
					duplicate: { kind: 'warning', projects: [{ id: 'team-2', name: 'Sales' }] },
				}),
			);
			const view = render();
			await review(view);

			expect(view.getByTestId('skill-source-also-connected')).toHaveTextContent(
				'Also connected in Sales. Each scope gets its own skills and reviews.',
			);
		});

		it.each([
			{ overrides: { truncated: true }, testId: 'skill-source-truncated' },
			{ overrides: { tooDeep: 2 }, testId: 'skill-source-too-deep' },
		])('says when n8n does not list every skill ($testId)', async ({ overrides, testId }) => {
			skillsStore.discoverSource.mockResolvedValue(discovery(overrides));
			const view = render();
			await review(view);

			expect(view.getByTestId(testId)).toBeInTheDocument();
		});
	});

	describe('the import', () => {
		const flagged = discovered({
			key: 'skills/flagged',
			location: 'skills/flagged',
			name: 'flagged',
			check: {
				verdict: 'needs_review',
				findings: [
					{ rule: 'hidden_unicode', severity: 'needs_review', file: 'SKILL.md', detail: 'd' },
				],
			},
		});
		const response: SkillSourceConnectResponse = {
			sourceId: 'src-1',
			imported: [{ key: 'skills/brand-voice', skillId: 'skill-1', name: 'brand-voice' }],
			failed: [],
		};

		it('imports the ticked skills and names the count, the scope and the repository', async () => {
			skillsStore.discoverSource.mockResolvedValue(discovery());
			skillsStore.connectSource.mockResolvedValue(response);
			const view = render();
			await selectScope(view, 'project:team-1');
			await review(view);

			await userEvent.click(view.getByTestId('skill-source-import'));

			expect(skillsStore.connectSource).toHaveBeenCalledWith({
				url: 'https://github.com/acme/skills',
				scope: 'project',
				projectId: 'team-1',
				skillKeys: ['skills/brand-voice', 'skills/seo-check'],
			});
			expect(view.emitted('connected')).toEqual([
				[{ response, sourceLabel: 'acme/skills · main', scopeLabel: 'Marketing' }],
			]);
			expect(view.emitted('update:open')).toEqual([[false]]);
		});

		it('names the scope in the import button', async () => {
			skillsStore.discoverSource.mockResolvedValue(discovery());
			const view = render();
			await selectScope(view, 'project:team-1');
			await review(view);

			expect(view.getByTestId('skill-source-import')).toHaveTextContent(
				'Import 2 skills to Marketing',
			);
		});

		it('imports a skill that needs review only after "I have reviewed the warnings"', async () => {
			skillsStore.discoverSource.mockResolvedValue(discovery({ skills: [flagged] }));
			skillsStore.connectSource.mockResolvedValue(response);
			const view = render();
			await review(view);

			expect(view.getByTestId('skill-source-import')).toBeDisabled();

			await userEvent.click(view.getByText('I have reviewed the warnings'));
			await userEvent.click(view.getByTestId('skill-source-import'));

			expect(skillsStore.connectSource).toHaveBeenCalledWith(
				expect.objectContaining({
					skillKeys: ['skills/flagged'],
					reviewedSkillKeys: ['skills/flagged'],
				}),
			);
		});

		it('asks for no review when the user unticks every skill that needs it', async () => {
			skillsStore.discoverSource.mockResolvedValue(discovery({ skills: [flagged, discovered()] }));
			const view = render();
			await review(view);

			await userEvent.click(view.getByRole('checkbox', { name: 'flagged' }));

			expect(view.queryByTestId('skill-source-reviewed-warnings')).not.toBeInTheDocument();
			expect(view.getByTestId('skill-source-import')).toBeEnabled();
		});

		it('names a skill that could not come in by its name in the list', async () => {
			const unnamed = discovered({ key: 'skills/odd', location: 'skills/odd', name: 'odd' });
			skillsStore.discoverSource.mockResolvedValue(discovery({ skills: [discovered(), unnamed] }));
			skillsStore.connectSource.mockResolvedValue({
				...response,
				failed: [{ key: 'skills/odd', name: null, reason: 'blocked_by_check' }],
			});
			const view = render();
			await review(view);

			await userEvent.click(view.getByTestId('skill-source-import'));

			expect(view.emitted('connected')).toMatchObject([
				[
					{
						response: { failed: [{ key: 'skills/odd', name: 'odd', reason: 'blocked_by_check' }] },
					},
				],
			]);
		});

		it('stays open with a translated toast when the import fails', async () => {
			skillsStore.discoverSource.mockResolvedValue(discovery());
			skillsStore.connectSource.mockRejectedValue(
				new ResponseError('raw', { meta: { reason: 'duplicate_source' } }),
			);
			const view = render();
			await review(view);

			await userEvent.click(view.getByTestId('skill-source-import'));

			expect(showErrorMock).toHaveBeenCalledWith(
				new Error('This source is already connected in this scope.'),
				'Could not add the skills',
			);
			expect(view.emitted('update:open')).toBeUndefined();
		});

		it('shows translated text, not the server message, when the import fails without a reason', async () => {
			skillsStore.discoverSource.mockResolvedValue(discovery());
			skillsStore.connectSource.mockRejectedValue(
				new Error('duplicate key value violates unique constraint "PK_skill"'),
			);
			const view = render();
			await review(view);

			await userEvent.click(view.getByTestId('skill-source-import'));

			expect(showErrorMock).toHaveBeenCalledWith(
				new Error(
					'n8n cannot add the skills. Try again. If the import fails again, ask your admin to check the n8n logs.',
				),
				'Could not add the skills',
			);
		});

		it('goes back to the form with the repository kept', async () => {
			skillsStore.discoverSource.mockResolvedValue(discovery());
			const view = render();
			await review(view);

			await userEvent.click(view.getByTestId('skill-source-back'));

			expect(view.getByTestId('repository-value')).toHaveTextContent(
				'https://github.com/acme/skills',
			);
			expect(view.getByTestId('skill-source-next')).toBeEnabled();
		});
	});

	describe('credentials', () => {
		it('names the project in the credential hint of a project scope', async () => {
			const view = render();

			await selectScope(view, 'project:team-1');

			expect(view.getByTestId('skill-source-credential-hint')).toHaveTextContent(
				'Only credentials that Marketing owns or that are shared with it.',
			);
		});

		it.each([
			{ option: '+ Connect a new GitHub account', type: 'githubApi' },
			{ option: '+ Connect a GitHub App installation', type: 'githubAppApi' },
		])('opens the credential modal for "$option"', async ({ option, type }) => {
			const view = render();

			await selectCredential(view, option);

			expect(uiStore.openNewCredential).toHaveBeenCalledWith(
				type,
				false,
				false,
				'personal-1',
				undefined,
				undefined,
				undefined,
				expect.objectContaining({ closeOnSave: true }),
			);
		});

		it('picks a credential that the user created from the dialog, and lists its repositories', async () => {
			skillsStore.fetchSourceRepositories.mockResolvedValue(REPOSITORIES);
			const view = render();
			await selectCredential(view, '+ Connect a new GitHub account');
			const { onCredentialCreated } = uiStore.openNewCredential.mock.calls[0][7] ?? {};
			skillsStore.fetchSourceCredentials.mockResolvedValue([TOKEN]);

			onCredentialCreated?.({ id: 'cred-1' } as never);

			await waitFor(() =>
				expect(view.getByTestId('skill-source-credential-select')).toHaveValue('cred-1'),
			);
			expect(await view.findByTestId('skill-source-credential-created')).toBeInTheDocument();
			expect(await view.findAllByTestId('repository-option')).toHaveLength(3);
		});

		it('does not offer a new credential in a project where the user cannot create one', async () => {
			const view = render([{ value: 'project:team-2', label: 'Sales', icon: 'layers' }]);
			const select = view.getByTestId('skill-source-credential-select');

			await waitFor(() => expect(skillsStore.fetchSourceCredentials).toHaveBeenCalled());

			expect(within(select).queryByText('+ Connect a new GitHub account')).not.toBeInTheDocument();
		});

		it('says when the credentials cannot load', async () => {
			skillsStore.fetchSourceCredentials.mockRejectedValue(new Error('boom'));
			render();

			await waitFor(() =>
				expect(showErrorMock).toHaveBeenCalledWith(
					expect.any(Error),
					'Could not load the credentials',
				),
			);
		});

		it('offers OAuth2 with a note on its write access, and opens the credential modal for it', async () => {
			const view = render();

			expect(
				await view.findByText(
					'Gives n8n write access to your repositories and admin access to your organizations',
				),
			).toBeInTheDocument();
			await selectCredential(view, '+ Sign in with GitHub');

			expect(uiStore.openNewCredential).toHaveBeenCalledWith(
				'githubOAuth2Api',
				false,
				false,
				'personal-1',
				undefined,
				undefined,
				undefined,
				expect.objectContaining({ closeOnSave: true }),
			);
		});

		it('signs in with GitHub in one step when the instance has a managed GitHub OAuth2 app', async () => {
			oauth.canOAuthCredentialQuickConnect.mockReturnValue(true);
			oauth.createAndAuthorize.mockImplementation(async () => {
				skillsStore.fetchSourceCredentials.mockResolvedValue([OAUTH]);
				return { id: OAUTH.id };
			});
			const view = render();

			await selectCredential(view, '+ Sign in with GitHub');

			expect(oauth.createAndAuthorize).toHaveBeenCalledWith('githubOAuth2Api', undefined, {
				projectId: 'personal-1',
			});
			expect(uiStore.openNewCredential).not.toHaveBeenCalled();
			await waitFor(() =>
				expect(view.getByTestId('skill-source-credential-select')).toHaveValue(OAUTH.id),
			);
			expect(view.getByTestId('skill-source-oauth-warning')).toBeInTheDocument();
		});

		it('reloads nothing when the user closes the GitHub sign-in', async () => {
			oauth.canOAuthCredentialQuickConnect.mockReturnValue(true);
			oauth.createAndAuthorize.mockResolvedValue(null);
			const view = render();
			await waitFor(() => expect(skillsStore.fetchSourceCredentials).toHaveBeenCalledTimes(1));

			await selectCredential(view, '+ Sign in with GitHub');

			await waitFor(() => expect(oauth.createAndAuthorize).toHaveBeenCalled());
			expect(skillsStore.fetchSourceCredentials).toHaveBeenCalledTimes(1);
			expect(view.queryByTestId('skill-source-credential-created')).not.toBeInTheDocument();
		});

		it('warns about write access while an OAuth2 credential is picked', async () => {
			skillsStore.fetchSourceCredentials.mockResolvedValue([TOKEN, OAUTH]);
			const view = render();

			await selectCredential(view, 'Ada account');
			expect(view.getByTestId('skill-source-oauth-warning')).toHaveTextContent(
				'This GitHub sign-in gives n8n write access to every repository that the account can reach, and admin access to its organizations',
			);

			await selectCredential(view, 'Ada token');
			expect(view.queryByTestId('skill-source-oauth-warning')).not.toBeInTheDocument();
		});

		it('says why the credential cannot list the repositories', async () => {
			skillsStore.fetchSourceCredentials.mockResolvedValue([TOKEN]);
			skillsStore.fetchSourceRepositories.mockRejectedValue(
				new ResponseError('raw', { meta: { reason: 'credential_invalid' } }),
			);
			const view = render();

			await selectCredential(view, 'Ada token');

			expect(await view.findByTestId('skill-source-link-error')).toHaveTextContent(
				'GitHub rejected this credential. The token is wrong or has expired.',
			);
		});
	});
});
