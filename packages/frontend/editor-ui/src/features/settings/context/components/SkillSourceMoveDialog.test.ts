import { createTestingPinia } from '@pinia/testing';
import type { SkillSourceListItem, SkillSourceMovePreview } from '@n8n/api-types';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/vue';
import { ResponseError } from '@n8n/rest-api-client';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useSkillsStore } from '../skills.store';
import SkillSourceMoveDialog from './SkillSourceMoveDialog.vue';

vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: ({ query }: { query: { skillId: string } }) => ({
			href: `/settings/context/skills?skillId=${query.skillId}`,
		}),
	}),
}));
vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	return {
		...actual,
		N8nDialog: { props: ['open'], template: '<div v-if="open" role="dialog"><slot /></div>' },
	};
});

const source: SkillSourceListItem = {
	id: 'source-1',
	type: 'github',
	label: 'acme/skills',
	ref: 'main',
	path: '',
	webUrl: 'https://github.com/acme/skills',
	projectId: 'origin',
	projectName: 'Origin',
	projectType: 'team',
	projectIcon: null,
	skillCount: 2,
	updatesAvailable: 0,
	updatesBlocked: 0,
	health: 'connected',
	lastCheckedAt: null,
	canReview: true,
	canDelete: true,
	canMove: true,
};
const clearPreview = (): SkillSourceMovePreview => ({
	skillCount: 2,
	canMove: true,
	nameConflicts: [],
	usageConflicts: [],
	duplicate: { kind: 'none' },
	credential: { required: false, reason: null },
});
const conflictPreview = (): SkillSourceMovePreview => ({
	...clearPreview(),
	canMove: false,
	nameConflicts: [
		{ moving: { id: 'incoming-1', name: 'PDF' }, existing: { id: 'existing-1', name: 'pdf' } },
		{ moving: { id: 'incoming-2', name: 'DOCX' }, existing: { id: 'existing-2', name: 'docx' } },
	],
});
const render = createComponentRenderer(SkillSourceMoveDialog, {
	props: {
		open: true,
		source,
		scopeOptions: [
			{ value: 'project:origin', label: 'Origin', icon: 'layers' },
			{ value: 'project:target', label: 'Target', icon: 'layers' },
			{ value: 'instance', label: 'Global', icon: 'globe' },
		],
	},
});

function setup() {
	const pinia = createTestingPinia();
	const store = mockedStore(useSkillsStore);
	store.fetchSourceCredentials.mockResolvedValue([
		{ id: 'credential-1', name: 'GitHub', type: 'githubApi' },
	]);
	store.previewSourceMove.mockResolvedValue(clearPreview());
	store.moveSource.mockResolvedValue(undefined);
	return { store, ...render({ pinia }) };
}

it('checks the destination before a required credential is selected', async () => {
	const view = setup();
	view.store.previewSourceMove.mockResolvedValue({
		...conflictPreview(),
		credential: { required: true, reason: 'credential_missing' },
	});
	await select(view, 'source-move-scope', 'Target');
	await waitFor(() =>
		expect(view.store.previewSourceMove).toHaveBeenCalledWith('source-1', {
			scope: 'project',
			projectId: 'target',
			fromProjectId: 'origin',
		}),
	);
	expect(
		await view.findByText(
			'This source uses a credential. Select a credential that the destination can use.',
		),
	).toBeVisible();
	expect(view.getAllByTestId('source-move-existing-skill')).toHaveLength(2);
	expect(view.getByTestId('source-move-submit')).toBeDisabled();
});

