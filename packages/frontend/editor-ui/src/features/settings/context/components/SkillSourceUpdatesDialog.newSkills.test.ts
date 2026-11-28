import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import userEvent from '@testing-library/user-event';
import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { SkillNewUpdate, SkillSourceListItem } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { useSkillsStore } from '@/features/settings/context/skills.store';
import SkillSourceUpdatesDialog from './SkillSourceUpdatesDialog.vue';

const { showMessage } = vi.hoisted(() => ({ showMessage: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage }) }));
// N8nDialog teleports out of the tree, so it renders inline here.
vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	return {
		...actual,
		N8nDialog: {
			props: ['open'],
			emits: ['update:open'],
			template: '<div v-if="open" role="dialog"><slot /></div>',
		},
		N8nDialogTitle: { template: '<h2><slot /></h2>' },
	};
});

const source: SkillSourceListItem = {
	id: 'source-1',
	type: 'github',
	label: 'acme/skills',
	webUrl: 'https://github.com/acme/skills',
	ref: 'main',
	projectId: null,
	projectName: null,
	projectType: null,
	projectIcon: null,
	canReview: true,
	canImport: true,
	canMove: true,
	canDelete: true,
	canReplaceCredential: false,
	missingSkills: [],
	health: 'connected',
	lastCheckedAt: null,
	path: '',
	skillCount: 2,
	updatesAvailable: 0,
	updatesBlocked: 0,
	newSkillsAvailable: 1,
};

const newSkill = (overrides: Partial<SkillNewUpdate> = {}): SkillNewUpdate => ({
	key: JSON.stringify({ path: 'skills/pdf' }),
	name: 'pdf',
	description: 'Read PDF files',
	location: 'skills/pdf',
	webUrl: 'https://github.com/acme/skills/tree/abc/skills/pdf',
	check: { verdict: 'pass', findings: [] },
	contentHash: 'b'.repeat(64),
	revision: 'abc',
	skipped: false,
	skippedFiles: [],
	previewFiles: [{ path: 'SKILL.md', text: 'Read PDF files.' }],
	previewTruncated: false,
	nameTaken: false,
	error: null,
	...overrides,
});
const xlsx = () =>
	newSkill({
		key: JSON.stringify({ path: 'skills/xlsx' }),
		name: 'xlsx',
		description: 'Edit spreadsheets',
		location: 'skills/xlsx',
		webUrl: 'https://github.com/acme/skills/tree/abc/skills/xlsx',
	});

// The review of updates, in the mode that imports the new skills of a connected source.
const renderDialog = createComponentRenderer(SkillSourceUpdatesDialog);
let store: ReturnType<typeof useSkillsStore>;
let pinia: ReturnType<typeof createTestingPinia>;
const render = (overrides: Partial<SkillSourceListItem> = {}) =>
	renderDialog({ props: { source: { ...source, ...overrides }, mode: 'new' }, pinia });
const offer = (...newSkills: SkillNewUpdate[]) =>
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({ updates: [], newSkills, commit: null });

beforeEach(() => {
	showMessage.mockClear();
	pinia = createTestingPinia();
	store = useSkillsStore(pinia);
	offer(newSkill());
	vi.mocked(store.acceptSourceUpdates).mockResolvedValue({
		updatedCount: 0,
		importedCount: 1,
		agents: [],
		hiddenAgentCount: 0,
	});
});

it('has the header of the import dialog: the title, the repository and the scope', async () => {
	const view = render();
	await view.findByRole('checkbox', { name: 'pdf' });
	expect(view.getByRole('heading', { name: 'Import skills' })).toBeVisible();
	expect(view.getByTestId('skill-source-summary')).toHaveTextContent('acme/skills · main');
	expect(view.getByTestId('skill-scope-badge')).toHaveTextContent('Global');
	expect(view.getByTestId('skill-source-new-skills-dialog')).toBeVisible();
	expect(view.queryByTestId('skill-update-commit')).toBeNull();
	expect(store.fetchSourceCommit).not.toHaveBeenCalled();
});

