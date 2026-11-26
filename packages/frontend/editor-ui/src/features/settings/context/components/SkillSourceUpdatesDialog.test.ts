import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import userEvent from '@testing-library/user-event';
import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { SkillNewUpdate, SkillPendingUpdate, SkillSourceListItem } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { useSkillsStore } from '../skills.store';
import SkillSourceUpdatesDialog from './SkillSourceUpdatesDialog.vue';

const { showMessage } = vi.hoisted(() => ({ showMessage: vi.fn() }));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage }) }));
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
	updatesAvailable: 2,
	updatesBlocked: 0,
	newSkillsAvailable: 0,
};
const update = (
	skillId: string,
	verdict: SkillPendingUpdate['check']['verdict'] = 'pass',
): SkillPendingUpdate => ({
	skillId,
	name: skillId,
	location: `skills/${skillId}`,
	webUrl: `https://github.com/acme/skills/tree/abc/skills/${skillId}`,
	revision: 'abc',
	revisionUrl: 'https://github.com/acme/skills/commit/abc',
	contentHash: 'a'.repeat(64),
	baseVersionId: 'v1',
	check: {
		verdict,
		findings:
			verdict === 'needs_review'
				? [
						{
							rule: 'new_url',
							severity: 'needs_review',
							file: 'SKILL.md',
							location: { line: 2, start: 0, end: 3 },
							detail: '',
							domain: 'example.com',
						},
					]
				: [],
	},
	nameClash: null,
	changes: { added: 1, removed: 1 },
	nextVersion: 2,
});
const renderDialog = createComponentRenderer(SkillSourceUpdatesDialog);
let store: ReturnType<typeof useSkillsStore>;
let pinia: ReturnType<typeof createTestingPinia>;
beforeEach(() => {
	showMessage.mockClear();
	pinia = createTestingPinia();
	store = useSkillsStore(pinia);
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [update('docx')],
		commit: null,
	});
	vi.mocked(store.fetchSourceUpdate).mockResolvedValue({
		files: [{ path: 'SKILL.md', before: 'Old\nline', after: 'New\nurl' }],
		agents: [],
		hiddenAgentCount: 0,
	});
	vi.mocked(store.fetchSourceCommit).mockResolvedValue({
		revision: 'abc',
		webUrl: 'https://github.com/acme/skills/commit/abc',
		message: 'Update skills',
		author: 'Alex',
		date: null,
	});
	vi.mocked(store.acceptSourceUpdates).mockResolvedValue({
		updatedCount: 1,
		agents: [],
		hiddenAgentCount: 0,
	});
});
const render = () => renderDialog({ props: { source }, pinia });

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

it('shows new skills unchecked and imports only the selected new skill', async () => {
	const skill = newSkill();
	const unchecked = newSkill({ key: JSON.stringify({ path: 'skills/xlsx' }), name: 'xlsx' });
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [],
		newSkills: [skill, unchecked],
		commit: null,
	});
	vi.mocked(store.acceptSourceUpdates).mockResolvedValue({
		updatedCount: 0,
		importedCount: 1,
		agents: [],
		hiddenAgentCount: 0,
	});
	const view = render();
	const checkbox = await view.findByRole('checkbox', { name: 'pdf' });
	expect(checkbox).not.toBeChecked();
	expect(view.getByRole('checkbox', { name: 'xlsx' })).not.toBeChecked();
	for (const badge of view.getAllByTestId('skill-update-new'))
		expect(badge).toHaveTextContent('New');
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();
	expect(store.fetchSourceUpdate).not.toHaveBeenCalled();
	await userEvent.click(checkbox);
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
});

