import type { SkillSourceListItem } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import SkillSourceDeleteDialog from './SkillSourceDeleteDialog.vue';
import { useSkillsStore } from '../skills.store';

const showError = vi.fn();
const showMessage = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));

vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	return {
		...actual,
		N8nDialog: {
			props: ['open', 'header'],
			template: '<div role="dialog"><h2>{{ header }}</h2><slot /></div>',
		},
	};
});

const source: SkillSourceListItem = {
	id: 'source-1',
	type: 'github',
	label: 'acme/skills',
	ref: 'main',
	path: '',
	webUrl: 'https://github.com/acme/skills/tree/main',
	projectId: null,
	projectName: null,
	projectType: null,
	projectIcon: null,
	skillCount: 2,
	updatesAvailable: 0,
	newSkillsAvailable: 0,
	updatesBlocked: 0,
	health: 'connected',
	lastCheckedAt: null,
	missingSkills: [],
	canReplaceCredential: false,
	canReview: true,
	canImport: true,
	canMove: true,
	canDelete: true,
};

const renderDialog = createComponentRenderer(SkillSourceDeleteDialog, {
	props: { source },
});

describe('SkillSourceDeleteDialog', () => {
	beforeEach(() => {
		createTestingPinia();
		vi.clearAllMocks();
	});

	it.each([0, 1, 2])(
		'names the source and %s skills, and explains that deletion is permanent',
		(count) => {
			const { getByRole } = renderDialog({ props: { source: { ...source, skillCount: count } } });
			const noun = count === 1 ? 'skill' : 'skills';
			expect(getByRole('dialog')).toHaveTextContent(`acme/skills and its ${count} synced ${noun}.`);
			expect(getByRole('dialog')).toHaveTextContent("This can't be undone.");
		},
	);

	it('cancels without deleting', async () => {
		const { getByRole, emitted } = renderDialog();
		await userEvent.click(getByRole('button', { name: 'Cancel' }));
		expect(mockedStore(useSkillsStore).deleteSource).not.toHaveBeenCalled();
		expect(emitted('close')).toEqual([[]]);
	});

	it('removes the source and keeps its skills when Stop syncing is selected', async () => {
		mockedStore(useSkillsStore).deleteSource.mockResolvedValue(undefined);
		const { getByRole, emitted } = renderDialog();
		expect(getByRole('dialog')).toHaveTextContent('keep its skills with their version history');
		expect(getByRole('dialog')).toHaveTextContent(
			'Agents can still use the skills. Users with edit access can edit them in n8n.',
		);
		expect(getByRole('dialog')).toHaveTextContent('GitHub updates stop.');
		await userEvent.click(getByRole('button', { name: 'Stop syncing' }));
		await waitFor(() => expect(emitted('deleted')).toEqual([[]]));
		expect(mockedStore(useSkillsStore).deleteSource).toHaveBeenCalledWith('source-1', {
			keepSkills: true,
		});
		expect(showMessage).toHaveBeenCalledWith({
			title: 'Source removed. Users with edit access can edit its skills in n8n.',
			type: 'success',
		});
	});

	it('offers only source deletion for an empty source', async () => {
		const { getByRole, queryByRole } = renderDialog({
			props: { source: { ...source, skillCount: 0 } },
		});
		expect(getByRole('button', { name: 'Delete source' })).toBeInTheDocument();
		expect(queryByRole('button', { name: 'Stop syncing' })).toBeNull();
	});

	it('disables removal without source delete permission', () => {
		const { getByRole } = renderDialog({ props: { source: { ...source, canDelete: false } } });
		expect(getByRole('button', { name: 'Delete skills' })).toBeDisabled();
		expect(getByRole('button', { name: 'Stop syncing' })).toBeDisabled();
	});

	it('deletes only after confirmation and reports success', async () => {
		const { getByRole, emitted } = renderDialog();
		expect(mockedStore(useSkillsStore).deleteSource).not.toHaveBeenCalled();
		await userEvent.click(getByRole('button', { name: 'Delete skills' }));
		await waitFor(() => expect(emitted('deleted')).toEqual([[]]));
		expect(mockedStore(useSkillsStore).deleteSource).toHaveBeenCalledWith('source-1');
		expect(showMessage).toHaveBeenCalledWith({
			title: 'Source and synced skills deleted',
			type: 'success',
		});
	});

	it('shows progress only on the action that runs', async () => {
		let finish = () => {};
		mockedStore(useSkillsStore).deleteSource.mockReturnValue(
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
		);
		const { getByRole, emitted } = renderDialog();
		await userEvent.click(getByRole('button', { name: 'Stop syncing' }));

		const keep = getByRole('button', { name: 'Stop syncing' });
		const destroy = getByRole('button', { name: 'Delete skills' });
		expect(keep).toHaveAttribute('aria-busy', 'true');
		expect(destroy).toBeDisabled();
		expect(destroy).not.toHaveAttribute('aria-busy', 'true');
		expect(getByRole('button', { name: 'Cancel' })).toBeDisabled();

		finish();
		await waitFor(() => expect(emitted('deleted')).toEqual([[]]));
	});

	it('lists blocking agents and still lets the user keep their skills', async () => {
		mockedStore(useSkillsStore).deleteSource.mockRejectedValue(
			new ResponseError('In use', {
				httpStatusCode: 409,
				meta: {
					reason: 'skills_in_use',
					agents: [
						{
							agentId: 'a1',
							agentName: 'Research agent',
							projectId: 'p1',
							projectName: 'Marketing',
						},
						{ agentId: 'a2', agentName: 'Sales agent', projectId: 'p2', projectName: 'Sales' },
					],
					hiddenAgents: 1,
				},
			}),
		);
		const { getByRole, queryByRole, emitted } = renderDialog();
		await userEvent.click(getByRole('button', { name: 'Delete skills' }));
		await waitFor(() => expect(getByRole('dialog')).toHaveTextContent("Can't delete source"));
		expect(getByRole('dialog')).toHaveTextContent('Research agent · Marketing');
		expect(getByRole('dialog')).toHaveTextContent('Sales agent · Sales');
		expect(getByRole('dialog')).toHaveTextContent('1 agent in other projects');
		expect(getByRole('dialog')).toHaveTextContent('Nothing was deleted.');
		expect(queryByRole('button', { name: 'Delete skills' })).toBeNull();
		expect(emitted('deleted')).toBeUndefined();
		expect(showMessage).not.toHaveBeenCalled();
		mockedStore(useSkillsStore).deleteSource.mockResolvedValue(undefined);
		await userEvent.click(getByRole('button', { name: 'Stop syncing' }));
		await waitFor(() => expect(emitted('deleted')).toEqual([[]]));
		expect(mockedStore(useSkillsStore).deleteSource).toHaveBeenLastCalledWith('source-1', {
			keepSkills: true,
		});
	});

	it('explains how to unblock deletion when all agents are in unreadable projects', async () => {
		mockedStore(useSkillsStore).deleteSource.mockRejectedValue(
			new ResponseError('In use', {
				httpStatusCode: 409,
				meta: { reason: 'skills_in_use', agents: [], hiddenAgents: 1 },
			}),
		);
		const { getByRole, queryByRole, emitted } = renderDialog();
		await userEvent.click(getByRole('button', { name: 'Delete skills' }));
		await waitFor(() =>
			expect(getByRole('dialog')).toHaveTextContent(
				"Ask a project admin to remove them from agents in projects you can't open.",
			),
		);
		expect(getByRole('dialog')).toHaveTextContent('1 agent in other projects');
		expect(getByRole('dialog')).toHaveTextContent('Nothing was deleted.');
		expect(queryByRole('button', { name: 'Delete skills' })).toBeNull();
		expect(emitted('deleted')).toBeUndefined();
		expect(emitted('close')).toBeUndefined();
	});

	it('keeps the dialog open when a request fails', async () => {
		const error = new ResponseError('Not allowed', { httpStatusCode: 403 });
		mockedStore(useSkillsStore).deleteSource.mockRejectedValue(error);
		const { getByRole, emitted } = renderDialog();
		await userEvent.click(getByRole('button', { name: 'Delete skills' }));
		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(error, 'Could not delete the source'),
		);
		expect(emitted('close')).toBeUndefined();
		expect(emitted('deleted')).toBeUndefined();
	});
});