it('shows new skills unchecked and imports only the selected new skill', async () => {
	const skill = newSkill();
	offer(skill, xlsx());
	const view = render();
	const checkbox = await view.findByRole('checkbox', { name: 'pdf' });
	expect(checkbox).not.toBeChecked();
	expect(view.getByRole('checkbox', { name: 'xlsx' })).not.toBeChecked();
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();
	expect(store.fetchSourceUpdate).not.toHaveBeenCalled();

	await userEvent.click(checkbox);

	expect(view.getByTestId('skill-updates-accept')).toHaveTextContent('Import 1 skill to Global');
	await userEvent.click(view.getByTestId('skill-updates-accept'));
	expect(store.acceptSourceUpdates).toHaveBeenCalledWith(source.id, {
		updates: [],
		newSkills: [{ key: skill.key, contentHash: skill.contentHash }],
		skippedNewSkills: [],
		reviewedWarnings: false,
	});
	expect(showMessage).toHaveBeenCalledWith({
		type: 'success',
		dangerouslyUseHTMLString: false,
		title: 'Imported 1 skill',
		message: '',
	});
	expect(view.emitted().changed).toHaveLength(1);
	expect(view.emitted().close).toHaveLength(1);
});

it('names the project of the source in the import button', async () => {
	const view = render({ projectId: 'team-1', projectName: 'Marketing', projectType: 'team' });
	await userEvent.click(await view.findByRole('checkbox', { name: 'pdf' }));
	expect(view.getByTestId('skill-updates-accept')).toHaveTextContent('Import 1 skill to Marketing');
	expect(view.getByTestId('skill-scope-badge')).toHaveTextContent('Marketing');
});

it('does not list the updates of the source', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [
			{
				skillId: 'docx',
				name: 'docx',
				location: 'skills/docx',
				webUrl: 'https://github.com/acme/skills/tree/abc/skills/docx',
				revision: 'abc',
				revisionUrl: null,
				contentHash: 'a'.repeat(64),
				baseVersionId: 'v1',
				check: { verdict: 'pass', findings: [] },
				nameClash: null,
				changes: { added: 1, removed: 1 },
				nextVersion: 2,
			},
		],
		newSkills: [newSkill()],
		commit: null,
	});
	const view = render();
	await view.findByRole('checkbox', { name: 'pdf' });
	expect(view.queryByRole('checkbox', { name: 'docx' })).toBeNull();
	expect(view.getByRole('tab', { name: 'Passed (1)' })).toBeVisible();
});

it('imports a skill that needs review only after "I have reviewed the warnings"', async () => {
	const skill = newSkill({
		check: {
			verdict: 'needs_review',
			findings: [
				{
					rule: 'new_url',
					severity: 'needs_review',
					file: 'SKILL.md',
					location: { line: 1, start: 0, end: 4 },
					detail: '',
					domain: 'example.com',
				},
			],
		},
	});
	offer(skill);
	const view = render();
	await userEvent.click(await view.findByRole('checkbox', { name: 'pdf' }));
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();

	await userEvent.click(view.getByRole('checkbox', { name: 'I have reviewed the warnings' }));
	await userEvent.click(view.getByTestId('skill-updates-accept'));

	expect(store.acceptSourceUpdates).toHaveBeenCalledWith(
		source.id,
		expect.objectContaining({ reviewedWarnings: true }),
	);
});

it('keeps new skills reviewable without import permission', async () => {
	const view = render({ canImport: false });
	expect(await view.findByRole('checkbox', { name: 'pdf' })).toBeDisabled();
	expect(view.getByTestId('skill-source-select-all')).toBeDisabled();
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();
	expect(
		view.getAllByText("You don't have permission to import skills into this scope"),
	).toHaveLength(2);
	expect(view.getByTestId('skill-source-skill-reason')).toHaveTextContent(
		"You don't have permission to import skills into this scope",
	);
	expect(view.getByTestId('skill-source-file')).toHaveTextContent('SKILL.md');
	expect(view.getByTestId('skill-new-hide')).toBeEnabled();
});

