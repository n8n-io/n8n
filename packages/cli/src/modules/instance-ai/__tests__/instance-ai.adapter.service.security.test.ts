// Mock the barrel import so these adapter tests only exercise local formatting helpers.
vi.mock('@n8n/instance-ai', async () => {
	const { WorkflowNotFoundError, OutsideThreadProjectError } = await import(
		'@n8n/instance-ai/errors'
	);
	return {
		WorkflowNotFoundError,
		OutsideThreadProjectError,
		wrapUntrustedData(content: string, source: string, label?: string): string {
			const esc = (s: string) =>
				s
					.replace(/&/g, '&amp;')
					.replace(/"/g, '&quot;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');
			const safeLabel = label ? ` label="${esc(label)}"` : '';
			const safeContent = content.replace(/<\/untrusted_data/gi, '&lt;/untrusted_data');
			return `<untrusted_data source="${esc(source)}"${safeLabel}>\n${safeContent}\n</untrusted_data>`;
		},
		builderTemplatesOptionsFromEnv: () => ({}),
		RESOURCE_EXPLORATION_UNAVAILABLE: 'Resource exploration is not available.',
		BuilderTemplatesService: class {
			async getBundle() {
				return { files: [], indexTxt: '', version: null };
			}
			getVersion() {
				return null;
			}
		},
	};
});

import type { Logger } from '@n8n/backend-common';
import {
	type EventService,
	type RoleService,
	type CredentialsFinderService,
	type InstanceWriteAccessService,
} from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import { CredentialsRepository, GLOBAL_MEMBER_ROLE, SharedCredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { OutsideThreadProjectError } from '@n8n/instance-ai/errors';
import { LessThan } from '@n8n/typeorm';
import type {
	AiBuilderTemporaryWorkflowRepository,
	CredentialsEntity,
	User,
	ExecutionRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { OperationalError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { CredentialsService } from '@/credentials/credentials.service';
import { CredentialNotFoundError } from '@/errors/credential-not-found.error';
import type { WorkflowRunner } from '@/workflow-runner';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { NodeResourceExplorerService } from '@/services/node-resource-explorer.service';
import type { FolderService } from '@/services/folder.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { TagService } from '@/services/tag.service';

import type { InstanceAiSettingsService } from '../instance-ai-settings.service';

import type { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { License } from '@/license';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { DataTableRepository } from '@/modules/data-table/data-table.repository';
import type { DataTableService } from '@/modules/data-table/data-table.service';
import type { NodeTypes } from '@/node-types';
import type { PolicyEnforcementService } from '@/policy/policy-enforcement.service';

import type { OutboundHttp } from '@n8n/backend-network';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowTemplatesService } from '../workflow-templates.service';

vi.mock('@/permissions.ee/check-access');
vi.mock('@/utils/ai-proxy-fetch', () => ({
	createAiProxyFetch: vi.fn(() => vi.fn()),
	createWebSearchFetch: vi.fn(() => vi.fn()),
}));
vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: vi.fn().mockResolvedValue({}),
}));
vi.mock('node:fs/promises', () => ({
	readFile: vi.fn().mockResolvedValue('[]'),
}));

import { userHasScopes } from '@/permissions.ee/check-access';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { InstanceAiAdapterService } from '../instance-ai.adapter.service';

const userHasScopesMock = vi.mocked(userHasScopes);

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
const nodeTypes = mock<NodeTypes>();
const dataTableService = mock<DataTableService>();
const dataTableRepository = mock<DataTableRepository>();
const dynamicNodeParametersService = mock<DynamicNodeParametersService>();
const folderService = mock<FolderService>();
const projectService = mock<ProjectService>();
const tagService = mock<TagService>();
const instanceWriteAccess = mock<InstanceWriteAccessService>();
const settingsService = mock<InstanceAiSettingsService>();
const workflowHistoryService = mock<WorkflowHistoryService>();
const enterpriseWorkflowService = mock<EnterpriseWorkflowService>();
const license = mock<License>();
const executionPersistence = mock<ExecutionPersistence>();
const eventService = mock<EventService>();
const roleService = mock<RoleService>();
const telemetry = mock<Telemetry>();
const aiBuilderTemporaryWorkflowRepository = mock<AiBuilderTemporaryWorkflowRepository>();

const nodeResourceExplorerService = new NodeResourceExplorerService(
	logger,
	dynamicNodeParametersService,
	credentialsFinderService,
	projectRepository,
	nodeTypes,
);

const policyEnforcementService = mock<PolicyEnforcementService>();
policyEnforcementService.enforceWorkflowSave.mockResolvedValue(mock());

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
	nodeTypes,
	mock<InstanceSettings>({ staticCacheDir: '/tmp/test-cache', n8nFolder: '/tmp/test-cache' }),
	dataTableService,
	dataTableRepository,
	nodeResourceExplorerService,
	folderService,
	projectService,
	tagService,
	instanceWriteAccess,
	settingsService,
	workflowHistoryService,
	enterpriseWorkflowService,
	license,
	executionPersistence,
	eventService,
	roleService,
	telemetry,
	aiBuilderTemporaryWorkflowRepository,
	mock<OutboundHttp>(),
	mock<AiGatewayService>(),
	mock<WorkflowTemplatesService>(),
	mock<CollaborationService>(),
	policyEnforcementService,
);

