vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({ isEnterpriseFeatureEnabled: { variables: true } }),
}));
import { effectScope, reactive, nextTick } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { mock } from 'vitest-mock-extended';
import { ResponseError } from '@n8n/rest-api-client';
import type { CredentialPublicDto, CreatedProjectPublicDto } from '@n8n/api-types';
import type { NewCredentialsModal } from '@/Interface';
import type { Project } from '@/features/collaboration/projects/projects.types';
import type { VariableModalOptions } from '@/features/settings/environments.ee/environments.types';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { VARIABLE_MODAL_KEY } from '@/features/settings/environments.ee/environments.constants';
import { createPublicProject } from '@/features/collaboration/projects/projects.api';
import { createPublicCredential } from '@/features/credentials/credentials.api';
import { usePromotionBindingCreation } from './usePromotionBindingCreation';
import { blocked, credential, variable } from '../__tests__/bindings.fixtures';

const stores = vi.hoisted(() => ({
	projects: {
		fetchProject: vi.fn(),
		getMyProjects: vi.fn(),
		canCreateProjects: true,
		hasPermissionToCreateProjects: true,
	},
	credentials: { fetchCredentialTypes: vi.fn(), getCredentialTypeByName: vi.fn() },
	environments: { fetchAllVariables: vi.fn(), createVariable: vi.fn() },
	ui: {
		modalsById: {} as Record<string, { open: boolean }>,
		openNewCredential: vi.fn(),
		openModalWithData: vi.fn(),
		closeModal: vi.fn(),
	},
}));
vi.mock('@/app/stores/ui.store', () => ({ useUIStore: () => stores.ui }));
vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => stores.projects,
}));
vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => stores.credentials,
}));
vi.mock('@/features/settings/environments.ee/environments.store', () => ({
	useEnvironmentsStore: () => stores.environments,
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ publicApiContext: { baseUrl: '/custom/api/v1' } }),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));
vi.mock('@/features/collaboration/projects/projects.api', () => ({ createPublicProject: vi.fn() }));
vi.mock('@/features/credentials/credentials.api', () => ({ createPublicCredential: vi.fn() }));

const project = mock<Project>({
	id: credential.ownerProject.id,
	name: 'Actual project name',
	type: 'team',
	scopes: ['credential:create', 'projectVariable:create'],
});
const saved = mock<CredentialPublicDto>({
	id: credential.sourceId,
	name: 'Edited name',
	type: credential.credentialType,
});
const projectResponse = mock<CreatedProjectPublicDto>({ id: project.id, name: project.name ?? '' });
const missingProject = {
	...credential.ownerProject,
	icon: { type: 'emoji' as const, value: '🌳' },
	description: 'Source description',
	customTelemetryTags: [{ key: 'team', value: 'example' }],
};
const scopes: ReturnType<typeof effectScope>[] = [];
let credentialOptions: NewCredentialsModal;
let variableOptions: VariableModalOptions;

function setup(missingProjects = false) {
	const scope = effectScope();
	scopes.push(scope);
	const onProjectCreated = vi.fn();
	const adapter = scope.run(() =>
		usePromotionBindingCreation(
			blocked({ missingProjects: missingProjects ? [missingProject] : [] }),
			onProjectCreated,
		),
	)!;
	return { ...adapter, scope, onProjectCreated };
}

beforeEach(() => {
	vi.resetAllMocks();
	stores.ui.modalsById = reactive({
		[CREDENTIAL_EDIT_MODAL_KEY]: { open: false },
		[VARIABLE_MODAL_KEY]: { open: false },
	});
	stores.ui.openNewCredential.mockImplementation((...args) => {
		credentialOptions = args[7];
		stores.ui.modalsById[CREDENTIAL_EDIT_MODAL_KEY].open = true;
	});
	stores.ui.openModalWithData.mockImplementation(({ name, data }) => {
		variableOptions = data;
		stores.ui.modalsById[name].open = true;
	});
	stores.credentials.getCredentialTypeByName.mockReturnValue({ name: credential.credentialType });
	stores.projects.fetchProject.mockResolvedValue(project);
	vi.mocked(createPublicProject).mockResolvedValue(projectResponse);
	vi.mocked(createPublicCredential).mockResolvedValue(saved);
});
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()));

