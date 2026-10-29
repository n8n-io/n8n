import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import type {
	DiscoveredSkill,
	SkillSourceConnectResponse,
	SkillSourceDiscovery,
} from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import userEvent from '@testing-library/user-event';
import { waitFor, within } from '@testing-library/vue';

import type { AgentSkillModalScopeOption } from '@/features/agents/components/AgentSkillModal.vue';

import SkillSourceConnectDialog from './SkillSourceConnectDialog.vue';
import { useSkillsStore } from '../skills.store';

const showErrorMock = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock, showMessage: vi.fn() }),
}));

// N8nDialog teleports out of the tree (Reka UI's DialogPortal), so replace it
// with a render-inline pass-through that keeps the open state and the header.
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
	return { ...actual, N8nDialog };
});

const SCOPES: AgentSkillModalScopeOption[] = [
	{ value: 'instance', label: 'Global', icon: 'globe' },
	{ value: 'project:personal-1', label: 'Personal project', icon: 'user' },
	{ value: 'project:team-1', label: 'Marketing', icon: 'layers' },
];

function discovered(overrides: Partial<DiscoveredSkill> = {}): DiscoveredSkill {
	return {
		key: 'skills/brand-voice',
		location: 'skills/brand-voice',
		name: 'brand-voice',
		description: 'Write clear customer-facing copy.',
		skippedFiles: [],
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

let skillsStore: MockedStore<typeof useSkillsStore>;

function render() {
	return renderDialog({ props: { open: true, scopeOptions: SCOPES } });
}

async function selectScope(view: ReturnType<typeof render>, label: string) {
	await userEvent.click(view.getByTestId('skill-source-scope-select'));
	await userEvent.click(await view.findByText(label));
}

async function pasteLink(view: ReturnType<typeof render>, link: string) {
	const field = view.getByTestId('skill-source-url-input');
	const input = field instanceof HTMLInputElement ? field : field.querySelector('input')!;
	await userEvent.type(input, link);
	await userEvent.click(view.getByTestId('skill-source-next'));
}

describe('SkillSourceConnectDialog', () => {
	beforeEach(() => {
		createTestingPinia();
		skillsStore = mockedStore(useSkillsStore);
		showErrorMock.mockClear();
	});

	it('starts on "Paste a GitHub link" with the first scope the user can create in', () => {
		const view = render();

		expect(view.getByTestId('dialog-title')).toHaveTextContent('Paste a GitHub link');
		expect(view.getByTestId('skill-source-scope-hint')).toHaveTextContent(
			'Every project can use the skills. Only admins manage Global. All skills from this source get this scope.',
		);
		expect(view.getByTestId('skill-source-next')).toBeDisabled();
	});

	it('reads the link, lets the user pick skills, and imports them', async () => {
		skillsStore.discoverSource.mockResolvedValue(discovery());
		const response = {
			sourceId: 'src-1',
			imported: [{ key: 'skills/brand-voice', skillId: 'k1', name: 'brand-voice' }],
			failed: [],
		};
		skillsStore.connectSource.mockResolvedValue(response);
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');

		expect(skillsStore.discoverSource).toHaveBeenCalledWith({
			url: 'https://github.com/acme/skills',
			scope: 'instance',
		});
		expect(await view.findByText('Choose skills')).toBeInTheDocument();
		expect(view.getByTestId('skill-source-summary')).toHaveTextContent('acme/skills · main');
		expect(view.getByTestId('skill-source-add')).toHaveTextContent('Add 2');

		// Unpick one skill: only the other is imported.
		const seo = view.getByTestId('skill-source-skill-skills/seo-check');
		await userEvent.click(within(seo).getByRole('checkbox'));
		expect(view.getByTestId('skill-source-add')).toHaveTextContent('Add 1');
		await userEvent.click(view.getByTestId('skill-source-add'));

		expect(skillsStore.connectSource).toHaveBeenCalledWith({
			url: 'https://github.com/acme/skills',
			scope: 'instance',
			skillKeys: ['skills/brand-voice'],
		});
		await waitFor(() =>
			expect(view.emitted('connected')).toEqual([
				[{ response, sourceLabel: 'acme/skills', scopeLabel: 'Global' }],
			]),
		);
		expect(view.emitted('update:open')).toEqual([[false]]);
	});

	it('sends the project of a project scope', async () => {
		skillsStore.discoverSource.mockResolvedValue(discovery());
		const view = renderDialog({
			props: { open: true, scopeOptions: [SCOPES[2]] },
		});

		expect(view.getByTestId('skill-source-scope-hint')).toHaveTextContent(
			'Members of Marketing can use the skills.',
		);
		await pasteLink(view, 'https://github.com/acme/skills/tree/main/skills');

		expect(skillsStore.discoverSource).toHaveBeenCalledWith({
			url: 'https://github.com/acme/skills/tree/main/skills',
			scope: 'project',
			projectId: 'team-1',
		});
	});

	it('sends a repository link with a query or a fragment to the server', async () => {
		skillsStore.discoverSource.mockResolvedValue(discovery());
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills?tab=readme-ov-file#skills');

		expect(skillsStore.discoverSource).toHaveBeenCalledWith({
			url: 'https://github.com/acme/skills?tab=readme-ov-file#skills',
			scope: 'instance',
		});
	});

	it.each([
		{
			link: 'https://gitlab.com/acme/skills',
			text: 'Only GitHub links work for now. Use https://github.com/owner/repo.',
		},
		{
			link: 'github.com/acme',
			text: 'This is not a GitHub repository link. Use https://github.com/owner/repo.',
		},
	])('refuses $link without asking the server', async ({ link, text }) => {
		const view = render();

		await pasteLink(view, link);

		expect(view.getByTestId('skill-source-link-error')).toHaveTextContent(text);
		expect(skillsStore.discoverSource).not.toHaveBeenCalled();
	});

	it.each([
		{
			name: 'an unreadable link',
			error: new ResponseError('Bad link', {
				httpStatusCode: 400,
				meta: { reason: 'invalid_url' },
			}),
			text: 'This is not a GitHub repository link. Use https://github.com/owner/repo.',
		},
		{
			name: 'a private or missing repository',
			error: new ResponseError('Repository not found', {
				httpStatusCode: 404,
				meta: { reason: 'not_found' },
			}),
			text: 'n8n cannot read this repository. It is private or does not exist.',
		},
		{
			name: 'a link while skill sync is off',
			error: new ResponseError('Not Found', { httpStatusCode: 404 }),
			text: 'Could not read the link',
		},
		{
			name: 'a link without skills',
			error: new ResponseError('No SKILL.md found in acme/skills', {
				httpStatusCode: 422,
				meta: { reason: 'no_skills_found' },
			}),
			text: 'n8n found no SKILL.md files at this link.',
		},
		{
			name: 'a link while GitHub limits the requests',
			error: new ResponseError('GitHub answered with status 403.', {
				httpStatusCode: 429,
				meta: { reason: 'rate_limited' },
			}),
			text: 'GitHub limits how often n8n can read it. Try again in a few minutes.',
		},
		{
			name: 'a link in a repository that is too large',
			error: new ResponseError('The repository is too large. Link to the folder.', {
				httpStatusCode: 422,
				meta: { reason: 'archive_too_large' },
			}),
			text: 'This repository is too large for n8n to read.',
		},
		{
			name: 'a link with a reason the editor does not know',
			error: new ResponseError('Something new', {
				httpStatusCode: 500,
				meta: { reason: 'something_new' },
			}),
			text: 'Could not read the link',
		},
		{
			name: 'a link to a missing branch',
			link: 'https://github.com/acme/skills/tree/no-such-branch/skills',
			error: new ResponseError('Branch not found', {
				httpStatusCode: 400,
				meta: { reason: 'invalid_url' },
			}),
			text: 'n8n cannot find this branch in the repository. Check the branch name in the link.',
		},
	])('says why it cannot read $name', async ({ error, text, link }) => {
		skillsStore.discoverSource.mockRejectedValue(error);
		const view = render();

		await pasteLink(view, link ?? 'https://github.com/acme/skills');

		const callout = await view.findByTestId('skill-source-link-error');
		expect(callout).toHaveTextContent(text);
		expect(callout).not.toHaveTextContent(error.message);
		expect(view.getByTestId('dialog-title')).toHaveTextContent('Paste a GitHub link');
	});

	it.each([
		{
			where: 'global' as const,
			scope: 'Global',
			text: 'acme/skills is already connected in Global. Every project can use its skills.',
		},
		{
			where: 'scope' as const,
			scope: 'Marketing',
			text: 'acme/skills is already connected in Marketing.',
		},
	])('blocks a source already connected in $where', async ({ where, scope, text }) => {
		skillsStore.discoverSource.mockResolvedValue(
			discovery({ duplicate: { kind: 'blocked', where, sourceId: null } }),
		);
		const view = render();
		if (scope !== 'Global') await selectScope(view, scope);

		await pasteLink(view, 'https://github.com/acme/skills');

		expect((await view.findByTestId('skill-source-duplicate')).textContent?.trim()).toBe(text);
		expect(view.getByTestId('dialog-title')).toHaveTextContent('Paste a GitHub link');
		expect(view.getByTestId('skill-source-next')).toBeDisabled();
	});

	it('warns about a source connected in other projects and lets the user go on', async () => {
		skillsStore.discoverSource.mockResolvedValue(
			discovery({
				duplicate: { kind: 'warning', projects: [{ id: 'team-2', name: 'Sales' }] },
			}),
		);
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');

		expect(await view.findByText('Choose skills')).toBeInTheDocument();
		expect(view.getByTestId('skill-source-duplicate')).toHaveTextContent(
			'acme/skills is also connected in Sales. You can connect it here too.',
		);
	});

	it('does not let the user pick a skill whose name is taken in the scope', async () => {
		skillsStore.discoverSource.mockResolvedValue(
			discovery({
				skills: [
					discovered(),
					discovered({
						key: 'skills/seo-check',
						location: 'skills/seo-check',
						name: 'seo-check',
						nameTaken: true,
					}),
				],
			}),
		);
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');

		const taken = await view.findByTestId('skill-source-skill-skills/seo-check');
		expect(within(taken).getByTestId('skill-source-skill-name-taken')).toHaveTextContent(
			'Name taken',
		);
		expect(within(taken).getByTestId('skill-source-skill-reason')).toHaveTextContent(
			'A skill named seo-check already exists in Global.',
		);
		expect(within(taken).getByRole('checkbox')).toBeDisabled();
		expect(view.getByTestId('skill-source-add')).toHaveTextContent('Add 1');
	});

	it('shows the security check of each skill, and does not let the user pick a blocked one', async () => {
		skillsStore.discoverSource.mockResolvedValue(
			discovery({
				skills: [
					discovered(),
					discovered({
						key: 'skills/web-scraper',
						location: 'skills/web-scraper',
						name: 'web-scraper',
						check: {
							verdict: 'needs_review',
							findings: [
								{
									rule: 'hidden_unicode',
									severity: 'needs_review',
									file: 'SKILL.md',
									detail: 'Server text',
								},
								{ rule: 'new_url', severity: 'info', file: 'SKILL.md', detail: 'Server text' },
							],
						},
					}),
					discovered({
						key: 'skills/shell-runner',
						location: 'skills/shell-runner',
						name: 'shell-runner',
						check: {
							verdict: 'blocked',
							findings: [
								{
									rule: 'over_limit',
									severity: 'blocked',
									file: 'references/big.md',
									detail: 'Server text',
								},
								{ rule: 'lossy_conversion', severity: 'needs_review', detail: 'Server text' },
							],
						},
					}),
				],
			}),
		);
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');

		const passed = await view.findByTestId('skill-source-skill-skills/brand-voice');
		expect(within(passed).getByTestId('skill-source-skill-check')).toHaveTextContent('Passed');
		expect(within(passed).queryByTestId('skill-source-skill-findings')).not.toBeInTheDocument();

		const review = view.getByTestId('skill-source-skill-skills/web-scraper');
		expect(within(review).getByTestId('skill-source-skill-check')).toHaveTextContent('Review');
		const reviewFindings = within(review).getByTestId('skill-source-skill-findings');
		expect(reviewFindings).toHaveTextContent('Hidden Unicode characters in SKILL.md');
		expect(reviewFindings).not.toHaveTextContent('domain');
		expect(reviewFindings).not.toHaveTextContent('Server text');
		expect(within(review).getByRole('checkbox')).not.toBeDisabled();

		const blocked = view.getByTestId('skill-source-skill-skills/shell-runner');
		expect(within(blocked).getByTestId('skill-source-skill-check')).toHaveTextContent('Blocked');
		expect(within(blocked).getByTestId('skill-source-skill-findings')).toHaveTextContent(
			'Over the size limits in references/big.md. Content that n8n cannot convert exactly',
		);
		expect(within(blocked).getByRole('checkbox')).toBeDisabled();
		expect(view.getByTestId('skill-source-add')).toHaveTextContent('Add 2');
	});

	it('imports a skill that needs review only after "I reviewed the warnings"', async () => {
		const review = discovered({
			key: 'skills/web-scraper',
			location: 'skills/web-scraper',
			name: 'web-scraper',
			check: {
				verdict: 'needs_review',
				findings: [
					{ rule: 'hidden_unicode', severity: 'needs_review', file: 'SKILL.md', detail: 'x' },
				],
			},
		});
		skillsStore.discoverSource.mockResolvedValue(discovery({ skills: [discovered(), review] }));
		skillsStore.connectSource.mockResolvedValue({ sourceId: 'src-1', imported: [], failed: [] });
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');

		const add = await view.findByTestId('skill-source-add');
		expect(add).toBeDisabled();
		await userEvent.click(view.getByRole('checkbox', { name: 'I reviewed the warnings' }));
		expect(add).not.toBeDisabled();
		await userEvent.click(add);

		expect(skillsStore.connectSource).toHaveBeenCalledWith({
			url: 'https://github.com/acme/skills',
			scope: 'instance',
			skillKeys: ['skills/brand-voice', 'skills/web-scraper'],
			reviewedWarnings: true,
		});
	});

	it('asks for no review when the user unpicks every skill that needs it', async () => {
		const review = discovered({
			key: 'skills/web-scraper',
			location: 'skills/web-scraper',
			name: 'web-scraper',
			check: {
				verdict: 'needs_review',
				findings: [
					{ rule: 'hidden_unicode', severity: 'needs_review', file: 'SKILL.md', detail: 'x' },
				],
			},
		});
		skillsStore.discoverSource.mockResolvedValue(discovery({ skills: [discovered(), review] }));
		skillsStore.connectSource.mockResolvedValue({ sourceId: 'src-1', imported: [], failed: [] });
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');

		const row = await view.findByTestId('skill-source-skill-skills/web-scraper');
		await userEvent.click(within(row).getByRole('checkbox'));
		expect(view.queryByTestId('skill-source-reviewed-warnings')).not.toBeInTheDocument();
		await userEvent.click(view.getByTestId('skill-source-add'));

		expect(skillsStore.connectSource).toHaveBeenCalledWith({
			url: 'https://github.com/acme/skills',
			scope: 'instance',
			skillKeys: ['skills/brand-voice'],
		});
	});

	it('says why n8n cannot read a skill in the list, without the server detail', async () => {
		skillsStore.discoverSource.mockResolvedValue(
			discovery({
				skills: [
					discovered(),
					discovered({
						key: 'skills/seo-check',
						location: 'skills/seo-check',
						name: null,
						description: null,
						error: {
							reason: 'parse_error',
							message: 'instructions: Instructions must be 65536 characters or fewer',
						},
					}),
				],
			}),
		);
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');

		const broken = await view.findByTestId('skill-source-skill-skills/seo-check');
		const reason = within(broken).getByTestId('skill-source-skill-reason');
		expect(reason).toHaveTextContent(
			'n8n cannot read this SKILL.md. Check its name and description.',
		);
		expect(reason).not.toHaveTextContent('65536');
		expect(within(broken).getByRole('checkbox')).toBeDisabled();
		expect(view.getByTestId('skill-source-add')).toHaveTextContent('Add 1');
	});

	it('says when n8n lists only the first skills of a source', async () => {
		skillsStore.discoverSource.mockResolvedValue(discovery({ truncated: true }));
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');

		expect(await view.findByTestId('skill-source-truncated')).toHaveTextContent(
			'This source has more than 200 skills. n8n lists the first 200. Link a folder to see the others.',
		);
	});

	it('says when some skills are nested deeper than n8n reads', async () => {
		skillsStore.discoverSource.mockResolvedValue(discovery({ tooDeep: 2 }));
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');

		expect(await view.findByTestId('skill-source-too-deep')).toHaveTextContent(
			'The skills are nested deeper than n8n reads. n8n reads SKILL.md files up to 8 folders deep.',
		);
	});

	it('does not show the truncated notice for a source that n8n lists in full', async () => {
		skillsStore.discoverSource.mockResolvedValue(discovery());
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');

		expect(await view.findByText('Choose skills')).toBeInTheDocument();
		expect(view.queryByTestId('skill-source-truncated')).not.toBeInTheDocument();
	});

	it('names the files the import skips for each skill', async () => {
		skillsStore.discoverSource.mockResolvedValue(
			discovery({
				skills: [
					discovered({ skippedFiles: ['scripts/run.py'] }),
					discovered({
						key: 'skills/seo-check',
						location: 'skills/seo-check',
						name: 'seo-check',
						skippedFiles: [
							'scripts/run.py',
							'assets/logo.png',
							'bin/tool',
							'data/a.bin',
							'data/b.bin',
						],
					}),
					discovered({ key: 'skills/plain', location: 'skills/plain', name: 'plain' }),
				],
			}),
		);
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');

		const one = await view.findByTestId('skill-source-skill-skills/brand-voice');
		expect(within(one).getByTestId('skill-source-skill-skipped')).toHaveTextContent(
			'Skips 1 file: scripts/run.py',
		);
		const many = view.getByTestId('skill-source-skill-skills/seo-check');
		expect(within(many).getByTestId('skill-source-skill-skipped')).toHaveTextContent(
			'Skips 5 files: scripts/run.py, assets/logo.png, bin/tool and 2 more',
		);
		const none = view.getByTestId('skill-source-skill-skills/plain');
		expect(within(none).queryByTestId('skill-source-skill-skipped')).not.toBeInTheDocument();
	});

	it('drops a discover answer when the user changed the scope while n8n read the link', async () => {
		let answer: (value: SkillSourceDiscovery) => void = () => {};
		skillsStore.discoverSource.mockReturnValue(
			new Promise<SkillSourceDiscovery>((resolve) => {
				answer = resolve;
			}),
		);
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');
		await selectScope(view, 'Marketing');
		answer(discovery({ duplicate: { kind: 'blocked', where: 'scope', sourceId: null } }));
		await new Promise(process.nextTick);

		expect(view.queryByTestId('skill-source-duplicate')).not.toBeInTheDocument();
		expect(view.getByTestId('dialog-title')).toHaveTextContent('Paste a GitHub link');
	});

	it('drops a discover answer when the dialog closed while n8n read the link', async () => {
		let answer: (value: SkillSourceDiscovery) => void = () => {};
		skillsStore.discoverSource.mockReturnValueOnce(
			new Promise<SkillSourceDiscovery>((resolve) => {
				answer = resolve;
			}),
		);
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');
		await view.rerender({ open: false });
		await view.rerender({ open: true });
		const field = view.getByTestId('skill-source-url-input');
		const input = field instanceof HTMLInputElement ? field : field.querySelector('input')!;
		await userEvent.type(input, 'https://github.com/acme/skills');
		answer(discovery());
		await new Promise(process.nextTick);

		expect(view.getByTestId('dialog-title')).toHaveTextContent('Paste a GitHub link');
		expect(view.getByTestId('skill-source-next')).toBeEnabled();
	});

	it('names a skill that could not come in by its name in the list', async () => {
		skillsStore.discoverSource.mockResolvedValue(discovery());
		const response = {
			sourceId: 'src-1',
			imported: [{ key: 'skills/brand-voice', skillId: 'k1', name: 'brand-voice' }],
			failed: [{ key: 'skills/seo-check', name: null, reason: 'parse_error' as const }],
		};
		skillsStore.connectSource.mockResolvedValue(response);
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');
		await userEvent.click(await view.findByTestId('skill-source-add'));

		await waitFor(() =>
			expect(view.emitted('connected')).toEqual([
				[
					{
						response: {
							...response,
							failed: [{ key: 'skills/seo-check', name: 'seo-check', reason: 'parse_error' }],
						},
						sourceLabel: 'acme/skills',
						scopeLabel: 'Global',
					},
				],
			]),
		);
	});

	it('stays open until the import answers', async () => {
		skillsStore.discoverSource.mockResolvedValue(discovery());
		let answer: (value: SkillSourceConnectResponse) => void = () => {};
		skillsStore.connectSource.mockReturnValue(
			new Promise<SkillSourceConnectResponse>((resolve) => {
				answer = resolve;
			}),
		);
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');
		await userEvent.click(await view.findByTestId('skill-source-add'));

		expect(view.getByTestId('skill-source-cancel')).toBeDisabled();
		expect(view.getByTestId('skill-source-back')).toBeDisabled();
		expect(view.emitted('update:open')).toBeUndefined();
		answer({ sourceId: 'src-1', imported: [], failed: [] });
		await waitFor(() => expect(view.emitted('update:open')).toEqual([[false]]));
	});

	it('keeps the dialog open and shows a toast when the import fails', async () => {
		skillsStore.discoverSource.mockResolvedValue(discovery());
		skillsStore.connectSource.mockRejectedValue(
			new ResponseError('Already connected', { httpStatusCode: 409 }),
		);
		const view = render();

		await pasteLink(view, 'https://github.com/acme/skills');
		await userEvent.click(await view.findByTestId('skill-source-add'));

		await waitFor(() =>
			expect(showErrorMock).toHaveBeenCalledWith(
				expect.any(ResponseError),
				'Could not add the skills',
			),
		);
		expect(view.emitted('update:open')).toBeUndefined();
	});
});