const user = mock<User>({
	id: 'user-1',
	email: 'user@test.com',
	firstName: 'Test',
	lastName: 'User',
	role: GLOBAL_MEMBER_ROLE,
});

beforeEach(() => {
	vi.clearAllMocks();
	license.isLicensed.mockReturnValue(true);
	instanceWriteAccess.isReadOnly.mockReturnValue(false);
	vi.spyOn(Container, 'get').mockReturnValue(executionPersistence);
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
// exploreResources — eval-seeded credentials
// ---------------------------------------------------------------------------

describe('exploreResources — eval-seeded credential', () => {
	const baseParams = {
		nodeType: 'n8n-nodes-base.googleSheets',
		version: 1,
		credentialId: 'cred-123',
		credentialType: 'googleSheetsOAuth2Api',
		methodName: 'getSheets',
		methodType: 'listSearch' as const,
	};

	const expectNoProviderCall = () => {
		expect(dynamicNodeParametersService.getResourceLocatorResults).not.toHaveBeenCalled();
		expect(dynamicNodeParametersService.getOptionsViaMethodName).not.toHaveBeenCalled();
		expect(dynamicNodeParametersService.getOptionsViaLoadOptionsByPath).not.toHaveBeenCalled();
	};

	beforeEach(() => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'cred-123',
			name: 'Seeded Sheets',
			type: 'googleSheetsOAuth2Api',
		} as never);
	});

	// An eval seeds a placeholder token, so a live lookup fails with a real provider
	// auth error and the agent tells the user a "connected" credential is broken.
	it('answers "not available" without a provider call for a credential the harness treats as connected', async () => {
		const ctx = service.createContext(user, {
			shouldBypassCredentialTest: (credentialId) => credentialId === 'cred-123',
		});

		const lookup = ctx.nodeService.exploreResources!(baseParams);
		await expect(lookup).rejects.toThrow('Resource exploration is not available.');
		await expect(lookup).rejects.toBeInstanceOf(OperationalError);
		expectNoProviderCall();
	});

	it('still rejects a bypassed credential the user cannot access', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue(null);
		const ctx = service.createContext(user, { shouldBypassCredentialTest: () => true });

		await expect(ctx.nodeService.exploreResources!(baseParams)).rejects.toThrow(
			'Credential cred-123 not found or not accessible',
		);
		expectNoProviderCall();
	});

	it('still rejects a bypassed credential of another type', async () => {
		const ctx = service.createContext(user, { shouldBypassCredentialTest: () => true });

		await expect(
			ctx.nodeService.exploreResources!({ ...baseParams, credentialType: 'slackApi' }),
		).rejects.toThrow('Credential cred-123 not found or not accessible');
		expectNoProviderCall();
	});

	it('answers "not available" for a load-options lookup too', async () => {
		const ctx = service.createContext(user, { shouldBypassCredentialTest: () => true });

		await expect(
			ctx.nodeService.exploreResources!({ ...baseParams, methodType: 'loadOptions' }),
		).rejects.toThrow('Resource exploration is not available.');
		expectNoProviderCall();
	});

	// A case that seeds a broken credential (`valid: false`) is not on the bypass list:
	// its lookup must keep failing for real, which is what such a case tests.
	it('runs the live lookup for a seeded credential the harness does not treat as connected', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'cred-123',
			name: 'Broken Sheets',
			type: 'googleSheetsOAuth2Api',
		} as never);
		projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({ id: 'proj-1' } as never);
		dynamicNodeParametersService.getResourceLocatorResults.mockResolvedValue({
			results: [],
		} as never);

		const ctx = service.createContext(user, { shouldBypassCredentialTest: () => false });
		await ctx.nodeService.exploreResources!(baseParams);

		expect(dynamicNodeParametersService.getResourceLocatorResults).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// resolveParameterOptions — eval-seeded credentials