it.each(['all', 'group'])(
	'excludes new skills from %s selection without import permission',
	async (selection) => {
		const existing = update('docx');
		const other = { ...update('xlsx'), location: 'other/xlsx' };
		vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
			updates: [existing, other],
			newSkills: [newSkill()],
			commit: null,
		});
		const view = renderDialog({ props: { source: { ...source, canImport: false } }, pinia });
		expect(await view.findByRole('checkbox', { name: 'docx' })).toBeChecked();
		expect(view.getByRole('tab', { name: 'Passed (2)' })).toBeVisible();
		expect(view.queryByRole('checkbox', { name: 'pdf' })).toBeNull();
		await userEvent.click(view.getByRole('tab', { name: 'Blocked (1)' }));
		expect(view.getByRole('checkbox', { name: 'pdf' })).toBeDisabled();
		expect(view.getByTestId('skill-source-skill-reason')).toHaveTextContent(
			"You don't have permission to import skills into this scope",
		);
		await userEvent.click(view.getByRole('tab', { name: 'Passed (2)' }));
		const toggle =
			selection === 'all'
				? view.getByTestId('skill-source-select-all')
				: view.getByRole('checkbox', { name: 'skills' });
		await userEvent.click(toggle);
		await userEvent.click(toggle);
		await userEvent.click(view.getByRole('tab', { name: 'Blocked (1)' }));
		expect(view.getByRole('checkbox', { name: 'pdf' })).not.toBeChecked();
		await userEvent.click(view.getByTestId('skill-updates-accept'));
		expect(store.acceptSourceUpdates).toHaveBeenCalledWith(source.id, {
			updates: [existing, other].map(({ skillId, contentHash, baseVersionId }) => ({
				skillId,
				contentHash,
				baseVersionId,
			})),
			newSkills: [],
			skippedNewSkills: [],
			reviewedWarnings: false,
		});
	},
);

it('keeps new skills reviewable without import permission', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [],
		newSkills: [newSkill()],
		commit: null,
	});
	const view = renderDialog({ props: { source: { ...source, canImport: false } }, pinia });
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
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [update('docx')],
		newSkills: [skill],
		commit: null,
	});
	const view = renderDialog({ props: { source: { ...source, canImport } }, pinia });
	await userEvent.click(await view.findByRole('tab', { name: 'Blocked (1)' }));
	await userEvent.click(view.getByRole('button', { name: 'Search skills' }));
	await userEvent.type(view.getByRole('textbox', { name: 'Search skills' }), 'pdf');
	const review = view.getByTestId('skill-source-review');
	await userEvent.click(view.getByTestId('skill-new-hide'));
	expect(view.getByTestId('skill-new-hide')).toBeDisabled();
	save.resolve({ updatedCount: 0, agents: [], hiddenAgentCount: 0 });
	await flushPromises();
	expect(view.getByTestId('skill-source-review')).toBe(review);
	expect(view.getByRole('tab', { name: 'Blocked (1)' })).toHaveAttribute('aria-selected', 'true');
	expect(view.getByRole('textbox', { name: 'Search skills' })).toHaveValue('pdf');
	expect(view.getByTestId('skill-new-hide')).toBeDisabled();
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
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [],
		newSkills: [skill],
		commit: null,
	});
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
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [],
		newSkills: [newSkill()],
		commit: null,
	});
	vi.mocked(store.acceptSourceUpdates).mockRejectedValueOnce(
		new ResponseError('Server error', { httpStatusCode: 500 }),
	);
	const view = render();
	const checkbox = await view.findByRole('checkbox', { name: 'pdf' });
	await userEvent.click(checkbox);

	await userEvent.click(view.getByTestId('skill-new-hide'));
	await flushPromises();

	expect(view.getByTestId('skill-updates-error')).toHaveTextContent(
		'Could not load or save these updates. Try again.',
	);
	expect(showMessage).not.toHaveBeenCalled();
	expect(view.getByTestId('skill-new-hide')).toBeEnabled();
	expect(view.getByTestId('skill-new-hide')).toHaveTextContent('Remove from new count');
	expect(view.getByRole('checkbox', { name: 'pdf' })).toBeChecked();
	expect(store.fetchSourceUpdates).toHaveBeenCalledTimes(1);
	expect(view.emitted().changed).toBeUndefined();
});

it('reports agent impact when new skills and updates are accepted together', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [update('docx')],
		newSkills: [newSkill()],
		commit: null,
	});
	vi.mocked(store.acceptSourceUpdates).mockResolvedValue({
		updatedCount: 1,
		importedCount: 1,
		agents: [{ id: 'agent-1', name: 'Support' }],
		hiddenAgentCount: 0,
	});
	const view = render();
	await userEvent.click(await view.findByRole('checkbox', { name: 'pdf' }));
	await userEvent.click(view.getByTestId('skill-updates-accept'));
	expect(showMessage).toHaveBeenCalledWith({
		type: 'success',
		dangerouslyUseHTMLString: false,
		title: 'Imported 1 skill; Updated 1 skill',
		message:
			'Agent drafts that follow these skills will use the updates: Support. Published agents keep their pinned versions until you publish again.',
	});
});