it.each([true, false])('hides a new skill from the count with canImport=%s', async (canImport) => {
	const skill = newSkill({ check: { verdict: 'blocked', findings: [] } });
	const save = createDeferredPromise<Awaited<ReturnType<typeof store.acceptSourceUpdates>>>();
	vi.mocked(store.acceptSourceUpdates).mockReturnValue(save.promise);
	offer(skill, xlsx());
	const view = render({ canImport });
	await userEvent.click(
		await view.findByRole('tab', { name: canImport ? /Blocked \(1\)/ : /Blocked \(2\)/ }),
	);
	await userEvent.click(view.getByRole('button', { name: 'Search skills' }));
	await userEvent.type(view.getByRole('textbox', { name: 'Search skills' }), 'pdf');
	const review = view.getByTestId('skill-source-review');

	await userEvent.click(view.getByTestId('skill-new-hide'));

	expect(view.getByTestId('skill-new-hide')).toBeDisabled();
	save.resolve({ updatedCount: 0, agents: [], hiddenAgentCount: 0 });
	await flushPromises();
	expect(view.getByTestId('skill-source-review')).toBe(review);
	expect(view.getByRole('tab', { name: /Blocked/ })).toHaveAttribute('aria-selected', 'true');
	expect(view.getByRole('textbox', { name: 'Search skills' })).toHaveValue('pdf');
	expect(view.getByTestId('skill-new-hide')).toBeDisabled();
	expect(view.getByTestId('skill-new-hide')).toHaveTextContent('No longer counted as new');
	expect(store.fetchSourceUpdates).toHaveBeenCalledTimes(1);
	expect(store.acceptSourceUpdates).toHaveBeenCalledWith(source.id, {
		updates: [],
		newSkills: [],
		skippedNewSkills: [{ key: skill.key, contentHash: skill.contentHash }],
		reviewedWarnings: false,
	});
	expect(view.getByRole('checkbox', { name: 'pdf' })).toBeDisabled();
	expect(view.getByRole('checkbox', { name: 'pdf' })).not.toBeChecked();
	expect(view.getByTestId('skill-source-file')).toHaveTextContent('Read PDF files.');
	expect(view.emitted().close).toBeUndefined();
});

it('unchecks a selected new skill that the reviewer removes from the count, and confirms it', async () => {
	const skill = newSkill();
	offer(skill);
	const view = render();
	const checkbox = await view.findByRole('checkbox', { name: 'pdf' });
	await userEvent.click(checkbox);
	expect(checkbox).toBeChecked();

	await userEvent.click(view.getByTestId('skill-new-hide'));
	await flushPromises();

	expect(store.acceptSourceUpdates).toHaveBeenCalledWith(source.id, {
		updates: [],
		newSkills: [],
		skippedNewSkills: [{ key: skill.key, contentHash: skill.contentHash }],
		reviewedWarnings: false,
	});
	expect(view.getByRole('checkbox', { name: 'pdf' })).not.toBeChecked();
	expect(view.getByRole('checkbox', { name: 'pdf' })).toBeEnabled();
	expect(showMessage).toHaveBeenCalledWith({
		type: 'success',
		title: 'No longer counted as new',
	});
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();
	expect(store.fetchSourceUpdates).toHaveBeenCalledTimes(1);
	expect(view.emitted().changed).toHaveLength(1);
});

it('shows the error and lets the reviewer try again when the hide action fails', async () => {
	vi.mocked(store.acceptSourceUpdates).mockRejectedValueOnce(
		new ResponseError('Server error', { httpStatusCode: 500 }),
	);
	const view = render();
	const checkbox = await view.findByRole('checkbox', { name: 'pdf' });
	await userEvent.click(checkbox);

	await userEvent.click(view.getByTestId('skill-new-hide'));
	await flushPromises();

	const notice = view.getByTestId('skill-updates-error');
	expect(notice).toHaveTextContent("Couldn't load or import the new skills. Try again.");
	// The list is still there, so the notice needs no Retry.
	expect(within(notice).queryByRole('button', { name: 'Retry' })).toBeNull();
	expect(showMessage).not.toHaveBeenCalled();
	expect(view.getByTestId('skill-new-hide')).toBeEnabled();
	expect(view.getByTestId('skill-new-hide')).toHaveTextContent('Remove from new count');
	expect(view.getByRole('checkbox', { name: 'pdf' })).toBeChecked();
	expect(store.fetchSourceUpdates).toHaveBeenCalledTimes(1);
	expect(view.emitted().changed).toBeUndefined();
});