// ---------------------------------------------------------------------------

describe('resolveParameterOptions — eval-seeded credential', () => {
	const baseParams = {
		nodeType: 'n8n-nodes-base.googleSheets',
		version: 1,
		parameterPath: 'documentId',
		credentialId: 'cred-123',
		credentialType: 'googleSheetsOAuth2Api',
	};
	const unavailable = {
		ok: false,
		code: 'lookup_failed',
		message: 'Resource exploration is not available.',
	};

	const expectNoLookup = () => {
		expect(nodeTypes.getByNameAndVersion).not.toHaveBeenCalled();
		expect(dynamicNodeParametersService.getResourceLocatorResults).not.toHaveBeenCalled();
		expect(dynamicNodeParametersService.getOptionsViaMethodName).not.toHaveBeenCalled();
		expect(dynamicNodeParametersService.getOptionsViaLoadOptionsByPath).not.toHaveBeenCalled();
	};

	beforeEach(() => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'cred-123',
			name: 'Seeded Sheets',
			type: 'googleSheetsOAuth2Api',
		} as never);
	});

	it('answers "not available" without a lookup for a credential the harness treats as connected', async () => {
		const ctx = service.createContext(user, {
			shouldBypassCredentialTest: (credentialId) => credentialId === 'cred-123',
		});

		await expect(ctx.nodeService.resolveParameterOptions!(baseParams)).resolves.toEqual(
			unavailable,
		);
		expectNoLookup();
	});

	it('answers "not available" for a bypassed credential passed in the credentials map', async () => {
		const ctx = service.createContext(user, { shouldBypassCredentialTest: () => true });

		await expect(
			ctx.nodeService.resolveParameterOptions!({
				nodeType: baseParams.nodeType,
				version: baseParams.version,
				parameterPath: baseParams.parameterPath,
				credentials: { googleSheetsOAuth2Api: { id: 'cred-123', name: 'Seeded Sheets' } },
			}),
		).resolves.toEqual(unavailable);
		expectNoLookup();
	});

	it('still rejects a bypassed credential the user cannot access', async () => {
		credentialsFinderService.findCredentialForUser.mockResolvedValue(null);
		const ctx = service.createContext(user, { shouldBypassCredentialTest: () => true });

		await expect(ctx.nodeService.resolveParameterOptions!(baseParams)).resolves.toEqual({
			ok: false,
			code: 'lookup_failed',
			message: 'Credential cred-123 not found or not accessible',
		});
		expectNoLookup();
	});

	it('runs the live lookup for a credential the harness does not treat as connected', async () => {
		nodeTypes.getByNameAndVersion.mockImplementation(() => {
			throw new Error('Unknown node type');
		});
		const ctx = service.createContext(user, { shouldBypassCredentialTest: () => false });

		await expect(ctx.nodeService.resolveParameterOptions!(baseParams)).resolves.toMatchObject({
			ok: false,
			code: 'node_type_not_found',
		});
		expect(nodeTypes.getByNameAndVersion).toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Cross-project workflow reads: narrowing only, never widening
// ---------------------------------------------------------------------------

describe('workflow list — caller-supplied projectId', () => {
	it('passes the project as a filter on the user-scoped query rather than resolving access itself', async () => {
		workflowService.getMany.mockResolvedValue({ workflows: [], count: 0 });

		const ctx = service.createContext(user, { projectId: 'bound-project' });
		await ctx.workflowService.list({ projectId: 'project-other' });

		// Unlike credentials (a write capability, hard-locked to the bound project),
		// workflow *reads* may be widened — `scope: 'instance'` already returns
		// everything the user can read. So the project id is only ever a filter on a
		// query that still resolves readability from this user's own roles: it can
		// narrow that set, never extend it to a project they cannot read.
		expect(workflowService.getMany).toHaveBeenCalledWith(user, {
			take: 50,
			filter: { isArchived: false, projectId: 'project-other' },
		});
	});

	it('does not let a cross-project read move where the thread writes', async () => {
		workflowService.getMany.mockResolvedValue({ workflows: [], count: 0 });
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([]);

		const ctx = service.createContext(user, { projectId: 'bound-project' });
		await ctx.workflowService.list({ projectId: 'project-other' });
		await ctx.credentialService.list({});

		// The bound project is what write-adjacent surfaces keep resolving to.
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
			projectId: 'bound-project',
		});
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

	it('read methods (getStatus) require workflow:read and execution:read', async () => {
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
			'execution:read',
		]);
	});
});

