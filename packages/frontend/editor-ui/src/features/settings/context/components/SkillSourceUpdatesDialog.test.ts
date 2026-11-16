import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import userEvent from '@testing-library/user-event';
import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { SkillPendingUpdate, SkillSourceListItem } from '@n8n/api-types';
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
	vi.mocked(store.fetchSourceUpdate).mockRejectedValue(new Error('Unavailable'));
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
	expect(store.fetchSourceUpdate).not.toHaveBeenCalled();
	expect(view.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();
	for (const checkbox of view.getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
	expect(view.getByTestId('skill-source-skills')).toHaveTextContent(
		'An agent that follows this skill already uses another skill with a name like "agent-clash"',
	);
	expect(view.getByTestId('skill-source-skills')).not.toHaveTextContent('Links to a new domain');
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
	const view = render();
	await view.findByTestId('skill-source-file');
	await userEvent.click(view.getByTestId('skill-updates-accept'));
	expect(showMessage).toHaveBeenCalledWith({
		type: 'success',
		dangerouslyUseHTMLString: false,
		title: 'Updated 1 skill',
		message: `${message} Published agents keep their pinned versions until you publish again.`,
	});
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