it('says why new skills did not load and keeps stored updates reviewable', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [update('docx')],
		newSkills: [],
		newSkillsError: { reason: 'unreachable' },
		commit: null,
	});
	const view = render();
	expect(await view.findByRole('checkbox', { name: 'docx' })).toBeChecked();
	expect(view.getByTestId('skill-updates-new-error')).toHaveTextContent(
		'n8n could not load the new skills of this source. You can still review the stored updates. n8n cannot reach GitHub. Try again later.',
	);
	expect(view.getByTestId('skill-updates-accept')).toBeEnabled();
});

it('shows no load warning when new skills load', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [],
		newSkills: [newSkill()],
		commit: null,
	});
	const view = render();
	await view.findByRole('checkbox', { name: 'pdf' });
	expect(view.queryByTestId('skill-updates-new-error')).toBeNull();
});

it('finds a new skill by its description', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [update('docx')],
		newSkills: [newSkill()],
		commit: null,
	});
	const view = render();
	await view.findByRole('checkbox', { name: 'pdf' });
	await userEvent.click(view.getByTestId('skill-source-search-toggle'));
	await userEvent.type(view.getByRole('textbox', { name: 'Search skills' }), 'PDF files');
	await waitFor(() => expect(view.queryByRole('checkbox', { name: 'docx' })).toBeNull());
	expect(view.getByRole('checkbox', { name: 'pdf' })).toBeVisible();
});

it('never enables a blocked new skill', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [],
		newSkills: [newSkill({ check: { verdict: 'blocked', findings: [] } })],
		commit: null,
	});
	const view = render();
	expect(await view.findByRole('checkbox', { name: 'pdf' })).toBeDisabled();
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

it('requires acknowledgment of selected warnings and marks their changed lines', async () => {
	const warningUpdate = update('docx', 'needs_review');
	warningUpdate.check.findings.push(
		{ rule: 'hidden_unicode', severity: 'needs_review', file: 'SKILL.md', detail: '' },
		{ rule: 'file_skipped', severity: 'info', file: 'scripts/run.sh', detail: '' },
	);
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [warningUpdate],
		commit: null,
	});
	const view = render();
	await view.findByTestId('skill-source-finding-mark');
	const warnings = view.getByRole('button', { name: '2 warnings' });
	expect(warnings).toHaveTextContent('2');
	expect(view.getByTestId('skill-source-skills')).not.toHaveTextContent('Links to a new domain');
	await userEvent.hover(warnings);
	const tooltip = await view.findByTestId('tooltip-content');
	expect(tooltip).toHaveTextContent('Links to a new domain in SKILL.md');
	expect(tooltip).toHaveTextContent('Hidden Unicode characters in SKILL.md');
	expect(tooltip).toHaveTextContent('Links to example.com');
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();
	await userEvent.click(view.getByTestId('skill-update-reviewed-warnings'));
	expect(view.getByTestId('skill-updates-accept')).toBeEnabled();
	await userEvent.click(view.getByTestId('skill-updates-accept'));
	expect(store.acceptSourceUpdates).toHaveBeenCalledWith(
		'source-1',
		expect.objectContaining({ reviewedWarnings: true }),
	);
});

it('shows empty added and removed files and only links files in the new revision', async () => {
	vi.mocked(store.fetchSourceUpdate).mockResolvedValue({
		files: [
			{ path: 'references/added.md', before: '', after: '', status: 'added' },
			{ path: 'references/removed.md', before: '', after: '', status: 'removed' },
		],
		agents: [],
		hiddenAgentCount: 0,
	});
	const view = render();
	await view.findByText('Added');
	expect(view.getByText('Removed')).toBeVisible();
	expect(view.getAllByRole('link', { name: 'Open in GitHub' })).toHaveLength(1);
	expect(view.getByRole('link', { name: 'Open in GitHub' })).toHaveAttribute(
		'href',
		'https://github.com/acme/skills/blob/abc/skills/docx/references/added.md',
	);
});