// ---------------------------------------------------------------------------
// Gap 4 — cleanupTestExecutions: scope + deletion pipeline
// ---------------------------------------------------------------------------

describe('cleanupTestExecutions — scope and deletion pipeline', () => {
	it('rejects when user lacks execution:delete scope', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue(null);

		const ctx = service.createContext(user);
		await expect(ctx.workspaceService!.cleanupTestExecutions('wf-1')).rejects.toThrow(
			'Workflow wf-1 not found or not accessible',
		);

		expect(workflowFinderService.findWorkflowForUser).toHaveBeenCalledWith('wf-1', user, [
			'execution:delete',
		]);
	});

	it('deletes only the counted manual executions by ID', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue({ id: 'wf-1' } as never);
		executionRepository.find.mockResolvedValue([{ id: 'exec-1' }, { id: 'exec-2' }] as never);
		executionPersistence.hardDeleteBy.mockResolvedValue(undefined);

		const now = new Date('2026-10-07T12:00:00.000Z');
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(now);

		try {
			const ctx = service.createContext(user);
			const result = await ctx.workspaceService!.cleanupTestExecutions('wf-1');

			expect(result.deletedCount).toBe(2);
		} finally {
			vi.useRealTimers();
		}

		expect(executionRepository.find).toHaveBeenCalledWith({
			select: ['id'],
			where: {
				workflowId: 'wf-1',
				mode: 'manual',
				startedAt: LessThan(new Date(now.getTime() - 60 * 60 * 1000)),
			},
		});
		expect(executionPersistence.hardDeleteBy).toHaveBeenCalledWith({
			filters: undefined,
			accessibleWorkflowIds: ['wf-1'],
			deleteConditions: { ids: ['exec-1', 'exec-2'] },
		});
		// Verify deleteByIds is NOT called
		expect(executionRepository.deleteByIds).not.toHaveBeenCalled();
	});

	it('deletes a large set of executions in chunks', async () => {
		workflowFinderService.findWorkflowForUser.mockResolvedValue({ id: 'wf-1' } as never);
		const ids = Array.from({ length: 1201 }, (_, i) => `exec-${i}`);
		executionRepository.find.mockResolvedValue(ids.map((id) => ({ id })) as never);
		executionPersistence.hardDeleteBy.mockResolvedValue(undefined);

		const ctx = service.createContext(user);
		const result = await ctx.workspaceService!.cleanupTestExecutions('wf-1');

		expect(result.deletedCount).toBe(1201);
		const chunks = executionPersistence.hardDeleteBy.mock.calls.map(
			([criteria]) => criteria.deleteConditions.ids,
		);
		expect(chunks.map((chunk) => chunk?.length)).toEqual([500, 500, 201]);
		expect(chunks.flat()).toEqual(ids);
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

// ---------------------------------------------------------------------------
// Credential listing — workflow/project scoping
// ---------------------------------------------------------------------------

describe('credentialService.list — scoping', () => {
	const describedCredential = mock<CredentialsEntity>({
		id: 'described',
		name: 'Postgres account',
		type: 'postgres',
		description: 'x'.repeat(512),
		data: 'encrypted-test-value',
	});

	it.each([
		{ label: 'unscoped', boundProjectId: undefined, options: {} },
		{ label: 'workflow', boundProjectId: undefined, options: { workflowId: 'wf-1' } },
		{ label: 'project', boundProjectId: undefined, options: { projectId: 'proj-1' } },
		{ label: 'bound project', boundProjectId: 'bound-project', options: { projectId: 'other' } },
	])('returns full description metadata for a $label list', async ({ boundProjectId, options }) => {
		credentialsService.getMany.mockResolvedValue([describedCredential]);
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			describedCredential,
		] as never);
		const ctx = service.createContext(user, { projectId: boundProjectId });

		const result = await ctx.credentialService.list(options);

		expect(result).toEqual([
			{
				id: 'described',
				name: 'Postgres account',
				type: 'postgres',
				description: 'x'.repeat(512),
			},
		]);
	});

	it('uses getCredentialsAUserCanUseInAWorkflow when workflowId is provided', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: 'c1', name: 'Slack Shared', type: 'slackApi', description: null },
			{ id: 'c2', name: 'Notion', type: 'notionApi', description: null },
		] as never);

		const ctx = service.createContext(user);
		const result = await ctx.credentialService.list({ type: 'slackApi', workflowId: 'wf-1' });

		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
			workflowId: 'wf-1',
		});
		expect(credentialsService.getMany).not.toHaveBeenCalled();
		// type filter applied post-fetch
		expect(result).toEqual([
			{ id: 'c1', name: 'Slack Shared', type: 'slackApi', description: null },
		]);
	});

	it('uses getCredentialsAUserCanUseInAWorkflow when projectId is provided', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: 'c1', name: 'Slack Shared', type: 'slackApi', description: null },
		] as never);

		const ctx = service.createContext(user);
		await ctx.credentialService.list({ projectId: 'proj-1' });

		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
			projectId: 'proj-1',
		});
		expect(credentialsService.getMany).not.toHaveBeenCalled();
	});

	it('falls back to getMany (broad) when neither workflowId nor projectId is provided', async () => {
		credentialsService.getMany.mockResolvedValue([
			{ id: 'c1', name: 'Slack', type: 'slackApi', description: null },
		] as never);

		const ctx = service.createContext(user);
		await ctx.credentialService.list({ type: 'slackApi' });

		expect(credentialsService.getMany).toHaveBeenCalledWith(user, {
			listQueryOptions: { filter: { type: 'slackApi' } },
			includeGlobal: true,
		});
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).not.toHaveBeenCalled();
	});

	it('scopes to the bound project and ignores caller-supplied workflowId/projectId', async () => {
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: 'c1', name: 'Bound Project Cred', type: 'slackApi', description: null },
		] as never);

		const ctx = service.createContext(user, { projectId: 'bound-project' });
		await ctx.credentialService.list({ workflowId: 'wf-other', projectId: 'project-other' });

		// A bound thread can only ever see its own project's usable credentials —
		// the LLM cannot broaden the list by passing another workflow or project.
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledTimes(1);
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
			projectId: 'bound-project',
		});
		expect(credentialsService.getMany).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Credential listing — eval credential-view allowlist
