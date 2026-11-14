import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import type { SkillSourceListItem } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { useSkillsStore } from '../skills.store';
import SkillSourceCredentialDialog from './SkillSourceCredentialDialog.vue';

const source: SkillSourceListItem = {
	id: 'source-1',
	type: 'github',
	label: 'acme/skills',
	ref: 'main',
	path: '',
	webUrl: 'https://github.com/acme/skills',
	projectId: 'project-1',
	projectName: 'Team',
	projectType: 'team',
	projectIcon: null,
	skillCount: 1,
	updatesAvailable: 0,
	updatesBlocked: 0,
	health: 'credential_issue',
	lastCheckedAt: null,
	missingSkills: [],
	canReview: true,
	canDelete: true,
};
const render = createComponentRenderer(SkillSourceCredentialDialog);

describe('SkillSourceCredentialDialog', () => {
	it('saves a selected credential without requiring a successful connection test', async () => {
		const pinia = createTestingPinia();
		const store = mockedStore(useSkillsStore);
		store.fetchReplacementCredentials.mockResolvedValue([
			{ id: 'expired', name: 'Expired token', type: 'githubApi' },
		]);
		store.replaceSourceCredential.mockResolvedValue(undefined);
		const { getByRole, emitted } = render({ pinia, props: { source } });
		await waitFor(() => expect(store.fetchReplacementCredentials).toHaveBeenCalledWith(source.id));
		await userEvent.click(getByRole('combobox', { name: 'GitHub credential' }));
		await userEvent.click(getByRole('option', { name: 'Expired token' }));
		await userEvent.click(getByRole('button', { name: 'Save' }));
		await waitFor(() =>
			expect(store.replaceSourceCredential).toHaveBeenCalledWith(source.id, 'expired'),
		);
		expect(emitted('saved')).toHaveLength(1);
	});

	it('creates a credential in the source project and selects it after saving', async () => {
		const pinia = createTestingPinia();
		const store = mockedStore(useSkillsStore);
		const ui = mockedStore(useUIStore);
		mockedStore(useProjectsStore).myProjects = [
			{ id: source.projectId, scopes: ['credential:create'] } as ProjectListItem,
		];
		store.fetchReplacementCredentials.mockResolvedValue([]);
		const { getByRole } = render({ pinia, props: { source } });
		await waitFor(() => expect(store.fetchReplacementCredentials).toHaveBeenCalled());
		await userEvent.click(getByRole('combobox', { name: 'GitHub credential' }));
		await userEvent.click(getByRole('option', { name: '+ Connect a new GitHub account' }));
		expect(ui.openNewCredential).toHaveBeenCalledWith(
			'githubApi',
			false,
			false,
			source.projectId,
			undefined,
			undefined,
			undefined,
			expect.objectContaining({ closeOnSave: true }),
		);
		store.fetchReplacementCredentials.mockResolvedValue([
			{ id: 'created', name: 'New GitHub token', type: 'githubApi' },
		]);
		ui.openNewCredential.mock.calls[0][7]?.onCredentialCreated?.({
			id: 'created',
		} as ICredentialsResponse);
		await waitFor(() => expect(getByRole('combobox')).toHaveTextContent('New GitHub token'));
		await userEvent.click(getByRole('button', { name: 'Save' }));
		expect(store.replaceSourceCredential).toHaveBeenCalledWith(source.id, 'created');
	});

	it('keeps the dialog open when saving is refused', async () => {
		const pinia = createTestingPinia();
		const store = mockedStore(useSkillsStore);
		store.fetchReplacementCredentials.mockResolvedValue([
			{ id: 'credential', name: 'GitHub token', type: 'githubApi' },
		]);
		store.replaceSourceCredential.mockRejectedValue(new Error('Permission denied'));
		const { getByTestId, getByRole, emitted } = render({ pinia, props: { source } });
		await waitFor(() => expect(store.fetchReplacementCredentials).toHaveBeenCalled());
		await userEvent.click(getByTestId('skill-source-replacement-credential'));
		await userEvent.click(getByRole('option', { name: 'GitHub token' }));
		await userEvent.click(getByRole('button', { name: 'Save' }));
		await waitFor(() => expect(store.replaceSourceCredential).toHaveBeenCalled());
		expect(emitted('saved')).toBeUndefined();
		expect(emitted('close')).toBeUndefined();
	});
});
