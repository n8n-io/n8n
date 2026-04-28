// Mock the barrel import to avoid pulling in @mastra/core (ESM-only transitive deps)
jest.mock('@n8n/instance-ai', () => ({
	wrapUntrustedData(content: string, source: string, label?: string): string {
		const esc = (s: string) =>
			s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		const safeLabel = label ? ` label="${esc(label)}"` : '';
		const safeContent = content.replace(/<\/untrusted_data/gi, '&lt;/untrusted_data');
		return `<untrusted_data source="${esc(source)}"${safeLabel}>\n${safeContent}\n</untrusted_data>`;
	},
}));

import { mock } from 'jest-mock-extended';
import type {
	AiBuilderTemporaryWorkflowRepository,
	User,
	ExecutionRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { GLOBAL_MEMBER_ROLE } from '@n8n/db';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';

import { InstanceAiAdapterService } from '../instance-ai.adapter.service';
import type { WorkflowService } from '@/workflows/workflow.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { ActiveExecutions } from '@/active-executions';
import type { WorkflowRunner } from '@/workflow-runner';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import type { FolderService } from '@/services/folder.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { TagService } from '@/services/tag.service';
import type { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';
import type { License } from '@/license';
import type { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { EventService } from '@/events/event.service';
import type { RoleService } from '@/services/role.service';
import type { Telemetry } from '@/telemetry';

jest.mock('@/permissions.ee/check-access');
jest.mock('@/workflow-execute-additional-data', () => ({
	getBase: jest.fn().mockResolvedValue({}),
}));
jest.mock('node:fs/promises', () => ({
	readFile: jest.fn().mockResolvedValue('[]'),
}));

import { userHasScopes } from '@/permissions.ee/check-access';

const userHasScopesMock = jest.mocked(userHasScopes);

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const logger = mock<Logger>();
const globalConfig = mock<GlobalConfig>({ ai: { allowSendingParameterValues: true } });
const workflowService = mock<WorkflowService>();
const workflowFinderService = mock<WorkflowFinderService>();
const workflowRepository = mock<WorkflowRepository>();
const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
const projectRepository = mock<ProjectRepository>();
const executionRepository = mock<ExecutionRepository>();
const credentialsService = mock<CredentialsService>();
const credentialsFinderService = mock<CredentialsFinderService>();
const activeExecutions = mock<ActiveExecutions>();
const workflowRunner = mock<WorkflowRunner>();
const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();
const dataTableService = mock<DataTableService>();
const dataTableRepository = mock<DataTableRepository>();
const dynamicNodeParametersService = mock<DynamicNodeParametersService>();
const folderService = mock<FolderService>();
const projectService = mock<ProjectService>();
const tagService = mock<TagService>();
const sourceControlPreferencesService = mock<SourceControlPreferencesService>();
const settingsService = mock<InstanceAiSettingsService>();
const workflowHistoryService = mock<WorkflowHistoryService>();
const enterpriseWorkflowService = mock<EnterpriseWorkflowService>();
const license = mock<License>();
const executionPersistence = mock<ExecutionPersistence>();
const eventService = mock<EventService>();
const roleService = mock<RoleService>();
const telemetry = mock<Telemetry>();
const aiBuilderTemporaryWorkflowRepository = mock<AiBuilderTemporaryWorkflowRepository>();

const service = new InstanceAiAdapterService(
	logger,
	globalConfig,
	workflowService,
	workflowFinderService,
	workflowRepository,
	sharedWorkflowRepository,
	projectRepository,
	executionRepository,
	credentialsService,
	credentialsFinderService,
	activeExecutions,
	workflowRunner,
	loadNodesAndCredentials,
	mock<InstanceSettings>({ staticCacheDir: '/tmp/test-cache' }),
	dataTableService,
	dataTableRepository,
	dynamicNodeParametersService,
	folderService,
	projectService,
	tagService,
	sourceControlPreferencesService,
	settingsService,
	workflowHistoryService,
	enterpriseWorkflowService,
	license,
	executionPersistence,
	eventService,
	roleService,
	telemetry,
	aiBuilderTemporaryWorkflowRepository,
);

const user = mock<User>({
	id: 'user-1',
	email: 'user@test.com',
	firstName: 'Test',
	lastName: 'User',
	role: GLOBAL_MEMBER_ROLE,
});

beforeEach(() => {
	jest.clearAllMocks();
	license.isLicensed.mockReturnValue(true);
	sourceControlPreferencesService.getPreferences.mockReturnValue({
		branchReadOnly: false,
	} as never);
});

// ---------------------------------------------------------------------------
// Gap 1 — exploreResources: credential ownership check
// ---------------------------------------------------------------------------

describe('exploreResources — credential ownership check', () => {
	const baseParams = {
		nodeType: 'n8n-nodes-base.googleSheets',
		version: 1,
		credentialId: 'cred-123',
		credentialType: 'googleSheetsOAuth2Api',
		methodName: 'getSheets',
		methodType: 'listSearch' as const,
	};

	it('rejects when user does not own the credential', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

		const ctx = service.createContext(user);
		await expect(ctx.nodeService.exploreResources!(baseParams)).rejects.toThrow(
			'Credential cred-123 not found or not accessible',
		);

		expect(dynamicNodeParametersService.getResourceLocatorResults).not.toHaveBeenCalled();
		expect(dynamicNodeParametersService.getOptionsViaMethodName).not.toHaveBeenCalled();
	});

	it('rejects when credential type does not match', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'cred-123',
			name: 'My Cred',
			type: 'someOtherType',
		} as never);

		const ctx = service.createContext(user);
		await expect(ctx.nodeService.exploreResources!(baseParams)).rejects.toThrow(
			'Credential cred-123 not found or not accessible',
		);

		expect(dynamicNodeParametersService.getResourceLocatorResults).not.toHaveBeenCalled();
	});

	it('uses resolved credential type and name in the credentials map', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'cred-123',
			name: 'Resolved Name',
			type: 'googleSheetsOAuth2Api',
		} as never);
		projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({ id: 'proj-1' } as never);
		loadNodesAndCredentials.collectTypes.mockResolvedValue({ nodes: [] } as never);
		dynamicNodeParametersService.getResourceLocatorResults.mockResolvedValue({
			results: [],
		} as never);

		const ctx = service.createContext(user);
		await ctx.nodeService.exploreResources!(baseParams);

		expect(dynamicNodeParametersService.getResourceLocatorResults).toHaveBeenCalledWith(
			'getSheets',
			'',
			expect.anything(),
			expect.anything(),
			expect.anything(),
			{ googleSheetsOAuth2Api: { id: 'cred-123', name: 'Resolved Name' } },
			undefined,
			undefined,
		);
	});
});