it('links each existing skill in another tab and keeps selections when the user returns', async () => {
	const view = setup();
	view.store.previewSourceMove.mockResolvedValue(conflictPreview());
	await select(view, 'source-move-scope', 'Target');
	await waitFor(() =>
		expect(view.getByTestId('source-move-credential')).not.toHaveAttribute('data-disabled'),
	);
	await select(view, 'source-move-credential', 'GitHub');
	const links = await view.findAllByTestId('source-move-existing-skill');
	expect(links[0]).toHaveAttribute('href', '/settings/context/skills?skillId=existing-1');
	expect(links[0]).toHaveAttribute('target', '_blank');
	expect(links[1]).toHaveTextContent('docx');
	view.store.previewSourceMove.mockResolvedValue(clearPreview());
	await fireEvent(window, new Event('focus'));
	await waitFor(() => expect(view.getByTestId('source-move-submit')).toBeEnabled());
	expect(view.getByTestId('source-move-scope')).toHaveTextContent('Target');
	expect(view.getByTestId('source-move-credential')).toHaveTextContent('GitHub');
});

it('drops a preview for an earlier destination', async () => {
	const view = setup();
	const old = Promise.withResolvers<SkillSourceMovePreview>();
	view.store.previewSourceMove.mockReturnValueOnce(old.promise).mockResolvedValue(clearPreview());
	await select(view, 'source-move-scope', 'Target');
	expect(view.getByTestId('source-move-submit')).toBeDisabled();
	await select(view, 'source-move-scope', 'Global');
	await waitFor(() => expect(view.getByTestId('source-move-submit')).toBeEnabled());
	old.resolve(conflictPreview());
	await old.promise;
	expect(view.queryByTestId('source-move-name-conflicts')).not.toBeInTheDocument();
});

it('shows name and agent blockers together', async () => {
	const view = setup();
	view.store.previewSourceMove.mockResolvedValue({
		...conflictPreview(),
		usageConflicts: [
			{
				skill: { id: 'incoming-1', name: 'PDF' },
				agents: [{ id: 'a', name: 'Support agent' }],
				hiddenAgents: 1,
			},
		],
	});
	await select(view, 'source-move-scope', 'Target');
	expect(await view.findByTestId('source-move-name-conflicts')).toBeVisible();
	expect(view.getByTestId('source-move-agent-conflicts')).toHaveTextContent('Support agent');
	expect(view.getByTestId('source-move-agent-conflicts')).toHaveTextContent(
		'1 agent you cannot view',
	);
});

it('refreshes blockers after a rejected submission without closing the dialog', async () => {
	const view = setup();
	await select(view, 'source-move-scope', 'Target');
	await waitFor(() => expect(view.getByTestId('source-move-submit')).toBeEnabled());
	view.store.moveSource.mockRejectedValueOnce(new Error('Destination changed'));
	view.store.previewSourceMove.mockResolvedValue(conflictPreview());
	await userEvent.click(view.getByTestId('source-move-submit'));
	expect(await view.findByTestId('source-move-name-conflicts')).toBeVisible();
	expect(view.getByTestId('source-move-scope')).toHaveTextContent('Target');
	expect(view.emitted('moved')).toBeUndefined();
});

it('emits success only after the move completes', async () => {
	const view = setup();
	const moved = Promise.withResolvers<void>();
	view.store.moveSource.mockReturnValue(moved.promise);
	await select(view, 'source-move-scope', 'Global');
	await waitFor(() => expect(view.getByTestId('source-move-submit')).toBeEnabled());
	await userEvent.click(view.getByTestId('source-move-submit'));
	expect(view.store.moveSource).toHaveBeenCalledWith('source-1', {
		scope: 'instance',
		fromProjectId: 'origin',
	});
	expect(view.emitted('moved')).toBeUndefined();
	moved.resolve();
	await waitFor(() => expect(view.emitted('moved')).toEqual([['source-1']]));
	expect(view.emitted('update:open')).toEqual([[false]]);
});

async function select(view: ReturnType<typeof setup>, testId: string, label: string) {
	await userEvent.click(view.getByTestId(testId));
	await userEvent.click(await view.findByRole('option', { name: label, exact: true }));
}