// ---------------------------------------------------------------------------

describe('credentialService.list — eval allowlist', () => {
	it('filters the listed credentials to the allowlisted IDs', async () => {
		credentialsService.getMany.mockResolvedValue([
			{ id: 'c1', name: 'Slack', type: 'slackApi', description: null },
			{ id: 'c2', name: 'Notion', type: 'notionApi', description: null },
			{ id: 'c3', name: 'Slack #2', type: 'slackApi', description: null },
		] as never);

		const ctx = service.createContext(user, { getCredentialIdAllowlist: () => ['c1', 'c3'] });
		const result = await ctx.credentialService.list();

		expect(result).toEqual([
			{ id: 'c1', name: 'Slack', type: 'slackApi', description: null },
			{ id: 'c3', name: 'Slack #2', type: 'slackApi', description: null },
		]);
	});

	it('reads the allowlist on every call, so a credential allowlisted mid-run is listed', async () => {
		credentialsService.getMany.mockResolvedValue([
			{ id: 'c1', name: 'Slack', type: 'slackApi', description: null },
			{ id: 'c2', name: 'OpenAI', type: 'openAiApi', description: null },
		] as never);
		const allowlist = ['c1'];

		const ctx = service.createContext(user, { getCredentialIdAllowlist: () => allowlist });
		expect((await ctx.credentialService.list()).map((c) => c.id)).toEqual(['c1']);

		// The harness creates a credential on a setup card and re-sends the whole list.
		allowlist.push('c2');
		expect((await ctx.credentialService.list()).map((c) => c.id)).toEqual(['c1', 'c2']);
	});

	it('returns an empty list without querying the credentials service when the allowlist is empty', async () => {
		const ctx = service.createContext(user, { getCredentialIdAllowlist: () => [] });
		const result = await ctx.credentialService.list();

		expect(result).toEqual([]);
		expect(credentialsService.getMany).not.toHaveBeenCalled();
		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).not.toHaveBeenCalled();
	});

	it('does not filter the list when no allowlist is set', async () => {
		const all = [
			{ id: 'c1', name: 'Slack', type: 'slackApi', description: null },
			{ id: 'c2', name: 'Notion', type: 'notionApi', description: null },
		];
		credentialsService.getMany.mockResolvedValue(all as never);

		const ctx = service.createContext(user);
		const result = await ctx.credentialService.list();

		expect(result).toEqual(all);
	});
});