it('says why the new skills did not load, with Retry in the notice', async () => {
	vi.mocked(store.fetchSourceUpdates)
		.mockResolvedValueOnce({
			updates: [],
			newSkills: [],
			newSkillsError: { reason: 'unreachable' },
			commit: null,
		})
		.mockResolvedValue({ updates: [], newSkills: [newSkill()], commit: null });
	const view = render();
	const notice = await view.findByTestId('skill-updates-error');
	expect(notice).toHaveTextContent('n8n cannot reach GitHub. Try again later.');
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();

	await userEvent.click(within(notice).getByRole('button', { name: 'Retry' }));

	expect(await view.findByRole('checkbox', { name: 'pdf' })).toBeVisible();
	expect(view.queryByTestId('skill-updates-error')).toBeNull();
});

it('says when the source has no new skills', async () => {
	offer();
	const view = render();
	expect(await view.findByText('This source has no new skills.')).toBeVisible();
	expect(view.queryByTestId('skill-updates-error')).toBeNull();
	expect(view.queryByTestId('skill-source-review')).toBeNull();
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();
});

it('finds a new skill by its description', async () => {
	offer(newSkill(), xlsx());
	const view = render();
	await view.findByRole('checkbox', { name: 'pdf' });
	await userEvent.click(view.getByTestId('skill-source-search-toggle'));
	await userEvent.type(view.getByRole('textbox', { name: 'Search skills' }), 'PDF files');
	await waitFor(() => expect(view.queryByRole('checkbox', { name: 'xlsx' })).toBeNull());
	expect(view.getByRole('checkbox', { name: 'pdf' })).toBeVisible();
});

it.each([
	['a blocked check', { check: { verdict: 'blocked' as const, findings: [] } }],
	['no check result', { check: null }],
])('never enables a new skill with %s', async (_, overrides) => {
	offer(newSkill(overrides));
	const view = render();
	expect(await view.findByRole('checkbox', { name: 'pdf' })).toBeDisabled();
	expect(view.getByRole('tab', { name: 'Blocked (1)' })).toBeVisible();
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();
});

it('reloads new skills when their content changes before the hide action', async () => {
	const skill = newSkill();
	const changed = { ...skill, contentHash: 'c'.repeat(64) };
	vi.mocked(store.fetchSourceUpdates)
		.mockResolvedValueOnce({ updates: [], newSkills: [skill], commit: null })
		.mockResolvedValue({ updates: [], newSkills: [changed], commit: null });
	vi.mocked(store.acceptSourceUpdates).mockRejectedValueOnce(
		new ResponseError('Changed', { httpStatusCode: 409, meta: { reason: 'stale' } }),
	);
	const view = render();
	await view.findByRole('checkbox', { name: 'pdf' });
	await userEvent.click(view.getByTestId('skill-new-hide'));
	await waitFor(() => expect(store.fetchSourceUpdates).toHaveBeenCalledTimes(2));
	await waitFor(() => expect(view.getByTestId('skill-new-hide')).toBeEnabled());
	expect(view.getByRole('checkbox', { name: 'pdf' })).not.toBeChecked();
	await userEvent.click(view.getByTestId('skill-new-hide'));
	expect(store.acceptSourceUpdates).toHaveBeenLastCalledWith(
		source.id,
		expect.objectContaining({
			skippedNewSkills: [{ key: changed.key, contentHash: changed.contentHash }],
		}),
	);
});

it('stays open with the reason when the import fails', async () => {
	vi.mocked(store.acceptSourceUpdates).mockRejectedValueOnce(
		new ResponseError('Server error', { httpStatusCode: 500 }),
	);
	const view = render();
	await userEvent.click(await view.findByRole('checkbox', { name: 'pdf' }));

	await userEvent.click(view.getByTestId('skill-updates-accept'));
	await flushPromises();

	expect(view.getByTestId('skill-updates-error')).toHaveTextContent(
		"Couldn't load or import the new skills. Try again.",
	);
	expect(view.getByRole('checkbox', { name: 'pdf' })).toBeChecked();
	expect(view.emitted().close).toBeUndefined();
	expect(view.emitted().changed).toBeUndefined();
});

it('closes from Cancel without a write', async () => {
	const view = render();
	await view.findByRole('checkbox', { name: 'pdf' });

	await userEvent.click(view.getByRole('button', { name: 'Cancel' }));

	expect(view.emitted().close).toHaveLength(1);
	expect(store.acceptSourceUpdates).not.toHaveBeenCalled();
});
