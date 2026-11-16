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
	updatesBlocked: 0,
	health: 'connected',
	lastCheckedAt: null,
	missingSkills: [],
	canReplaceCredential: false,
	canReview: true,
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

	it('deletes only after confirmation and reports success', async () => {
		const { getByRole, emitted } = renderDialog();
		expect(mockedStore(useSkillsStore).deleteSource).not.toHaveBeenCalled();
		await userEvent.click(getByRole('button', { name: 'Delete source' }));
		await waitFor(() => expect(emitted('deleted')).toEqual([[]]));
		expect(mockedStore(useSkillsStore).deleteSource).toHaveBeenCalledWith('source-1');
		expect(showMessage).toHaveBeenCalledWith({
			title: 'Source and synced skills deleted',
			type: 'success',
		});
	});

	it('lists blocking agents and projects in the dialog and offers only Close', async () => {
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
		await userEvent.click(getByRole('button', { name: 'Delete source' }));
		await waitFor(() => expect(getByRole('dialog')).toHaveTextContent("Can't delete source"));
		expect(getByRole('dialog')).toHaveTextContent('Research agent · Marketing');
		expect(getByRole('dialog')).toHaveTextContent('Sales agent · Sales');
		expect(getByRole('dialog')).toHaveTextContent('1 agent in other projects');
		expect(getByRole('dialog')).toHaveTextContent('Nothing was deleted.');
		expect(queryByRole('button', { name: 'Delete source' })).toBeNull();
		expect(emitted('deleted')).toBeUndefined();
		expect(showMessage).not.toHaveBeenCalled();
		await userEvent.click(getByRole('button', { name: 'Close' }));
		expect(emitted('close')).toEqual([[]]);
	});

	it('explains how to unblock deletion when all agents are in unreadable projects', async () => {
		mockedStore(useSkillsStore).deleteSource.mockRejectedValue(
			new ResponseError('In use', {
				httpStatusCode: 409,
				meta: { reason: 'skills_in_use', agents: [], hiddenAgents: 1 },
			}),
		);
		const { getByRole, queryByRole, emitted } = renderDialog();
		await userEvent.click(getByRole('button', { name: 'Delete source' }));
		await waitFor(() =>
			expect(getByRole('dialog')).toHaveTextContent(
				"Ask a project admin to remove them from agents in projects you can't open.",
			),
		);
		expect(getByRole('dialog')).toHaveTextContent('1 agent in other projects');
		expect(getByRole('dialog')).toHaveTextContent('Nothing was deleted.');
		expect(queryByRole('button', { name: 'Delete source' })).toBeNull();
		expect(emitted('deleted')).toBeUndefined();
		expect(emitted('close')).toBeUndefined();
	});

	it('keeps the dialog open when a request fails', async () => {
		const error = new ResponseError('Not allowed', { httpStatusCode: 403 });
		mockedStore(useSkillsStore).deleteSource.mockRejectedValue(error);
		const { getByRole, emitted } = renderDialog();
		await userEvent.click(getByRole('button', { name: 'Delete source' }));
		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(error, 'Could not delete the source'),
		);
		expect(emitted('close')).toBeUndefined();
		expect(emitted('deleted')).toBeUndefined();
	});
});