it('accepts only checked updates and disables acceptance when none are selected', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [update('first'), update('later')],
		commit: null,
	});
	const view = render();
	await view.findByText('Update skills');
	const first = await view.findByRole('checkbox', { name: 'first' });
	expect(store.fetchSourceUpdate).toHaveBeenCalledWith('source-1', 'first', {
		contentHash: 'a'.repeat(64),
		baseVersionId: 'v1',
	});
	const later = view.getByRole('checkbox', { name: 'later' });
	const accept = view.getByTestId('skill-updates-accept');
	expect(view.queryByRole('button', { name: 'Skip this update' })).not.toBeInTheDocument();
	await userEvent.click(first);
	await userEvent.click(later);
	expect(accept).toBeDisabled();
	expect(store.acceptSourceUpdates).not.toHaveBeenCalled();
	await userEvent.click(first);
	expect(accept).toHaveTextContent('Update 1 skill');
	await userEvent.click(accept);
	expect(store.acceptSourceUpdates).toHaveBeenCalledWith('source-1', {
		updates: [{ skillId: 'first', contentHash: 'a'.repeat(64), baseVersionId: 'v1' }],
		newSkills: [],
		skippedNewSkills: [],
		reviewedWarnings: false,
	});
	await waitFor(() => expect(view.emitted().close).toHaveLength(1));
});

it('keeps review usable when commit metadata fails', async () => {
	vi.mocked(store.fetchSourceCommit).mockRejectedValue(new Error('Unavailable'));
	const view = render();
	await view.findByTestId('skill-source-file');
	expect(view.getByTestId('skill-updates-accept')).toBeEnabled();
	expect(view.getByRole('link', { name: 'abc' })).toHaveAttribute(
		'href',
		'https://github.com/acme/skills/commit/abc',
	);
});

it('does not select blocked updates or name clashes', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [
			update('blocked', 'blocked'),
			{ ...update('taken'), nameClash: { name: 'taken', where: 'scope' } },
			{
				...update('agent-clash', 'needs_review'),
				nameClash: { name: 'agent-clash', where: 'agent' },
			},
		],
		commit: null,
	});
	const view = render();
	await view.findByTestId('skill-update-blocked');
	await flushPromises();
	expect(view.getByTestId('skill-source-file-diff')).toBeVisible();
	expect(view.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();
	for (const checkbox of view.getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
	expect(view.getByTestId('skill-source-skills')).toHaveTextContent(
		'An agent that follows this skill already uses another skill with a name like "agent-clash"',
	);
	expect(view.getByTestId('skill-source-skills')).not.toHaveTextContent('Links to a new domain');
});

