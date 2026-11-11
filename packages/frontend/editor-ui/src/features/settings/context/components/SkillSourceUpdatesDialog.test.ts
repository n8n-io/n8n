import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { SkillPendingUpdate, SkillSourceListItem } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { useSkillsStore } from '../skills.store';
import SkillSourceUpdatesDialog from './SkillSourceUpdatesDialog.vue';

vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showMessage: vi.fn() }) }));
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

it('loads a stored diff and accepts exactly the reviewed hash and base version', async () => {
	const view = render();
	await view.findByText('Update skills');
	await waitFor(() =>
		expect(store.fetchSourceUpdate).toHaveBeenCalledWith('source-1', 'docx', {
			contentHash: 'a'.repeat(64),
			baseVersionId: 'v1',
		}),
	);
	await userEvent.click(view.getByTestId('skill-updates-accept'));
	expect(store.acceptSourceUpdates).toHaveBeenCalledWith('source-1', {
		updates: [{ skillId: 'docx', contentHash: 'a'.repeat(64), baseVersionId: 'v1' }],
		reviewedWarnings: false,
	});
	await waitFor(() => expect(view.emitted().close).toHaveLength(1));
});

it('requires acknowledgment of selected warnings and marks their changed lines', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [update('docx', 'needs_review')],
		commit: null,
	});
	const view = render();
	await view.findByTestId('skill-source-finding-mark');
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

it('skips immediately and reloads without accepting another update', async () => {
	const view = render();
	const skip = await view.findByTestId('skill-update-skip');
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({ updates: [], commit: null });
	await userEvent.click(skip);
	await view.findByText('There are no updates to review.');
	expect(store.skipSourceUpdate).toHaveBeenCalledWith('source-1', 'docx', 'a'.repeat(64));
	expect(store.acceptSourceUpdates).not.toHaveBeenCalled();
	expect(view.emitted().changed).toHaveLength(1);
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
		],
		commit: null,
	});
	const view = render();
	await view.findByTestId('skill-update-blocked');
	expect(view.getByTestId('skill-updates-accept')).toBeDisabled();
	for (const checkbox of view.getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
});

it('does not write when the dialog closes', async () => {
	const view = render();
	await view.findByTestId('skill-source-file');
	await userEvent.click(view.getByRole('button', { name: 'Cancel' }));
	expect(view.emitted().close).toHaveLength(1);
	expect(store.acceptSourceUpdates).not.toHaveBeenCalled();
	expect(store.skipSourceUpdate).not.toHaveBeenCalled();
});

it('reloads the selection after a stale accept and clears the warning acknowledgment', async () => {
	vi.mocked(store.fetchSourceUpdates).mockResolvedValue({
		updates: [update('docx', 'needs_review')],
		commit: null,
	});
	vi.mocked(store.acceptSourceUpdates).mockRejectedValue(
		new ResponseError('Changed', { httpStatusCode: 409, meta: { reason: 'stale' } }),
	);
	const view = render();
	await view.findByTestId('skill-update-reviewed-warnings');
	await userEvent.click(view.getByTestId('skill-update-reviewed-warnings'));
	await userEvent.click(view.getByTestId('skill-updates-accept'));
	await waitFor(() => expect(store.fetchSourceUpdates).toHaveBeenCalledTimes(2));
	await waitFor(() => expect(view.getByTestId('skill-updates-accept')).toBeDisabled());
	expect(view.getByTestId('skill-updates-error')).toHaveTextContent(
		'No selected updates were applied',
	);
	expect(view.emitted().close).toBeUndefined();
});

it('ignores a late diff after the reviewer selects another skill', async () => {
	const pending = createDeferredPromise<Awaited<ReturnType<typeof store.fetchSourceUpdate>>>();
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
	expect(view.queryByText('Late content')).not.toBeInTheDocument();
});