// ---------------------------------------------------------------------------
// Gap 2 — Folder operations: project scope enforcement
// ---------------------------------------------------------------------------

describe('folder operations — project scope enforcement', () => {
	it('rejects listFolders when user lacks folder:list scope', async () => {
		userHasScopesMock.mockResolvedValue(false);

		const ctx = service.createContext(user);
		await expect(ctx.workspaceService!.listFolders!('project-1')).rejects.toThrow('permissions');

		expect(folderService.getManyAndCount).not.toHaveBeenCalled();
	});

	it('allows listFolders when user has folder:list scope', async () => {
		userHasScopesMock.mockResolvedValue(true);
		folderService.getManyAndCount.mockResolvedValue([[], 0]);

		const ctx = service.createContext(user);
		const result = await ctx.workspaceService!.listFolders!('project-1');

		expect(result).toEqual([]);
		expect(userHasScopesMock).toHaveBeenCalledWith(user, ['folder:list'], false, {
			projectId: 'project-1',
		});
	});

	it('rejects createFolder when user lacks folder:create scope', async () => {
		userHasScopesMock.mockResolvedValue(false);

		const ctx = service.createContext(user);
		await expect(ctx.workspaceService!.createFolder!('New Folder', 'project-1')).rejects.toThrow(
			'permissions',
		);

		expect(folderService.createFolder).not.toHaveBeenCalled();
	});

	it('rejects deleteFolder when user lacks folder:delete scope', async () => {
		userHasScopesMock.mockResolvedValue(false);

		const ctx = service.createContext(user);
		await expect(ctx.workspaceService!.deleteFolder!('folder-1', 'project-1')).rejects.toThrow(
			'permissions',
		);

		expect(folderService.deleteFolder).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Gap 3 — stop execution: requires workflow:execute scope
// ---------------------------------------------------------------------------

describe('stop execution — workflow:execute scope', () => {
	it('rejects stop when user only has workflow:read (not workflow:execute)', async () => {
		executionRepository.findSingleExecution.mockResolvedValue({
			id: 'exec-1',
			workflowId: 'wf-1',
		} as never);
		// findWorkflowForUser returns null for workflow:execute scope (user has read-only)
		workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

		const ctx = service.createContext(user);
		await expect(ctx.executionService.stop('exec-1')).rejects.toThrow('Execution exec-1 not found');

		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
			'workflow:execute',
		]);
	});

	it('read methods (getStatus) still use workflow:read scope', async () => {
		executionRepository.findSingleExecution.mockResolvedValue({
			id: 'exec-1',
			workflowId: 'wf-1',
		} as never);
		workflowFinderService.findWorkflowForUser.mockResolvedValue({ id: 'wf-1' } as never);
		activeExecutions.has.mockReturnValue(false);
		executionRepository.findSingleExecution
			.mockResolvedValueOnce({ id: 'exec-1', workflowId: 'wf-1' } as never)
			.mockResolvedValueOnce(undefined);

		const ctx = service.createContext(user);
		await ctx.executionService.getStatus('exec-1');

		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
			'workflow:read',
		]);
	});
});