it('keeps the findings of a blocked update above the error when its files do not load', async () => {
	const blocked = update('docx', 'blocked');
	blocked.check.findings = [
		{
			rule: 'over_limit',
			severity: 'blocked',
			file: 'SKILL.md',
			detail: '',
			limit: { field: 'instructions', max: 65536, current: 70000 },
		},
	];
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({ updates: [blocked], commit: null });
	vi.mocked(store.fetchSourceUpdate)
		.mockRejectedValueOnce(new ResponseError('Server error', { httpStatusCode: 500 }))
		.mockResolvedValue({
			files: [{ path: 'SKILL.md', before: 'Old', after: 'New' }],
			agents: [],
			hiddenAgentCount: 0,
		});
	const view = render();

	const error = await view.findByTestId('skill-update-detail-error');

	expect(error).toHaveTextContent('Could not load or save these updates. Try again.');
	const notice = view.getByTestId('skill-source-findings');
	expect(notice).toHaveTextContent('Over the size limits in SKILL.md');
	expect(notice).toHaveTextContent(
		'The instructions can have at most 65536 characters. They have 70000.',
	);
	expect(notice.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	expect(view.queryByTestId('skill-source-file')).not.toBeInTheDocument();

	await userEvent.click(view.getByRole('button', { name: 'Retry' }));

	expect(await view.findByTestId('skill-source-file-diff')).toBeVisible();
	expect(view.queryByTestId('skill-update-detail-error')).not.toBeInTheDocument();
	expect(view.getByTestId('skill-source-findings')).toBeVisible();
});

it('does not write when the dialog closes', async () => {
	const view = render();
	await view.findByTestId('skill-source-file');
	await userEvent.click(view.getByRole('button', { name: 'Cancel' }));
	expect(view.emitted().close).toHaveLength(1);
	expect(store.acceptSourceUpdates).not.toHaveBeenCalled();
});

it('preserves the selection after a stale accept and clears the warning acknowledgment', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValueOnce({
		updates: [update('docx', 'needs_review'), update('later')],
		commit: null,
	});
	const latest = { ...update('docx', 'needs_review'), contentHash: 'b'.repeat(64) };
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [latest, update('later'), update('new')],
		commit: null,
	});
	vi.mocked(store.acceptSourceUpdates).mockRejectedValueOnce(
		new ResponseError('Changed', { httpStatusCode: 409, meta: { reason: 'stale' } }),
	);
	const view = render();
	await view.findByTestId('skill-update-reviewed-warnings');
	await userEvent.click(view.getByRole('tab', { name: 'Passed (1)' }));
	await userEvent.click(view.getByRole('checkbox', { name: 'later' }));
	await userEvent.click(view.getByTestId('skill-update-reviewed-warnings'));
	expect(view.getByTestId('skill-updates-accept')).toHaveTextContent('Update 1 skill');
	await userEvent.click(view.getByTestId('skill-updates-accept'));
	await waitFor(() => expect(store.fetchSourceUpdates).toHaveBeenCalledTimes(2));
	await flushPromises();
	expect(view.getByRole('checkbox', { name: 'docx' })).toBeChecked();
	expect(view.getByTestId('skill-update-reviewed-warnings')).not.toBeChecked();
	expect(view.getByTestId('skill-update-reviewed-warnings')).toBeEnabled();
	expect(view.getByTestId('skill-updates-accept')).toHaveTextContent('Update 1 skill');
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();
	expect(view.getByTestId('skill-updates-error')).toHaveTextContent(
		'No selected updates were applied',
	);
	expect(view.emitted().close).toBeUndefined();
	await userEvent.click(view.getByRole('tab', { name: 'Passed (2)' }));
	expect(view.getByRole('checkbox', { name: 'later' })).not.toBeChecked();
	expect(view.getByRole('checkbox', { name: 'new' })).not.toBeChecked();
	await userEvent.click(view.getByTestId('skill-update-reviewed-warnings'));
	await userEvent.click(view.getByTestId('skill-updates-accept'));
	expect(store.acceptSourceUpdates).toHaveBeenLastCalledWith('source-1', {
		updates: [{ skillId: 'docx', contentHash: latest.contentHash, baseVersionId: 'v1' }],
		newSkills: [],
		skippedNewSkills: [],
		reviewedWarnings: true,
	});
});

it('ignores a late diff after the reviewer selects another skill', async () => {
	const pending = createDeferredPromise<Awaited<ReturnType<typeof store.fetchSourceUpdate>>>();
	const metadata = createDeferredPromise<Awaited<ReturnType<typeof store.fetchSourceCommit>>>();
	vi.mocked(store.fetchSourceCommit).mockReturnValue(metadata.promise);
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [update('first'), update('second')],
		commit: null,
	});
	vi.mocked(store.fetchSourceUpdate).mockImplementationOnce(async () => await pending.promise);
	const view = render();
	await view.findByText('first');
	await userEvent.click(view.getByText('second'));
	await view.findByTestId('skill-source-file');
	pending.resolve({
		files: [{ path: 'late.md', before: '', after: 'Late content' }],
		agents: [],
		hiddenAgentCount: 0,
	});
	await pending.promise;
	await flushPromises();
	expect(view.getByTestId('skill-source-file')).toHaveTextContent('SKILL.md');
	expect(view.queryByText('Late content')).not.toBeInTheDocument();
	metadata.resolve({
		revision: 'abc',
		webUrl: null,
		message: 'Shared commit',
		author: 'Alex',
		date: null,
	});
	await view.findByText('Shared commit');
	expect(store.fetchSourceCommit).toHaveBeenCalledTimes(1);
});