// ---------------------------------------------------------------------------
// Credential adapter — credential ownership revalidation
// ---------------------------------------------------------------------------

describe('credentialService.get — credential ownership revalidation', () => {
	it('returns the full description without credential data', async () => {
		credentialsService.getOne.mockResolvedValue({
			id: 'described',
			name: 'Postgres account',
			type: 'postgres',
			description: 'x'.repeat(512),
			data: { password: 'test-secret' },
		} as never);
		const ctx = service.createContext(user);

		const result = await ctx.credentialService.get('described');

		expect(result).toEqual({
			id: 'described',
			name: 'Postgres account',
			type: 'postgres',
			description: 'x'.repeat(512),
		});
	});

	it('forwards the credential ID to credentialsService.getOne with the bound user', async () => {
		credentialsService.getOne.mockResolvedValue({
			id: 'cred-mine',
			name: 'My Slack',
			type: 'slackApi',
			description: null,
		} as never);

		const ctx = service.createContext(user);
		const result = await ctx.credentialService.get('cred-mine');

		expect(credentialsService.getOne).toHaveBeenCalledWith(user, 'cred-mine', false);
		expect(result).toEqual({
			id: 'cred-mine',
			name: 'My Slack',
			type: 'slackApi',
			description: null,
		});
	});

	it('propagates the NotFoundError when the user cannot access the credential', async () => {
		credentialsService.getOne.mockRejectedValue(
			new Error('Credential with ID "cred-other" could not be found.'),
		);

		const ctx = service.createContext(user);

		await expect(ctx.credentialService.get('cred-other')).rejects.toThrow(
			'Credential with ID "cred-other" could not be found.',
		);
		expect(credentialsService.getOne).toHaveBeenCalledWith(user, 'cred-other', false);
	});
});

// ---------------------------------------------------------------------------
// Bound project: changes stay inside the conversation's project
// ---------------------------------------------------------------------------