it('keeps a created project after a failed credential save and resolves on closure', async () => {
	const adapter = setup(true);
	const complete = vi.fn();
	const pending = adapter.createBinding(credential).then(complete);
	await flushPromises();
	expect(createPublicProject).not.toHaveBeenCalled();
	expect(credentialOptions.destination).toMatchObject({ kind: 'pending', id: project.id });
	vi.mocked(createPublicCredential).mockRejectedValueOnce(new Error('Save failed'));
	const details = {
		id: '',
		name: 'Edited name',
		type: credential.credentialType,
		data: { value: 'edited' },
	};
	await expect(credentialOptions.createCredential!(details, project.id)).rejects.toThrow(
		'Save failed',
	);
	expect(createPublicProject).toHaveBeenCalledWith({ baseUrl: '/custom/api/v1' }, missingProject);
	expect(adapter.onProjectCreated).toHaveBeenCalledWith({ id: project.id, name: project.name });
	expect(adapter.createdProjects.value).toEqual([{ id: project.id, name: project.name }]);
	expect(complete).not.toHaveBeenCalled();
	await credentialOptions.createCredential!(details, project.id);
	expect(createPublicProject).toHaveBeenCalledTimes(1);
	expect(stores.projects.fetchProject).toHaveBeenCalledTimes(2);
	expect(stores.projects.getMyProjects).toHaveBeenCalledTimes(2);
	expect(createPublicCredential).toHaveBeenLastCalledWith(
		{ baseUrl: '/custom/api/v1' },
		{
			id: credential.sourceId,
			name: 'Edited name',
			type: credential.credentialType,
			data: { value: 'edited' },
			projectId: project.id,
			isResolvable: false,
		},
	);
	expect(complete).not.toHaveBeenCalled();
	stores.ui.modalsById[CREDENTIAL_EDIT_MODAL_KEY].open = false;
	await pending;
	expect(complete).toHaveBeenCalledWith({
		kind: 'credential',
		sourceId: credential.sourceId,
		id: saved.id,
		name: saved.name,
		credentialType: saved.type,
		projectId: project.id,
	});
});

it('retries a project read without creating the project again', async () => {
	const adapter = setup(true);
	const pending = adapter.createBinding(credential);
	await flushPromises();
	stores.projects.getMyProjects.mockRejectedValueOnce(new Error('Refresh failed'));
	const details = { id: '', name: credential.name, type: credential.credentialType, data: {} };
	await expect(credentialOptions.createCredential!(details, project.id)).rejects.toThrow(
		'Refresh failed',
	);
	expect(createPublicCredential).not.toHaveBeenCalled();
	await credentialOptions.createCredential!(details, project.id);
	expect(createPublicProject).toHaveBeenCalledTimes(1);
	stores.ui.modalsById[CREDENTIAL_EDIT_MODAL_KEY].open = false;
	await pending;
});

it('reads an occupied project without claiming it was created', async () => {
	vi.mocked(createPublicProject).mockRejectedValue(
		new ResponseError('Occupied', { httpStatusCode: 409 }),
	);
	const adapter = setup(true);
	const pending = adapter.createBinding(credential);
	await flushPromises();
	await credentialOptions.createCredential!(
		{ id: '', name: credential.name, type: credential.credentialType, data: {} },
		project.id,
	);
	expect(stores.projects.fetchProject).toHaveBeenCalledWith(project.id);
	expect(adapter.onProjectCreated).not.toHaveBeenCalled();
	expect(adapter.createdProjects.value).toEqual([]);
	stores.ui.modalsById[CREDENTIAL_EDIT_MODAL_KEY].open = false;
	await pending;
});

it('does not create a project after a denied lookup', async () => {
	stores.projects.fetchProject.mockRejectedValue(
		new ResponseError('Denied', { httpStatusCode: 403 }),
	);
	await expect(setup().createBinding(credential)).rejects.toThrow('Denied');
	expect(createPublicProject).not.toHaveBeenCalled();
	expect(stores.ui.openNewCredential).not.toHaveBeenCalled();
});

it.each([null, 'owner-team'])('creates a variable in its required scope: %s', async (projectId) => {
	const binding = projectId
		? { ...variable, scope: { kind: 'project' as const, project: credential.ownerProject } }
		: variable;
	stores.environments.createVariable.mockResolvedValue({
		id: 'variable-id',
		key: variable.name,
		value: '',
		project: projectId ? credential.ownerProject : null,
	});
	const pending = setup().createBinding(binding);
	await flushPromises();
	expect(variableOptions).toMatchObject({
		initialValues: { key: variable.name, value: '' },
		projectId,
		fixedKey: true,
	});
	await variableOptions.onCreate!({ key: variable.name, value: '' });
	expect(stores.environments.createVariable).toHaveBeenCalledWith({
		key: variable.name,
		value: '',
		projectId,
	});
	stores.ui.modalsById[VARIABLE_MODAL_KEY].open = false;
	expect(await pending).toEqual({
		kind: 'variable',
		id: 'variable-id',
		name: variable.name,
		scope: binding.scope,
	});
	expect(createPublicProject).not.toHaveBeenCalled();
});

it('blocks concurrent editors and ignores callbacks after closure', async () => {
	const adapter = setup();
	const first = adapter.createBinding(credential);
	await flushPromises();
	await expect(adapter.createBinding(variable)).rejects.toThrow();
	const staleCreate = credentialOptions.createCredential!;
	const staleInitializeError = credentialOptions.onInitializeError!;
	stores.ui.modalsById[CREDENTIAL_EDIT_MODAL_KEY].open = false;
	expect(await first).toBeNull();
	const second = adapter.createBinding(variable);
	await flushPromises();
	staleInitializeError(new Error('Old editor failed'));
	expect(stores.ui.closeModal).not.toHaveBeenCalled();
	await expect(
		staleCreate({ id: '', name: 'Stale', type: credential.credentialType, data: {} }, project.id),
	).rejects.toThrow();
	expect(createPublicCredential).not.toHaveBeenCalled();
	adapter.scope.stop();
	expect(await second).toBeNull();
	stores.ui.modalsById[VARIABLE_MODAL_KEY].open = false;
	await nextTick();
});