it.each([
	{ agents: [], hiddenAgentCount: 0, message: 'No agents follow these skills yet.' },
	{
		agents: [{ id: 'a', name: '<b>Support</b>' }],
		hiddenAgentCount: 0,
		message: 'Agent drafts that follow these skills will use the updates: <b>Support</b>.',
	},
	{ agents: [], hiddenAgentCount: 1, message: '1 other agent draft will use the updates.' },
	{
		agents: [{ id: 'a', name: 'Support' }],
		hiddenAgentCount: 2,
		message:
			'Agent drafts that follow these skills will use the updates: Support. 2 other agent drafts will use the updates.',
	},
])('reports the accepted updates with $message', async ({ agents, hiddenAgentCount, message }) => {
	vi.mocked(store.acceptSourceUpdates).mockResolvedValue({
		updatedCount: 1,
		agents,
		hiddenAgentCount,
	});
	vi.mocked(store.fetchSourceUpdate).mockResolvedValue({
		files: [{ path: 'SKILL.md', before: 'Old', after: 'New' }],
		agents,
		hiddenAgentCount,
	});
	const view = render();
	const file = await view.findByTestId('skill-source-file');
	const impact = view.getByTestId('skill-update-impact');
	expect(impact).toHaveTextContent(message);
	expect(file.compareDocumentPosition(impact) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	expect(view.queryByText('docx · v2 after update')).not.toBeInTheDocument();
	await userEvent.click(view.getByTestId('skill-updates-accept'));
	expect(showMessage).toHaveBeenCalledWith({
		type: 'success',
		dangerouslyUseHTMLString: false,
		title: 'Updated 1 skill',
		message: `${message} Published agents keep their pinned versions until you publish again.`,
	});
});

it('shows a bounded preview and source link for an oversized blocked update', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [update('docx', 'blocked')],
		commit: null,
	});
	vi.mocked(store.fetchSourceUpdate).mockResolvedValue({
		files: [],
		preview: {
			previewFiles: [{ path: 'SKILL.md', text: 'Read this line.' }],
			previewTruncated: true,
		},
		agents: [],
		hiddenAgentCount: 0,
	});
	const view = render();
	expect(await view.findByTestId('skill-source-file')).toHaveTextContent('Read this line.');
	expect(view.getByTestId('skill-source-preview-truncated')).toBeVisible();
	expect(view.queryByTestId('skill-source-file-diff')).not.toBeInTheDocument();
	expect(view.getByRole('link', { name: 'Open in GitHub' })).toHaveAttribute(
		'href',
		'https://github.com/acme/skills/blob/abc/skills/docx/SKILL.md',
	);
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();
});

it('requires a new acknowledgment when another warning skill is selected', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [update('first', 'needs_review'), update('second', 'needs_review')],
		commit: null,
	});
	const view = render();
	const second = await view.findByRole('checkbox', { name: 'second' });
	await userEvent.click(second);
	await userEvent.click(view.getByTestId('skill-update-reviewed-warnings'));
	expect(view.getByTestId('skill-updates-accept')).toBeEnabled();
	await userEvent.click(second);
	expect(view.getByTestId('skill-update-reviewed-warnings')).not.toBeChecked();
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();
});

it('keeps only the selected, still acceptable updates after a stale preview', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValueOnce({
		updates: [update('first'), update('later'), update('blocked'), update('removed')],
		commit: null,
	});
	const view = render();
	await view.findByTestId('skill-source-file');
	await userEvent.click(view.getByRole('checkbox', { name: 'later' }));
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [update('first'), update('later'), update('blocked', 'blocked'), update('new')],
		commit: null,
	});
	vi.mocked(store.fetchSourceUpdate).mockRejectedValueOnce(
		new ResponseError('Changed', { httpStatusCode: 409, meta: { reason: 'stale' } }),
	);
	await userEvent.click(view.getByText('later', { exact: true }));
	await waitFor(() => expect(store.fetchSourceUpdates).toHaveBeenCalledTimes(2));
	await view.findByRole('checkbox', { name: 'new' });
	await view.findByTestId('skill-source-file');
	expect(view.getByRole('checkbox', { name: 'first' })).toBeChecked();
	expect(view.getByRole('checkbox', { name: 'later' })).not.toBeChecked();
	expect(view.getByRole('checkbox', { name: 'new' })).not.toBeChecked();
	expect(view.queryByRole('checkbox', { name: 'removed' })).not.toBeInTheDocument();
	expect(view.getByTestId('skill-updates-accept')).toHaveTextContent('Update 1 skill');
	await userEvent.click(view.getByRole('tab', { name: 'Blocked (1)' }));
	expect(view.getByRole('checkbox', { name: 'blocked' })).not.toBeChecked();
	expect(view.getByRole('checkbox', { name: 'blocked' })).toBeDisabled();
	expect(view.getByTestId('skill-updates-error')).toHaveTextContent(
		'The updates changed while you were reviewing them',
	);
});