describe('bound project write guard', () => {
	it('allows description edits on a protected instance', async () => {
		instanceWriteAccess.isReadOnly.mockReturnValue(true);
		sharedCredentialsRepository.findCredentialOwningProject.mockResolvedValue({
			id: 'bound-project',
		} as never);
		const ctx = service.createContext(user, { projectId: 'bound-project' });
		await ctx.credentialService.updateDescription('cred-1', 'Reporting');
		expect(credentialsService.updateDescription).toHaveBeenCalledWith(user, 'cred-1', 'Reporting');
	});

	type Context = ReturnType<typeof service.createContext>;
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const credentialsRepository = mock<CredentialsRepository>();

	beforeEach(() => {
		userHasScopesMock.mockResolvedValue(true);
		vi.spyOn(Container, 'get').mockImplementation((cls) => {
			if (cls === SharedCredentialsRepository) return sharedCredentialsRepository as never;
			if (cls === CredentialsRepository) return credentialsRepository as never;
			return executionPersistence as never;
		});
	});

	const expectRejectedOutsideProject = async (write: Promise<unknown>) => {
		await expect(write).rejects.toThrow(OutsideThreadProjectError);
	};

	it.each(['bound-project', 'other-project', undefined])(
		'checks the credential owner project before updating a description: %s',
		async (projectId) => {
			credentialsRepository.findExistingIds.mockResolvedValue(['cred-1']);
			sharedCredentialsRepository.findCredentialOwningProject.mockResolvedValue(
				projectId ? ({ id: projectId } as never) : undefined,
			);
			const ctx = service.createContext(user, { projectId: 'bound-project' });
			const write = ctx.credentialService.updateDescription('cred-1', 'Reporting');
			if (projectId === 'bound-project') {
				await write;
				expect(credentialsService.updateDescription).toHaveBeenCalledWith(
					user,
					'cred-1',
					'Reporting',
				);
			} else {
				await expectRejectedOutsideProject(write);
				expect(credentialsService.updateDescription).not.toHaveBeenCalled();
			}
		},
	);

	it('returns not found for an unknown credential description target', async () => {
		sharedCredentialsRepository.findCredentialOwningProject.mockResolvedValue(undefined);
		credentialsRepository.findExistingIds.mockResolvedValue([]);
		const ctx = service.createContext(user, { projectId: 'bound-project' });

		await expect(ctx.credentialService.updateDescription('missing', 'Reporting')).rejects.toThrow(
			CredentialNotFoundError,
		);
		expect(credentialsService.updateDescription).not.toHaveBeenCalled();
	});

	it('rejects tagWorkflow on a workflow owned by another project before loading it', async () => {
		sharedWorkflowRepository.findProjectIds.mockResolvedValue(['other-project']);

		const ctx = service.createContext(user, { projectId: 'bound-project' });

		await expectRejectedOutsideProject(ctx.workspaceService!.tagWorkflow('wf-1', ['new-tag']));
		expect(sharedWorkflowRepository.findProjectIds).toHaveBeenCalledWith('wf-1');
		expect(workflowFinderService.findWorkflowForUser).not.toHaveBeenCalled();
		expect(tagService.save).not.toHaveBeenCalled();
	});

	it('rejects creating a folder in another project before checking access', async () => {
		const ctx = service.createContext(user, { projectId: 'bound-project' });

		await expectRejectedOutsideProject(
			ctx.workspaceService!.createFolder!('Reports', 'other-project'),
		);
		expect(userHasScopesMock).not.toHaveBeenCalled();
		expect(folderService.createFolder).not.toHaveBeenCalled();
	});

	describe('assertInThreadProject', () => {
		type ThreadTarget = Parameters<NonNullable<Context['assertInThreadProject']>>[0];

		const ownResourcesIn = (projectId: string) => {
			sharedWorkflowRepository.findProjectIds.mockResolvedValue([projectId]);
			sharedCredentialsRepository.findCredentialOwningProject.mockResolvedValue({
				id: projectId,
			} as never);
			dataTableRepository.findOneBy.mockResolvedValue({
				id: 'dt-1',
				name: 'Orders',
				projectId,
			} as never);
		};

		const targetsIn = (projectId: string): ThreadTarget[] => [
			{ kind: 'workflow', id: 'wf-1' },
			{ kind: 'credential', id: 'cred-1' },
			{ kind: 'data-table', id: 'dt-1' },
			{ kind: 'project', id: projectId },
		];

		it.each(targetsIn('other-project').map((target) => ({ kind: target.kind, target })))(
			'rejects a $kind target outside the bound project',
			async ({ target }) => {
				ownResourcesIn('other-project');
				const ctx = service.createContext(user, { projectId: 'bound-project' });

				await expectRejectedOutsideProject(ctx.assertInThreadProject!(target));
			},
		);

		it('allows targets in the bound project', async () => {
			ownResourcesIn('bound-project');
			const ctx = service.createContext(user, { projectId: 'bound-project' });

			for (const target of targetsIn('bound-project')) {
				await expect(ctx.assertInThreadProject!(target)).resolves.toBeUndefined();
			}
			expect(sharedWorkflowRepository.findProjectIds).toHaveBeenCalledWith('wf-1');
			expect(sharedCredentialsRepository.findCredentialOwningProject).toHaveBeenCalledWith(
				'cred-1',
			);
			expect(dataTableRepository.findOneBy).toHaveBeenCalledWith({ id: 'dt-1' });
		});

		it('does no lookup when the context has no bound project', async () => {
			workflowService.archive.mockResolvedValue({ id: 'wf-1' } as never);
			const ctx = service.createContext(user);

			for (const target of targetsIn('other-project')) {
				await expect(ctx.assertInThreadProject!(target)).resolves.toBeUndefined();
			}
			await ctx.workflowService.archive('wf-1');
			await ctx.credentialService.delete('cred-1');
			expect(sharedWorkflowRepository.findProjectIds).not.toHaveBeenCalled();
			expect(sharedCredentialsRepository.findCredentialOwningProject).not.toHaveBeenCalled();
			expect(dataTableRepository.findOneBy).not.toHaveBeenCalled();
			expect(dataTableRepository.findBy).not.toHaveBeenCalled();
		});
	});
});
