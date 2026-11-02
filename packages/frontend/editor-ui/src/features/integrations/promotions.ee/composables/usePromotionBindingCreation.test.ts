vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({ isEnterpriseFeatureEnabled: { variables: true } }),
}));
import { effectScope, reactive, nextTick } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { mock } from 'vitest-mock-extended';
import {
	capabilities,
	capabilityRegistry,
	type CredentialEditorOptions,
	type ProjectContext,
	type ResourceEditors,
	type VariableEditorOptions,
} from '@n8n/frontend-module-sdk';
import {
	createPublicCredential,
	createPublicProject,
	getProject,
	ResponseError,
	type Project,
} from '@n8n/rest-api-client';
import type { CredentialPublicDto, CreatedProjectPublicDto } from '@n8n/api-types';
import { usePromotionBindingCreation } from './usePromotionBindingCreation';
import { blocked, credential, variable } from '../__tests__/bindings.fixtures';

const editorOpen = reactive({ credential: false, variable: false });
const editors = {
	hasCredentialType: vi.fn<ResourceEditors['hasCredentialType']>(),
	loadVariables: vi.fn<ResourceEditors['loadVariables']>(),
	createVariable: vi.fn<ResourceEditors['createVariable']>(),
	openCredentialEditor: vi.fn<ResourceEditors['openCredentialEditor']>(),
	openVariableEditor: vi.fn<ResourceEditors['openVariableEditor']>(),
	isEditorOpen: (editor: 'credential' | 'variable') => editorOpen[editor],
	closeEditor: vi.fn<ResourceEditors['closeEditor']>(),
};
const projectContext = mock<ProjectContext>({ hasTeamProjectQuota: () => true });

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getProject: vi.fn(),
	createPublicProject: vi.fn(),
	createPublicCredential: vi.fn(),
}));
vi.mock('@n8n/stores/rbac.store', () => ({ useRBACStore: () => ({ hasScope: () => true }) }));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ publicApiContext: { baseUrl: '/custom/api/v1' }, restApiContext: {} }),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError: vi.fn() }) }));

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
let credentialOptions: CredentialEditorOptions;
let variableOptions: VariableEditorOptions;

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
	editorOpen.credential = false;
	editorOpen.variable = false;
	capabilityRegistry.provide(capabilities.resourceEditors, editors);
	capabilityRegistry.provide(capabilities.projectContext, projectContext);
	editors.openCredentialEditor.mockImplementation((_type, options) => {
		credentialOptions = options;
		editorOpen.credential = true;
	});
	editors.openVariableEditor.mockImplementation((options) => {
		variableOptions = options;
		editorOpen.variable = true;
	});
	editors.hasCredentialType.mockResolvedValue(true);
	vi.mocked(getProject).mockResolvedValue(project);
	vi.mocked(createPublicProject).mockResolvedValue(projectResponse);
	vi.mocked(createPublicCredential).mockResolvedValue(saved);
});
afterEach(() => {
	scopes.splice(0).forEach((scope) => scope.stop());
	capabilityRegistry.clear();
});

it('keeps a created project after a failed credential save and resolves on closure', async () => {
	const adapter = setup(true);
	const complete = vi.fn();
	const pending = adapter.createBinding(credential).then(complete);
	await flushPromises();
	expect(createPublicProject).not.toHaveBeenCalled();
	expect(credentialOptions.destination).toMatchObject({
		kind: 'pending',
		id: project.id,
		permissions: { create: true },
	});
	vi.mocked(createPublicCredential).mockRejectedValueOnce(new Error('Save failed'));
	const details = {
		id: '',
		name: 'Edited name',
		description: 'Edited description',
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
	expect(getProject).toHaveBeenCalledTimes(2);
	expect(projectContext.getMyProjects).toHaveBeenCalledTimes(2);
	expect(createPublicCredential).toHaveBeenLastCalledWith(
		{ baseUrl: '/custom/api/v1' },
		{
			id: credential.sourceId,
			name: 'Edited name',
			description: 'Edited description',
			type: credential.credentialType,
			data: { value: 'edited' },
			projectId: project.id,
			isResolvable: false,
		},
	);
	expect(complete).not.toHaveBeenCalled();
	editorOpen.credential = false;
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
	projectContext.getMyProjects.mockRejectedValueOnce(new Error('Refresh failed'));
	const details = { id: '', name: credential.name, type: credential.credentialType, data: {} };
	await expect(credentialOptions.createCredential!(details, project.id)).rejects.toThrow(
		'Refresh failed',
	);
	expect(createPublicCredential).not.toHaveBeenCalled();
	await credentialOptions.createCredential!(details, project.id);
	expect(createPublicProject).toHaveBeenCalledTimes(1);
	editorOpen.credential = false;
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
	expect(getProject).toHaveBeenCalledWith({}, project.id);
	expect(adapter.onProjectCreated).not.toHaveBeenCalled();
	expect(adapter.createdProjects.value).toEqual([]);
	editorOpen.credential = false;
	await pending;
});

it('does not create a project after a denied lookup', async () => {
	vi.mocked(getProject).mockRejectedValue(new ResponseError('Denied', { httpStatusCode: 403 }));
	await expect(setup().createBinding(credential)).rejects.toThrow('Denied');
	expect(createPublicProject).not.toHaveBeenCalled();
	expect(editors.openCredentialEditor).not.toHaveBeenCalled();
});

it.each([null, 'owner-team'])('creates a variable in its required scope: %s', async (projectId) => {
	const binding = projectId
		? { ...variable, scope: { kind: 'project' as const, project: credential.ownerProject } }
		: variable;
	editors.createVariable.mockResolvedValue({
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
		allowOnProtectedInstance: true,
	});
	await variableOptions.onCreate!({ key: variable.name, value: '' });
	expect(editors.createVariable).toHaveBeenCalledWith({
		key: variable.name,
		value: '',
		projectId,
	});
	editorOpen.variable = false;
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
	editorOpen.credential = false;
	expect(await first).toBeNull();
	const second = adapter.createBinding(variable);
	await flushPromises();
	staleInitializeError(new Error('Old editor failed'));
	expect(editors.closeEditor).not.toHaveBeenCalled();
	await expect(
		staleCreate({ id: '', name: 'Stale', type: credential.credentialType, data: {} }, project.id),
	).rejects.toThrow();
	expect(createPublicCredential).not.toHaveBeenCalled();
	adapter.scope.stop();
	expect(await second).toBeNull();
	editorOpen.variable = false;
	await nextTick();
});