it('names both select triggers and focuses them when their labels are clicked', async () => {
	const view = setup();
	const scope = view.getByTestId('source-move-scope');
	expect(scope).toHaveAccessibleName('Who can use these skills');
	await userEvent.click(view.getByText('Who can use these skills', { exact: true }));
	expect(scope).toHaveFocus();
	await select(view, 'source-move-scope', 'Target');
	const credential = view.getByTestId('source-move-credential');
	expect(credential).toHaveAccessibleName('GitHub credential');
	await waitFor(() => expect(view.getByTestId('source-move-submit')).toBeEnabled());
	await waitFor(() => expect(credential).not.toHaveAttribute('data-disabled'));
	await fireEvent.click(view.getByText('GitHub credential', { exact: true }));
	await waitFor(() => expect(view.getByTestId('source-move-credential')).toHaveFocus());
});

it.each(['pending', 'failed'] as const)(
	'permits a move without credentials when the optional picker request is %s',
	async (state) => {
		const view = setup();
		view.store.fetchSourceCredentials.mockImplementation(
			() =>
				new Promise((_, reject) => {
					if (state === 'failed') reject(new Error('Unavailable'));
				}),
		);
		await select(view, 'source-move-scope', 'Target');
		await waitFor(() => expect(view.getByTestId('source-move-submit')).toBeEnabled());
		await userEvent.click(view.getByTestId('source-move-submit'));
		await waitFor(() => expect(view.emitted('moved')).toEqual([['source-1']]));
	},
);

it('keeps the blocker details returned by a rejected move without another request', async () => {
	const view = setup();
	await select(view, 'source-move-scope', 'Target');
	await waitFor(() => expect(view.getByTestId('source-move-submit')).toBeEnabled());
	view.store.moveSource.mockRejectedValueOnce(
		new ResponseError('Destination changed', {
			httpStatusCode: 409,
			meta: { preview: conflictPreview() },
		}),
	);
	view.store.previewSourceMove.mockRejectedValue(new Error('Unavailable'));
	await userEvent.click(view.getByTestId('source-move-submit'));
	expect(await view.findAllByTestId('source-move-existing-skill')).toHaveLength(2);
	expect(view.store.previewSourceMove).toHaveBeenCalledTimes(1);
	expect(view.getByTestId('source-move-scope')).toHaveTextContent('Target');
	expect(view.getByTestId('source-move-submit')).toBeDisabled();
});

it('sends the destination credential in both preview and move', async () => {
	const view = setup();
	await select(view, 'source-move-scope', 'Target');
	await waitFor(() =>
		expect(view.getByTestId('source-move-credential')).not.toHaveAttribute('data-disabled'),
	);
	await select(view, 'source-move-credential', 'GitHub');
	const payload = {
		scope: 'project',
		projectId: 'target',
		fromProjectId: 'origin',
		credentialId: 'credential-1',
	};
	await waitFor(() =>
		expect(view.store.previewSourceMove).toHaveBeenLastCalledWith('source-1', payload),
	);
	await waitFor(() => expect(view.getByTestId('source-move-submit')).toBeEnabled());
	await userEvent.click(view.getByTestId('source-move-submit'));
	expect(view.store.moveSource).toHaveBeenCalledWith('source-1', payload);
});

it.each([
	[
		'global',
		'This repository is already connected in Global. Resolve the duplicate source before moving this one.',
	],
	['scope', 'This repository is already connected in the destination. Choose another scope.'],
] as const)('shows a duplicate in %s and blocks submission', async (where, message) => {
	const view = setup();
	view.store.previewSourceMove.mockResolvedValue({
		...clearPreview(),
		canMove: false,
		duplicate: { kind: 'blocked', where, sourceId: 'other-source' },
	});
	await select(view, 'source-move-scope', 'Target');
	expect(await view.findByText(message)).toBeVisible();
	expect(view.getByTestId('source-move-submit')).toBeDisabled();
});