// ---------------------------------------------------------------------------
// Gap 4 — cleanupTestExecutions: scope + deletion pipeline
// ---------------------------------------------------------------------------

describe('cleanupTestExecutions — scope and deletion pipeline', () => {
	it('rejects when user lacks workflow:execute scope', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

		const ctx = service.createContext(user);
		await expect(ctx.workspaceService!.cleanupTestExecutions('wf-1')).rejects.toThrow(
			'Workflow wf-1 not found or not accessible',
		);

		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
			'workflow:execute',
		]);
	});

	it('calls hardDeleteBy instead of deleteByIds', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue({ id: 'wf-1' } as never);
		executionRepository.find.mockResolvedValue([{ id: 'exec-1' }, { id: 'exec-2' }] as never);
		executionPersistence.hardDeleteBy.mockResolvedValue(undefined);

		const ctx = service.createContext(user);
		const result = await ctx.workspaceService!.cleanupTestExecutions('wf-1');

		expect(result.deletedCount).toBe(2);
		expect(executionPersistence.hardDeleteBy).toHaveBeenCalledWith({
			filters: { workflowId: 'wf-1', mode: 'manual' },
			accessibleWorkflowIds: ['wf-1'],
			deleteConditions: { deleteBefore: expect.any(Date) },
		});
		// Verify deleteByIds is NOT called
		expect(executionRepository.deleteByIds).not.toHaveBeenCalled();
	});

	it('emits execution-deleted audit event', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue({ id: 'wf-1' } as never);
		executionRepository.find.mockResolvedValue([{ id: 'exec-1' }] as never);
		executionPersistence.hardDeleteBy.mockResolvedValue(undefined);

		const ctx = service.createContext(user);
		await ctx.workspaceService!.cleanupTestExecutions('wf-1');

		expect(eventService.emit).toHaveBeenCalledWith('execution-deleted', {
			user: {
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				role: user.role,
			},
			executionIds: ['exec-1'],
			deleteBefore: expect.any(Date),
		});
	});

	it('returns deletedCount 0 and skips deletion when no executions match', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue({ id: 'wf-1' } as never);
		executionRepository.find.mockResolvedValue([] as never);

		const ctx = service.createContext(user);
		const result = await ctx.workspaceService!.cleanupTestExecutions('wf-1');

		expect(result.deletedCount).toBe(0);
		expect(executionPersistence.hardDeleteBy).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalled();
	});
});
