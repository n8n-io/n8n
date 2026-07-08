import type { LicenseState } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import {
	type CredentialsEntity,
	type CredentialsRepository,
	type IWorkflowDb,
	type ProjectRelationRepository,
	type SharedWorkflowRepository,
	type WorkflowEntity,
	type WorkflowRepository,
	GLOBAL_OWNER_ROLE,
	In,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { type BinaryDataConfig, InstanceSettings } from 'n8n-core';
import {
	createErrorExecutionData,
	type INode,
	type INodesGraphResult,
	type IRun,
	type IWorkflowBase,
	NodeApiError,
	TelemetryHelpers,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { N8N_VERSION } from '@/constants';
import type { DynamicCredentialsProxy } from '@/credentials/dynamic-credentials-proxy';
import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { TelemetryEventRelay, getSemanticVersioning } from '@/events/relays/telemetry.event-relay';
import type { License } from '@/license';
import { OtelConfig } from '@/modules/otel/otel.config';
import type { NodeTypes } from '@/node-types';
import type { Telemetry } from '@/telemetry';

const flushPromises = async () => await new Promise((resolve) => setImmediate(resolve));

const getDefaultInstanceSettingsLoaderConfig = () => ({
	ownerManagedByEnv: false,
	ssoManagedByEnv: false,
	securityPolicyManagedByEnv: false,
	logStreamingManagedByEnv: false,
	mcpManagedByEnv: false,
	communityPackagesManagedByEnv: false,
});

describe('TelemetryEventRelay', () => {
	const telemetry = mock<Telemetry>({
		sanitizeTelemetryProperties: vi.fn((data) => data),
	});
	const license = mock<License>();
	const licenseState = mock<LicenseState>();
	const globalConfig = mock<GlobalConfig>({
		deployment: {
			type: 'default',
		},
		userManagement: {
			emails: {
				mode: 'smtp',
			},
		},
		diagnostics: {
			enabled: true,
		},
		endpoints: {
			metrics: {
				enable: true,
				includeDefaultMetrics: true,
				includeApiEndpoints: false,
				includeCacheMetrics: false,
				includeMessageEventBusMetrics: false,
				includeQueueMetrics: false,
				includeExecutionDataMetrics: false,
				includeWebhookMetrics: false,
				includeFormMetrics: false,
				includeWorkflowInfoMetrics: false,
			},
		},
		logging: {
			level: 'info',
			outputs: ['console'],
		},
		workflowHistoryCompaction: {
			batchDelayMs: 123,
			batchSize: 234,
			optimizingTimeWindowHours: 400,
			trimmingTimeWindowDays: 600,
		},
		host: 'localhost',
		generic: {
			timezone: 'UTC',
			releaseChannel: 'stable',
		},
		defaultLocale: 'en',
		personalization: {
			enabled: true,
		},
		multiMainSetup: {
			enabled: false,
		},
		taskRunners: {
			mode: 'external',
		},
		templates: {
			enabled: true,
		},
		ai: {
			enabled: false,
		},
		license: {
			tenantId: 1,
			autoRenewalEnabled: false,
			activationKey: '',
		},
		database: {
			type: 'sqlite',
		},
		instanceSettingsLoader: getDefaultInstanceSettingsLoaderConfig(),
	});
	const binaryDataConfig = mock<BinaryDataConfig>({
		mode: 'default',
		availableModes: ['default', 'filesystem', 's3'],
	});
	const instanceSettings = mockInstance(InstanceSettings, { isDocker: false, n8nFolder: '/test' });
	const workflowRepository = mock<WorkflowRepository>();
	const nodeTypes = mock<NodeTypes>();
	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const dynamicCredentialsProxy = mock<DynamicCredentialsProxy>();
	const eventService = new EventService();

	let telemetryEventRelay: TelemetryEventRelay;

	beforeAll(async () => {
		telemetryEventRelay = new TelemetryEventRelay(
			eventService,
			telemetry,
			license,
			licenseState,
			globalConfig,
			instanceSettings,
			binaryDataConfig,
			workflowRepository,
			nodeTypes,
			sharedWorkflowRepository,
			projectRelationRepository,
			credentialsRepository,
			dynamicCredentialsProxy,
		);

		await telemetryEventRelay.init();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		globalConfig.diagnostics.enabled = true;
		Object.assign(globalConfig.instanceSettingsLoader, getDefaultInstanceSettingsLoaderConfig());
		const otelConfig = Container.get(OtelConfig);
		otelConfig.enabled = false;
		otelConfig.includeNodeSpans = true;
	});

	describe('init', () => {
		it('with diagnostics enabled, should init telemetry and register listeners', async () => {
			globalConfig.diagnostics.enabled = true;
			const telemetryEventRelay = new TelemetryEventRelay(
				eventService,
				telemetry,
				license,
				licenseState,
				globalConfig,
				instanceSettings,
				binaryDataConfig,
				workflowRepository,
				nodeTypes,
				sharedWorkflowRepository,
				projectRelationRepository,
				credentialsRepository,
				dynamicCredentialsProxy,
			);
			// @ts-expect-error Private method
			const setupListenersSpy = vi.spyOn(telemetryEventRelay, 'setupListeners');

			await telemetryEventRelay.init();

			expect(telemetry.init).toHaveBeenCalled();
			expect(setupListenersSpy).toHaveBeenCalled();
		});

		it('with diagnostics disabled, should neither init telemetry nor register listeners', async () => {
			globalConfig.diagnostics.enabled = false;
			const telemetryEventRelay = new TelemetryEventRelay(
				eventService,
				telemetry,
				license,
				licenseState,
				globalConfig,
				instanceSettings,
				binaryDataConfig,
				workflowRepository,
				nodeTypes,
				sharedWorkflowRepository,
				projectRelationRepository,
				credentialsRepository,
				dynamicCredentialsProxy,
			);
			// @ts-expect-error Private method
			const setupListenersSpy = vi.spyOn(telemetryEventRelay, 'setupListeners');

			await telemetryEventRelay.init();

			expect(telemetry.init).not.toHaveBeenCalled();
			expect(setupListenersSpy).not.toHaveBeenCalled();
		});
	});

	describe('project events', () => {
		it('should track on `team-project-updated` event', () => {
			const event: RelayEventMap['team-project-updated'] = {
				userId: 'user123',
				role: 'global:owner',
				members: [
					{ userId: 'user456', role: 'project:admin' },
					{ userId: 'user789', role: 'project:editor' },
				],
				projectId: 'project123',
			};

			eventService.emit('team-project-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('Project settings updated', {
				user_id: 'user123',
				role: 'global:owner',
				members: [
					{ user_id: 'user456', role: 'project:admin' },
					{ user_id: 'user789', role: 'project:editor' },
				],
				project_id: 'project123',
			});
		});

		it('should track on `team-project-updated` event without members', () => {
			const event: RelayEventMap['team-project-updated'] = {
				userId: 'user123',
				role: 'global:owner',
				projectId: 'project123',
			};

			eventService.emit('team-project-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('Project settings updated', {
				user_id: 'user123',
				role: 'global:owner',
				project_id: 'project123',
			});
		});

		it('should track project custom telemetry tag count on `team-project-updated` event', () => {
			const event: RelayEventMap['team-project-updated'] = {
				userId: 'user123',
				role: 'global:owner',
				projectId: 'project123',
				otelProjectCustomTagsCount: 2,
			};

			eventService.emit('team-project-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('Project settings updated', {
				user_id: 'user123',
				role: 'global:owner',
				project_id: 'project123',
				otel_project_custom_tags_count: 2,
			});
		});

		it('should track on `team-project-deleted` event', () => {
			const event: RelayEventMap['team-project-deleted'] = {
				userId: 'user123',
				role: 'global:owner',
				projectId: 'project123',
				removalType: 'delete',
			};

			eventService.emit('team-project-deleted', event);

			expect(telemetry.track).toHaveBeenCalledWith('User deleted project', {
				user_id: 'user123',
				role: 'global:owner',
				project_id: 'project123',
				removal_type: 'delete',
				target_project_id: undefined,
			});
		});

		it('should track on `team-project-created` event', () => {
			const event: RelayEventMap['team-project-created'] = {
				userId: 'user123',
				role: 'global:owner',
			};

			eventService.emit('team-project-created', event);

			expect(telemetry.track).toHaveBeenCalledWith('User created project', {
				user_id: 'user123',
				role: 'global:owner',
			});
		});
	});

	describe('source control events', () => {
		it('should track on `source-control-settings-updated` event', () => {
			const event: RelayEventMap['source-control-settings-updated'] = {
				branchName: 'main',
				readOnlyInstance: false,
				repoType: 'github',
				connected: true,
				connectionType: 'ssh',
			};

			eventService.emit('source-control-settings-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated source control settings', {
				branch_name: 'main',
				read_only_instance: false,
				repo_type: 'github',
				connected: true,
				connection_type: 'ssh',
			});
		});

		it('should track on `source-control-user-started-pull-ui` event', () => {
			const event: RelayEventMap['source-control-user-started-pull-ui'] = {
				workflowUpdates: 5,
				workflowConflicts: 2,
				credConflicts: 1,
			};

			eventService.emit('source-control-user-started-pull-ui', event);

			expect(telemetry.track).toHaveBeenCalledWith('User started pull via UI', {
				workflow_updates: 5,
				workflow_conflicts: 2,
				cred_conflicts: 1,
			});
		});

		it('should track on `source-control-user-finished-pull-ui` event', () => {
			const event: RelayEventMap['source-control-user-finished-pull-ui'] = {
				userId: 'userId',
				workflowUpdates: 3,
			};

			eventService.emit('source-control-user-finished-pull-ui', event);

			expect(telemetry.track).toHaveBeenCalledWith('User finished pull via UI', {
				user_id: 'userId',
				workflow_updates: 3,
			});
		});

		it('should track on `source-control-user-pulled-api` event', () => {
			const event: RelayEventMap['source-control-user-pulled-api'] = {
				workflowUpdates: 2,
				forced: false,
			};

			eventService.emit('source-control-user-pulled-api', event);

			expect(telemetry.track).toHaveBeenCalledWith('User pulled via API', {
				workflow_updates: 2,
				forced: false,
			});
		});

		it('should track on `source-control-user-started-push-ui` event', () => {
			const event: RelayEventMap['source-control-user-started-push-ui'] = {
				userId: 'userId',
				workflowsEligible: 10,
				workflowsEligibleWithConflicts: 2,
				credsEligible: 5,
				credsEligibleWithConflicts: 1,
				variablesEligible: 3,
			};

			eventService.emit('source-control-user-started-push-ui', event);

			expect(telemetry.track).toHaveBeenCalledWith('User started push via UI', {
				user_id: 'userId',
				workflows_eligible: 10,
				workflows_eligible_with_conflicts: 2,
				creds_eligible: 5,
				creds_eligible_with_conflicts: 1,
				variables_eligible: 3,
			});
		});

		it('should track on `source-control-user-finished-push-ui` event', () => {
			const event: RelayEventMap['source-control-user-finished-push-ui'] = {
				userId: 'userId',
				workflowsEligible: 10,
				workflowsPushed: 8,
				credsPushed: 5,
				variablesPushed: 3,
			};

			eventService.emit('source-control-user-finished-push-ui', event);

			expect(telemetry.track).toHaveBeenCalledWith('User finished push via UI', {
				user_id: 'userId',
				workflows_eligible: 10,
				workflows_pushed: 8,
				creds_pushed: 5,
				variables_pushed: 3,
			});
		});
	});

	describe('license events', () => {
		it('should track on `license-renewal-attempted` event', () => {
			const event: RelayEventMap['license-renewal-attempted'] = {
				success: true,
			};

			eventService.emit('license-renewal-attempted', event);

			expect(telemetry.track).toHaveBeenCalledWith('Instance attempted to refresh license', {
				success: true,
			});
		});
	});

	describe('variable events', () => {
		it('should track on `variable-created` event without projectId', () => {
			const event: RelayEventMap['variable-created'] = {
				user: {
					id: 'user123',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					role: { slug: 'global:owner' },
				},
				variableId: 'var456',
				variableKey: 'MY_VARIABLE',
			};

			eventService.emit('variable-created', event);

			expect(telemetry.track).toHaveBeenCalledWith('User created variable', {
				user_id: 'user123',
			});
		});

		it('should track on `variable-created` event with projectId', () => {
			const event: RelayEventMap['variable-created'] = {
				user: {
					id: 'user123',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					role: { slug: 'global:owner' },
				},
				variableId: 'var456',
				variableKey: 'MY_VARIABLE',
				projectId: 'projectId',
			};

			eventService.emit('variable-created', event);

			expect(telemetry.track).toHaveBeenCalledWith('User created variable', {
				user_id: 'user123',
				project_id: 'projectId',
			});
		});

		it('should track on `variable-updated` event without projectId', () => {
			const event: RelayEventMap['variable-updated'] = {
				user: {
					id: 'user123',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					role: { slug: 'global:owner' },
				},
				variableId: 'var456',
				variableKey: 'MY_VARIABLE',
			};

			eventService.emit('variable-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated variable', {
				user_id: 'user123',
			});
		});

		it('should track on `variable-updated` event with projectId', () => {
			const event: RelayEventMap['variable-updated'] = {
				user: {
					id: 'user123',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					role: { slug: 'global:owner' },
				},
				variableId: 'var456',
				variableKey: 'MY_VARIABLE',
				projectId: 'projectId',
			};

			eventService.emit('variable-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated variable', {
				user_id: 'user123',
				project_id: 'projectId',
			});
		});

		it('should track on `variable-deleted` event without projectId', () => {
			const event: RelayEventMap['variable-deleted'] = {
				user: {
					id: 'user123',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					role: { slug: 'global:owner' },
				},
				variableId: 'var456',
				variableKey: 'MY_VARIABLE',
			};

			eventService.emit('variable-deleted', event);

			expect(telemetry.track).toHaveBeenCalledWith('User deleted variable', {
				user_id: 'user123',
			});
		});

		it('should track on `variable-deleted` event with projectId', () => {
			const event: RelayEventMap['variable-deleted'] = {
				user: {
					id: 'user123',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					role: { slug: 'global:owner' },
				},
				variableId: 'var456',
				variableKey: 'MY_VARIABLE',
				projectId: 'projectId',
			};

			eventService.emit('variable-deleted', event);

			expect(telemetry.track).toHaveBeenCalledWith('User deleted variable', {
				user_id: 'user123',
				project_id: 'projectId',
			});
		});
	});

	describe('external secrets events', () => {
		it('should track on `external-secrets-provider-settings-saved` event', () => {
			const event: RelayEventMap['external-secrets-provider-settings-saved'] = {
				userId: 'user123',
				vaultType: 'aws',
				isValid: true,
				isNew: false,
			};

			eventService.emit('external-secrets-provider-settings-saved', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated external secrets settings', {
				user_id: 'user123',
				vault_type: 'aws',
				is_valid: true,
				is_new: false,
				error_message: undefined,
			});
		});

		it('should track on `external-secrets-provider-reloaded` event', () => {
			const event: RelayEventMap['external-secrets-provider-reloaded'] = {
				vaultType: 'aws',
			};

			eventService.emit('external-secrets-provider-reloaded', event);

			expect(telemetry.track).toHaveBeenCalledWith('User reloaded external secrets', {
				vault_type: 'aws',
			});
		});

		it('should track on `external-secrets-connection-created` event with global scope', () => {
			const event: RelayEventMap['external-secrets-connection-created'] = {
				userId: 'user123',
				userRole: 'global:owner',
				providerKey: 'provider-key-123',
				vaultType: 'gcp',
				projects: [],
			};

			eventService.emit('external-secrets-connection-created', event);

			expect(telemetry.track).toHaveBeenCalledWith('User created external secrets connection', {
				user_id: 'user123',
				user_role: 'global:owner',
				vault_type: 'gcp',
				scope: 'global',
				project_ids: [],
			});
		});

		it('should track on `external-secrets-connection-created` event with project scope', () => {
			const event: RelayEventMap['external-secrets-connection-created'] = {
				userId: 'user123',
				userRole: 'global:member',
				providerKey: 'provider-key-123',
				vaultType: 'gcp',
				projects: [
					{ id: 'project1', name: 'Project 1' },
					{ id: 'project2', name: 'Project 2' },
				],
			};

			eventService.emit('external-secrets-connection-created', event);

			expect(telemetry.track).toHaveBeenCalledWith('User created external secrets connection', {
				user_id: 'user123',
				user_role: 'global:member',
				vault_type: 'gcp',
				scope: 'project',
				project_ids: ['project1', 'project2'],
			});
		});

		it('should track on `external-secrets-connection-updated` event with global scope', () => {
			const event: RelayEventMap['external-secrets-connection-updated'] = {
				userId: 'user123',
				userRole: 'global:owner',
				providerKey: 'provider-key-123',
				vaultType: 'aws',
				projects: [],
			};

			eventService.emit('external-secrets-connection-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated external secrets connection', {
				user_id: 'user123',
				user_role: 'global:owner',
				vault_type: 'aws',
				scope: 'global',
				project_ids: [],
			});
		});

		it('should track on `external-secrets-connection-updated` event with project scope', () => {
			const event: RelayEventMap['external-secrets-connection-updated'] = {
				userId: 'user123',
				userRole: 'global:member',
				providerKey: 'provider-key-123',
				vaultType: 'aws',
				projects: [{ id: 'project1', name: 'Project 1' }],
			};

			eventService.emit('external-secrets-connection-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated external secrets connection', {
				user_id: 'user123',
				user_role: 'global:member',
				vault_type: 'aws',
				scope: 'project',
				project_ids: ['project1'],
			});
		});

		it('should track on `external-secrets-connection-deleted` event with global scope', () => {
			const event: RelayEventMap['external-secrets-connection-deleted'] = {
				userId: 'user123',
				userRole: 'global:owner',
				providerKey: 'provider-key-123',
				vaultType: 'vault',
				projects: [],
			};

			eventService.emit('external-secrets-connection-deleted', event);

			expect(telemetry.track).toHaveBeenCalledWith('User deleted external secrets connection', {
				user_id: 'user123',
				user_role: 'global:owner',
				vault_type: 'vault',
				scope: 'global',
				project_ids: [],
			});
		});

		it('should track on `external-secrets-connection-deleted` event with project scope', () => {
			const event: RelayEventMap['external-secrets-connection-deleted'] = {
				userId: 'user123',
				userRole: 'global:member',
				providerKey: 'provider-key-123',
				vaultType: 'vault',
				projects: [
					{ id: 'project1', name: 'Project 1' },
					{ id: 'project2', name: 'Project 2' },
					{ id: 'project3', name: 'Project 3' },
				],
			};

			eventService.emit('external-secrets-connection-deleted', event);

			expect(telemetry.track).toHaveBeenCalledWith('User deleted external secrets connection', {
				user_id: 'user123',
				user_role: 'global:member',
				vault_type: 'vault',
				scope: 'project',
				project_ids: ['project1', 'project2', 'project3'],
			});
		});

		it('should track on `external-secrets-system-roles-toggled` event', () => {
			const event: RelayEventMap['external-secrets-system-roles-toggled'] = {
				userId: 'user123',
				enabled: true,
			};

			eventService.emit('external-secrets-system-roles-toggled', event);

			expect(telemetry.track).toHaveBeenCalledWith('User toggled external secrets system roles', {
				user_id: 'user123',
				enabled: true,
			});
		});
	});

	describe('custom role events', () => {
		it('should track on `custom-role-created` event', () => {
			const event: RelayEventMap['custom-role-created'] = {
				userId: 'user123',
				roleSlug: 'project:my-role-abc123',
				scopes: ['workflow:create', 'workflow:read', 'credential:read'],
			};

			eventService.emit('custom-role-created', event);

			expect(telemetry.track).toHaveBeenCalledWith('User created custom role', {
				user_id: 'user123',
				role_slug: 'project:my-role-abc123',
				scopes: ['workflow:create', 'workflow:read', 'credential:read'],
			});
		});

		it('should track on `custom-role-updated` event', () => {
			const event: RelayEventMap['custom-role-updated'] = {
				userId: 'user123',
				roleSlug: 'project:my-role-abc123',
				scopes: ['workflow:create', 'workflow:read'],
			};

			eventService.emit('custom-role-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated custom role', {
				user_id: 'user123',
				role_slug: 'project:my-role-abc123',
				scopes: ['workflow:create', 'workflow:read'],
			});
		});

		it('should track on `custom-role-deleted` event', () => {
			const event: RelayEventMap['custom-role-deleted'] = {
				userId: 'user123',
				roleSlug: 'project:my-role-abc123',
			};

			eventService.emit('custom-role-deleted', event);

			expect(telemetry.track).toHaveBeenCalledWith('User deleted custom role', {
				user_id: 'user123',
				role_slug: 'project:my-role-abc123',
			});
		});
	});

	describe('public API events', () => {
		it('should buffer on `public-api-invoked` event', () => {
			const event: RelayEventMap['public-api-invoked'] = {
				userId: 'user123',
				path: '/api/v1/workflows',
				method: 'GET',
				apiVersion: 'v1',
				userAgent: 'n8n-cli',
			};

			eventService.emit('public-api-invoked', event);

			expect(telemetry.trackApiInvocation).toHaveBeenCalledWith({
				user_id: 'user123',
				path: '/api/v1/workflows',
				method: 'GET',
				api_version: 'v1',
				user_agent: 'n8n-cli',
			});
		});

		it('should track on `public-api-key-created` event', () => {
			const event: RelayEventMap['public-api-key-created'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				publicApi: true,
			};

			eventService.emit('public-api-key-created', event);

			expect(telemetry.track).toHaveBeenCalledWith('API key created', {
				user_id: 'user123',
				public_api: true,
			});
		});

		it('should track on `public-api-key-deleted` event', () => {
			const event: RelayEventMap['public-api-key-deleted'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				publicApi: true,
				isOwn: true,
			};

			eventService.emit('public-api-key-deleted', event);

			expect(telemetry.track).toHaveBeenCalledWith('API key deleted', {
				user_id: 'user123',
				public_api: true,
				is_own: true,
			});
		});
	});

	describe('community package events', () => {
		it('should track on `community-package-installed` event', () => {
			const event: RelayEventMap['community-package-installed'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				inputString: 'n8n-nodes-package',
				packageName: 'n8n-nodes-package',
				success: true,
				packageVersion: '1.0.0',
				packageNodeNames: ['CustomNode1', 'CustomNode2'],
				packageAuthor: 'John Smith',
				packageAuthorEmail: 'john@example.com',
			};

			eventService.emit('community-package-installed', event);

			expect(telemetry.track).toHaveBeenCalledWith('cnr package install finished', {
				user_id: 'user123',
				input_string: 'n8n-nodes-package',
				package_name: 'n8n-nodes-package',
				success: true,
				package_version: '1.0.0',
				package_node_names: ['CustomNode1', 'CustomNode2'],
				package_author: 'John Smith',
				package_author_email: 'john@example.com',
				failure_reason: undefined,
			});
		});

		it('should track on `community-package-updated` event', () => {
			const event: RelayEventMap['community-package-updated'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				packageName: 'n8n-nodes-package',
				packageVersionCurrent: '1.0.0',
				packageVersionNew: '1.1.0',
				packageNodeNames: ['CustomNode1', 'CustomNode2'],
				packageAuthor: 'John Smith',
				packageAuthorEmail: 'john@example.com',
			};

			eventService.emit('community-package-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('cnr package updated', {
				user_id: 'user123',
				package_name: 'n8n-nodes-package',
				package_version_current: '1.0.0',
				package_version_new: '1.1.0',
				package_node_names: ['CustomNode1', 'CustomNode2'],
				package_author: 'John Smith',
				package_author_email: 'john@example.com',
			});
		});

		it('should track on `community-package-deleted` event', () => {
			const event: RelayEventMap['community-package-deleted'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				packageName: 'n8n-nodes-package',
				packageVersion: '1.0.0',
				packageNodeNames: ['CustomNode1', 'CustomNode2'],
				packageAuthor: 'John Smith',
				packageAuthorEmail: 'john@example.com',
			};

			eventService.emit('community-package-deleted', event);

			expect(telemetry.track).toHaveBeenCalledWith('cnr package deleted', {
				user_id: 'user123',
				package_name: 'n8n-nodes-package',
				package_version: '1.0.0',
				package_node_names: ['CustomNode1', 'CustomNode2'],
				package_author: 'John Smith',
				package_author_email: 'john@example.com',
			});
		});
	});

	describe('credentials events', () => {
		it('should track on `credentials-created` event', () => {
			const event: RelayEventMap['credentials-created'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				credentialType: 'github',
				credentialId: 'cred123',
				publicApi: false,
				projectId: 'project123',
				projectType: 'personal',
				isDynamic: false,
				supportsManagedAuth: true,
				usesManagedAuth: true,
			};

			eventService.emit('credentials-created', event);

			expect(telemetry.track).toHaveBeenCalledWith('User created credentials', {
				user_id: 'user123',
				user_role: GLOBAL_OWNER_ROLE.slug,
				credential_type: 'github',
				credential_id: 'cred123',
				project_id: 'project123',
				project_type: 'personal',
				is_private: false,
				uses_external_secrets: false,
				jwe_enabled: false,
				credential_supports_managed_auth: true,
				credential_uses_managed_auth: true,
			});
		});

		it('should track on `credentials-shared` event', () => {
			const event: RelayEventMap['credentials-shared'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				credentialType: 'github',
				credentialId: 'cred123',
				userIdSharer: 'user123',
				userIdsShareesAdded: ['user456', 'user789'],
				shareesRemoved: 1,
			};

			eventService.emit('credentials-shared', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated cred sharing', {
				user_id: 'user123',
				user_role: GLOBAL_OWNER_ROLE.slug,
				credential_type: 'github',
				credential_id: 'cred123',
				user_id_sharer: 'user123',
				user_ids_sharees_added: ['user456', 'user789'],
				sharees_removed: 1,
			});
		});

		it('should track on `credentials-updated` event', () => {
			const event: RelayEventMap['credentials-updated'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				credentialId: 'cred123',
				credentialType: 'github',
				isDynamic: true,
			};

			eventService.emit('credentials-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated credentials', {
				user_id: 'user123',
				user_role: GLOBAL_OWNER_ROLE.slug,
				credential_type: 'github',
				credential_id: 'cred123',
				is_private: true,
				uses_external_secrets: false,
				jwe_enabled: false,
				credential_supports_managed_auth: false,
				credential_uses_managed_auth: false,
			});
		});

		it('should track on `credentials-deleted` event', () => {
			const event: RelayEventMap['credentials-deleted'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				credentialId: 'cred123',
				credentialType: 'github',
			};

			eventService.emit('credentials-deleted', event);

			expect(telemetry.track).toHaveBeenCalledWith('User deleted credentials', {
				user_id: 'user123',
				user_role: GLOBAL_OWNER_ROLE.slug,
				credential_type: 'github',
				credential_id: 'cred123',
			});
		});

		it('should track on `private-credential-created` event', () => {
			const event: RelayEventMap['private-credential-created'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				credentialId: 'cred123',
				credentialType: 'gmailOAuth2',
				projectId: 'project456',
				projectType: 'personal',
			};

			eventService.emit('private-credential-created', event);

			expect(telemetry.track).toHaveBeenCalledWith('User created private credential', {
				user_id: 'user123',
				user_role: GLOBAL_OWNER_ROLE.slug,
				credential_type: 'gmailOAuth2',
				credential_id: 'cred123',
				project_id: 'project456',
				project_type: 'personal',
			});
		});

		it('should track on `private-credential-toggled-to-private` event', () => {
			const event: RelayEventMap['private-credential-toggled-to-private'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				credentialId: 'cred123',
				credentialType: 'gmailOAuth2',
			};

			eventService.emit('private-credential-toggled-to-private', event);

			expect(telemetry.track).toHaveBeenCalledWith('User made credential private', {
				user_id: 'user123',
				user_role: GLOBAL_OWNER_ROLE.slug,
				credential_type: 'gmailOAuth2',
				credential_id: 'cred123',
			});
		});

		it('should track on `private-credential-toggled-to-static` event', () => {
			const event: RelayEventMap['private-credential-toggled-to-static'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				credentialId: 'cred123',
				credentialType: 'gmailOAuth2',
			};

			eventService.emit('private-credential-toggled-to-static', event);

			expect(telemetry.track).toHaveBeenCalledWith('User made credential static', {
				user_id: 'user123',
				user_role: GLOBAL_OWNER_ROLE.slug,
				credential_type: 'gmailOAuth2',
				credential_id: 'cred123',
			});
		});

		it('should track on `private-credential-deleted` event', () => {
			const event: RelayEventMap['private-credential-deleted'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				credentialId: 'cred123',
				credentialType: 'gmailOAuth2',
			};

			eventService.emit('private-credential-deleted', event);

			expect(telemetry.track).toHaveBeenCalledWith('User deleted private credential', {
				user_id: 'user123',
				user_role: GLOBAL_OWNER_ROLE.slug,
				credential_type: 'gmailOAuth2',
				credential_id: 'cred123',
			});
		});

		it('should track on `private-credential-user-connected` event', () => {
			const event: RelayEventMap['private-credential-user-connected'] = {
				user: { id: 'user123' },
				credentialId: 'cred123',
				credentialType: 'gmailOAuth2',
				supportsManagedAuth: true,
				usesManagedAuth: true,
			};

			eventService.emit('private-credential-user-connected', event);

			expect(telemetry.track).toHaveBeenCalledWith('User connected to private credential', {
				user_id: 'user123',
				user_role: undefined,
				credential_type: 'gmailOAuth2',
				credential_id: 'cred123',
				credential_supports_managed_auth: true,
				credential_uses_managed_auth: true,
			});
		});
	});

	describe('LDAP events', () => {
		it('should track on `ldap-general-sync-finished` event', () => {
			const event: RelayEventMap['ldap-general-sync-finished'] = {
				type: 'full',
				succeeded: true,
				usersSynced: 10,
				error: '',
			};

			eventService.emit('ldap-general-sync-finished', event);

			expect(telemetry.track).toHaveBeenCalledWith('Ldap general sync finished', {
				type: 'full',
				succeeded: true,
				users_synced: 10,
				error: '',
			});
		});

		it('should track on `ldap-settings-updated` event', () => {
			const event: RelayEventMap['ldap-settings-updated'] = {
				userId: 'user123',
				loginIdAttribute: 'uid',
				firstNameAttribute: 'givenName',
				lastNameAttribute: 'sn',
				emailAttribute: 'mail',
				ldapIdAttribute: 'entryUUID',
				searchPageSize: 100,
				searchTimeout: 60,
				synchronizationEnabled: true,
				synchronizationInterval: 60,
				loginLabel: 'LDAP Login',
				loginEnabled: true,
			};

			eventService.emit('ldap-settings-updated', {
				...event,
			});

			const { userId: _, ...rest } = event;

			expect(telemetry.track).toHaveBeenCalledWith('User updated Ldap settings', {
				user_id: 'user123',
				...rest,
			});
		});

		it('should track on `ldap-login-sync-failed` event', () => {
			const event: RelayEventMap['ldap-login-sync-failed'] = {
				error: 'Connection failed',
			};

			eventService.emit('ldap-login-sync-failed', event);

			expect(telemetry.track).toHaveBeenCalledWith('Ldap login sync failed', {
				error: 'Connection failed',
			});
		});

		it('should track on `login-failed-due-to-ldap-disabled` event', () => {
			const event: RelayEventMap['login-failed-due-to-ldap-disabled'] = {
				userId: 'user123',
			};

			eventService.emit('login-failed-due-to-ldap-disabled', event);

			expect(telemetry.track).toHaveBeenCalledWith('User login failed since ldap disabled', {
				user_ud: 'user123',
			});
		});
	});

	describe('SSO events', () => {
		it('should track on `sso-user-project-access-updated` event', () => {
			const event: RelayEventMap['sso-user-project-access-updated'] = {
				userId: 'user123',
				projectsRemoved: 2,
				projectsAdded: 3,
			};

			eventService.emit('sso-user-project-access-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('Sso user project access update', {
				user_id: 'user123',
				projects_removed: 2,
				projects_added: 3,
			});
		});

		it('should track on `sso-user-instance-role-updated` event', () => {
			const event: RelayEventMap['sso-user-instance-role-updated'] = {
				userId: 'user123',
				role: 'global:admin',
			};

			eventService.emit('sso-user-instance-role-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('Sso user instance role update', {
				user_id: 'user123',
				role: 'global:admin',
			});
		});
	});

	describe('workflow events', () => {
		it('should track on `workflow-created` event', async () => {
			const event: RelayEventMap['workflow-created'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflow: mock<IWorkflowBase>({
					id: 'workflow123',
					name: 'Test Workflow',
					nodes: [],
					connections: {},
					staticData: {},
				}),
				publicApi: false,
				projectId: 'project123',
				projectType: 'personal',
			};

			eventService.emit('workflow-created', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith('User created workflow', {
				user_id: 'user123',
				workflow_id: 'workflow123',
				node_graph_string: expect.any(String),
				public_api: false,
				project_id: 'project123',
				project_type: 'personal',
				otel_workflow_custom_tags_count: 0,
				otel_nodes_with_custom_tags_count: 0,
				otel_node_custom_tags_count: 0,
				source: 'ui',
			});
		});

		it('should track OTEL custom telemetry tag counts on `workflow-created` event', async () => {
			const event: RelayEventMap['workflow-created'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflow: mock<IWorkflowBase>({
					id: 'workflow123',
					name: 'Test Workflow',
					connections: {},
					settings: {
						customTelemetryTags: [{ key: 'env', value: 'production' }],
					},
					nodes: [
						{
							id: 'node-1',
							name: 'Node 1',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
							customTelemetryTags: {
								tag: [
									{ key: 'node-env', value: 'production' },
									{ key: 'node-team', value: 'engineering' },
								],
							},
						},
						{
							id: 'node-2',
							name: 'Node 2',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
							customTelemetryTags: {
								tag: [{ key: 'node-region', value: 'eu' }],
							},
						},
					],
				}),
				publicApi: false,
				projectId: 'project123',
				projectType: 'personal',
			};

			eventService.emit('workflow-created', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith(
				'User created workflow',
				expect.objectContaining({
					otel_workflow_custom_tags_count: 1,
					otel_nodes_with_custom_tags_count: 2,
					otel_node_custom_tags_count: 3,
				}),
			);
		});

		it('should truncate node_graph_string when it exceeds size limit', async () => {
			const largeNodeGraph: INodesGraphResult = {
				nodeGraph: {
					node_types: Array.from({ length: 1000 }, (_, i) => `n8n-nodes-base.node${i}`),
					node_connections: Array.from({ length: 1000 }, (_, i) => ({
						start: `${i}`,
						end: `${i + 1}`,
					})),
					nodes: Object.fromEntries(
						Array.from({ length: 500 }, (_, i) => [
							`${i}`,
							{
								id: `node-${i}`,
								type: `n8n-nodes-base.veryLongNodeTypeName${i}`,
								version: 1,
								position: [i * 100, i * 100],
							},
						]),
					),
					notes: {},
					is_pinned: false,
				},
				nameIndices: {},
				webhookNodeNames: [],
				evaluationTriggerNodeNames: [],
			};

			vi.spyOn(TelemetryHelpers, 'generateNodesGraph').mockReturnValueOnce(largeNodeGraph);

			const event: RelayEventMap['workflow-created'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflow: mock<IWorkflowBase>({
					id: 'workflow123',
					name: 'Test Workflow',
					nodes: [],
					connections: {},
					staticData: {},
				}),
				publicApi: false,
				projectId: 'project123',
				projectType: 'personal',
			};

			eventService.emit('workflow-created', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith('User created workflow', {
				user_id: 'user123',
				workflow_id: 'workflow123',
				node_graph_string: '{}',
				public_api: false,
				project_id: 'project123',
				project_type: 'personal',
				otel_workflow_custom_tags_count: 0,
				otel_nodes_with_custom_tags_count: 0,
				otel_node_custom_tags_count: 0,
				source: 'ui',
			});
		});

		it('should track on `workflow-activated` event with source', async () => {
			const event: RelayEventMap['workflow-activated'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflowId: 'workflow123',
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					nodes: [],
					connections: {},
				}),
				publicApi: true,
				source: 'api',
			};

			eventService.emit('workflow-activated', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith('User activated workflow', {
				user_id: 'user123',
				workflow_id: 'workflow123',
				public_api: true,
				source: 'api',
				private_credentials_count: 0,
				private_credential_types: [],
			});
		});

		it('should default source to ui on `workflow-activated` event', async () => {
			const event: RelayEventMap['workflow-activated'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflowId: 'workflow123',
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					nodes: [],
					connections: {},
				}),
				publicApi: false,
			};

			eventService.emit('workflow-activated', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith('User activated workflow', {
				user_id: 'user123',
				workflow_id: 'workflow123',
				public_api: false,
				source: 'ui',
				private_credentials_count: 0,
				private_credential_types: [],
			});
		});

		it('should track on `workflow-deactivated` event with source', () => {
			const event: RelayEventMap['workflow-deactivated'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflowId: 'workflow123',
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					nodes: [],
					connections: {},
				}),
				publicApi: true,
				deactivatedVersionId: 'version-abc-123',
				source: 'n8n-mcp',
			};

			eventService.emit('workflow-deactivated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User deactivated workflow', {
				user_id: 'user123',
				workflow_id: 'workflow123',
				public_api: true,
				deactivated_version_id: 'version-abc-123',
				source: 'n8n-mcp',
			});
		});

		it('should default source to ui on `workflow-deactivated` event', () => {
			const event: RelayEventMap['workflow-deactivated'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflowId: 'workflow123',
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					nodes: [],
					connections: {},
				}),
				publicApi: false,
				deactivatedVersionId: null,
			};

			eventService.emit('workflow-deactivated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User deactivated workflow', {
				user_id: 'user123',
				workflow_id: 'workflow123',
				public_api: false,
				deactivated_version_id: null,
				source: 'ui',
			});
		});

		it('should track on `workflow-archived` event', () => {
			const event: RelayEventMap['workflow-archived'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflowId: 'workflow123',
				publicApi: false,
			};

			eventService.emit('workflow-archived', event);

			expect(telemetry.track).toHaveBeenCalledWith('User archived workflow', {
				user_id: 'user123',
				workflow_id: 'workflow123',
				public_api: false,
			});
		});

		it('should track on `workflow-unarchived` event', () => {
			const event: RelayEventMap['workflow-unarchived'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflowId: 'workflow123',
				publicApi: false,
			};

			eventService.emit('workflow-unarchived', event);

			expect(telemetry.track).toHaveBeenCalledWith('User unarchived workflow', {
				user_id: 'user123',
				workflow_id: 'workflow123',
				public_api: false,
			});
		});

		it('should track on `workflow-deleted` event', () => {
			const event: RelayEventMap['workflow-deleted'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflowId: 'workflow123',
				publicApi: false,
			};

			eventService.emit('workflow-deleted', event);

			expect(telemetry.track).toHaveBeenCalledWith('User deleted workflow', {
				user_id: 'user123',
				workflow_id: 'workflow123',
				public_api: false,
			});
		});

		it('should track on `workflow-post-execute` event', async () => {
			const event: RelayEventMap['workflow-post-execute'] = {
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					nodes: [],
				}),
				userId: 'user123',
				executionId: 'execution123',
			};

			eventService.emit('workflow-post-execute', event);

			await flushPromises();

			expect(telemetry.trackWorkflowExecution).toHaveBeenCalledWith({
				execution_source: 'user',
				is_manual: false,
				success: false,
				user_id: 'user123',
				version_cli: N8N_VERSION,
				workflow_id: 'workflow123',
				used_private_credentials: false,
				private_credentials_attempted_count: 0,
				private_credentials_resolved_count: 0,
			});
		});

		it('should set `used_private_credentials` when a private credential resolution was attempted but failed', async () => {
			const event: RelayEventMap['workflow-post-execute'] = {
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					nodes: [],
				}),
				userId: 'user123',
				executionId: 'execution123',
				runData: {
					data: {
						resultData: {
							runData: {
								// Node failed to resolve a private credential (e.g. user not connected):
								// `attemptedDynamicCredentials` is set even though `usedDynamicCredentials` is not.
								Slack: [{ attemptedDynamicCredentials: true, executionStatus: 'error' }],
							},
						},
					},
				} as unknown as IRun,
			};

			eventService.emit('workflow-post-execute', event);

			await flushPromises();

			expect(telemetry.trackWorkflowExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					used_private_credentials: true,
					private_credentials_attempted_count: 1,
					private_credentials_resolved_count: 0,
				}),
			);
		});

		it('should count attempted vs resolved private credentials and the effective resolver', async () => {
			dynamicCredentialsProxy.getEffectiveResolverId.mockReturnValueOnce('system-n8n');

			const event: RelayEventMap['workflow-post-execute'] = {
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					nodes: [],
				}),
				userId: 'user123',
				executionId: 'execution123',
				runData: {
					data: {
						resultData: {
							runData: {
								Slack: [{ attemptedDynamicCredentials: true, usedDynamicCredentials: true }],
								// Attempted but not resolved (e.g. running user has not connected).
								Notion: [{ attemptedDynamicCredentials: true }],
							},
						},
					},
				} as unknown as IRun,
			};

			eventService.emit('workflow-post-execute', event);

			await flushPromises();

			expect(telemetry.trackWorkflowExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					used_private_credentials: true,
					private_credentials_attempted_count: 2,
					private_credentials_resolved_count: 1,
					credential_resolver_id: 'system-n8n',
				}),
			);
		});

		it('should track on `workflow-saved` event', async () => {
			const event: RelayEventMap['workflow-saved'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					nodes: [],
					connections: {},
				}),
				publicApi: false,
			};

			eventService.emit('workflow-saved', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith('User saved workflow', {
				user_id: 'user123',
				workflow_id: 'workflow123',
				node_graph_string: expect.any(String),
				notes_count_overlapping: 0,
				notes_count_non_overlapping: 0,
				version_cli: expect.any(String),
				num_tags: 0,
				public_api: false,
				sharing_role: undefined,
				meta: undefined, // workflow.meta is undefined in mock
				workflow_edited_no_pos: false,
				credential_edited: false,
				ai_builder_assisted: false,
				identity_extractor_changed: false,
				redaction_policy: undefined,
				private_credentials_count: 0,
				private_credential_types: [],
				otel_workflow_custom_tags_count: 0,
				otel_nodes_with_custom_tags_count: 0,
				otel_node_custom_tags_count: 0,
				source: 'ui',
			});
		});

		it('should track OTEL custom telemetry tag counts on `workflow-saved` event', async () => {
			const event: RelayEventMap['workflow-saved'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					connections: {},
					settings: {
						customTelemetryTags: [
							{ key: 'env', value: 'production' },
							{ key: 'team', value: 'engineering' },
						],
					},
					nodes: [
						{
							id: 'node-1',
							name: 'Node 1',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
							customTelemetryTags: {
								tag: [
									{ key: 'node-env', value: 'production' },
									{ key: 'node-team', value: 'engineering' },
								],
							},
						},
						{
							id: 'node-2',
							name: 'Node 2',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
							customTelemetryTags: {
								tag: [{ key: 'node-region', value: 'eu' }],
							},
						},
						{
							id: 'node-3',
							name: 'Node 3',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
				}),
				publicApi: false,
			};

			eventService.emit('workflow-saved', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith(
				'User saved workflow',
				expect.objectContaining({
					otel_workflow_custom_tags_count: 2,
					otel_nodes_with_custom_tags_count: 2,
					otel_node_custom_tags_count: 3,
				}),
			);
		});

		it('should track resolver settings when credentialResolverId changes', async () => {
			const event: RelayEventMap['workflow-saved'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					nodes: [],
					connections: {},
					settings: { credentialResolverId: 'resolver-123', redactionPolicy: undefined },
				}),
				publicApi: false,
				settingsChanged: {
					credentialResolverId: {
						from: null,
						to: 'resolver-123',
					},
				},
			};

			eventService.emit('workflow-saved', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith('User saved workflow', {
				user_id: 'user123',
				workflow_id: 'workflow123',
				node_graph_string: expect.any(String),
				notes_count_overlapping: 0,
				notes_count_non_overlapping: 0,
				version_cli: expect.any(String),
				num_tags: 0,
				public_api: false,
				sharing_role: undefined,
				meta: undefined,
				workflow_edited_no_pos: false,
				credential_edited: false,
				ai_builder_assisted: false,
				credential_resolver_id: 'resolver-123',
				identity_extractor_changed: false,
				redaction_policy: undefined,
				private_credentials_count: 0,
				private_credential_types: [],
				otel_workflow_custom_tags_count: 0,
				otel_nodes_with_custom_tags_count: 0,
				otel_node_custom_tags_count: 0,
				source: 'ui',
			});
		});

		it('should emit the system resolver id when credentialResolverId is cleared', async () => {
			dynamicCredentialsProxy.getSystemResolverId.mockReturnValue('system-resolver');

			const event: RelayEventMap['workflow-saved'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					nodes: [],
					connections: {},
					settings: { credentialResolverId: undefined, redactionPolicy: undefined },
				}),
				publicApi: false,
				settingsChanged: {
					credentialResolverId: {
						from: 'resolver-123',
						to: null,
					},
				},
			};

			eventService.emit('workflow-saved', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith(
				'User saved workflow',
				expect.objectContaining({
					credential_resolver_id: 'system-resolver',
				}),
			);
		});

		it('should report private credential usage on `workflow-saved` event', async () => {
			licenseState.isDynamicCredentialsLicensed.mockReturnValueOnce(true);
			credentialsRepository.find.mockResolvedValueOnce([
				mock<CredentialsEntity>({ id: 'cred-1', type: 'slackApi' }),
				mock<CredentialsEntity>({ id: 'cred-2', type: 'notionApi' }),
			]);

			const event: RelayEventMap['workflow-saved'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					connections: {},
					nodes: [
						{
							id: 'node-1',
							name: 'Slack',
							type: 'n8n-nodes-base.slack',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
							credentials: { slackApi: { id: 'cred-1', name: 'Slack account' } },
						},
						{
							id: 'node-2',
							name: 'Notion',
							type: 'n8n-nodes-base.notion',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
							credentials: { notionApi: { id: 'cred-2', name: 'Notion account' } },
						},
					],
				}),
				publicApi: false,
			};

			eventService.emit('workflow-saved', event);

			await flushPromises();

			expect(credentialsRepository.find).toHaveBeenCalledWith({
				where: { id: In(['cred-1', 'cred-2']), isResolvable: true },
				select: ['id', 'type'],
			});
			expect(telemetry.track).toHaveBeenCalledWith(
				'User saved workflow',
				expect.objectContaining({
					private_credentials_count: 2,
					private_credential_types: ['slackApi', 'notionApi'],
				}),
			);
		});

		it('should report private credential usage on `workflow-activated` event', async () => {
			licenseState.isDynamicCredentialsLicensed.mockReturnValueOnce(true);
			credentialsRepository.find.mockResolvedValueOnce([
				mock<CredentialsEntity>({ id: 'cred-1', type: 'slackApi' }),
			]);

			const event: RelayEventMap['workflow-activated'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflowId: 'workflow123',
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					connections: {},
					nodes: [
						{
							id: 'node-1',
							name: 'Slack',
							type: 'n8n-nodes-base.slack',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
							credentials: { slackApi: { id: 'cred-1', name: 'Slack account' } },
						},
					],
				}),
				publicApi: false,
			};

			eventService.emit('workflow-activated', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith(
				'User activated workflow',
				expect.objectContaining({
					private_credentials_count: 1,
					private_credential_types: ['slackApi'],
				}),
			);
		});

		it('should count each private credential but de-duplicate types when several share a type', async () => {
			licenseState.isDynamicCredentialsLicensed.mockReturnValueOnce(true);
			credentialsRepository.find.mockResolvedValueOnce([
				mock<CredentialsEntity>({ id: 'cred-1', type: 'slackApi' }),
				mock<CredentialsEntity>({ id: 'cred-2', type: 'slackApi' }),
				mock<CredentialsEntity>({ id: 'cred-3', type: 'notionApi' }),
			]);

			const event: RelayEventMap['workflow-saved'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					connections: {},
					nodes: [
						{
							id: 'node-1',
							name: 'Slack 1',
							type: 'n8n-nodes-base.slack',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
							credentials: { slackApi: { id: 'cred-1', name: 'Slack account 1' } },
						},
						{
							id: 'node-2',
							name: 'Slack 2',
							type: 'n8n-nodes-base.slack',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
							credentials: { slackApi: { id: 'cred-2', name: 'Slack account 2' } },
						},
						{
							id: 'node-3',
							name: 'Notion',
							type: 'n8n-nodes-base.notion',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
							credentials: { notionApi: { id: 'cred-3', name: 'Notion account' } },
						},
					],
				}),
				publicApi: false,
			};

			eventService.emit('workflow-saved', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith(
				'User saved workflow',
				expect.objectContaining({
					// Three credentials, but only two distinct types.
					private_credentials_count: 3,
					private_credential_types: ['slackApi', 'notionApi'],
				}),
			);
		});

		it('should track redaction policy when it changes', async () => {
			const event: RelayEventMap['workflow-saved'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				workflow: mock<IWorkflowDb>({
					id: 'workflow123',
					name: 'Test Workflow',
					nodes: [],
					connections: {},
					settings: { redactionPolicy: 'all' },
				}),
				publicApi: false,
				settingsChanged: {
					redactionPolicy: {
						from: 'none',
						to: 'all',
					},
				},
			};

			eventService.emit('workflow-saved', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith(
				'User saved workflow',
				expect.objectContaining({
					redaction_policy: 'all',
				}),
			);
		});

		it('should track on `execution-data-revealed` event', () => {
			const event: RelayEventMap['execution-data-revealed'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				executionId: 'exec123',
				workflowId: 'workflow123',
				ipAddress: '127.0.0.1',
				userAgent: 'test-agent',
				redactionPolicy: 'all',
			};

			eventService.emit('execution-data-revealed', event);

			expect(telemetry.track).toHaveBeenCalledWith('User confirmed reveal data', {
				user_id: 'user123',
				execution_id: 'exec123',
				workflow_id: 'workflow123',
				redaction_policy: 'all',
			});
		});

		it('should track on `workflow-sharing-updated` event', () => {
			const event: RelayEventMap['workflow-sharing-updated'] = {
				workflowId: 'workflow123',
				userIdSharer: 'user123',
				userIdList: ['user456', 'user789'],
			};

			eventService.emit('workflow-sharing-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated workflow sharing', {
				workflow_id: 'workflow123',
				user_id_sharer: 'user123',
				user_id_list: ['user456', 'user789'],
			});
		});
	});

	describe('package import/export events', () => {
		it('should track on `n8n-package-imported` event with params and counts', () => {
			const event: RelayEventMap['n8n-package-imported'] = {
				user: { id: 'user123' },
				projectId: 'project123',
				folderId: 'folder123',
				workflowIds: ['wf1', 'wf2', 'wf3'],
				options: {
					workflowConflictPolicy: 'new-version',
					workflowIdPolicy: 'new',
					credentialMatchingMode: 'id-only',
					credentialMissingMode: 'must-preexist',
					workflowPublishingPolicy: 'preserve-published-state',
				},
				packageSourceId: 'source-instance-1',
				packageVersion: '1',
				credentialIds: {
					matched: ['cred1', 'cred2'],
					created: [],
					updated: [],
				},
				counts: {
					workflows: {
						created: 2,
						updated: 1,
						skipped: 1,
					},
					credentials: {
						matched: 2,
						created: 1,
						requirements: 3,
					},
				},
			};

			eventService.emit('n8n-package-imported', event);

			expect(telemetry.track).toHaveBeenCalledWith('User imported n8n package', {
				user_id: 'user123',
				workflow_conflict_policy: 'new-version',
				workflow_id_policy: 'new',
				credential_matching_mode: 'id-only',
				credential_missing_mode: 'must-preexist',
				workflow_publishing_policy: 'preserve-published-state',
				workflows_created: 2,
				workflows_updated: 1,
				workflows_skipped: 1,
				credentials_matched: 2,
				credentials_created: 1,
				credentials_required: 3,
			});
		});

		it('should track on `n8n-package-exported` event with entity counts only, not ids', () => {
			const event: RelayEventMap['n8n-package-exported'] = {
				user: { id: 'user123' },
				workflowIds: ['wf1', 'wf2', 'wf3'],
				projectIds: ['proj1'],
				counts: {
					workflows: 3,
					folders: 1,
					credentials: 2,
				},
			};

			eventService.emit('n8n-package-exported', event);

			expect(telemetry.track).toHaveBeenCalledWith('User exported n8n package', {
				user_id: 'user123',
				workflow_count: 3,
				folder_count: 1,
				credential_count: 2,
			});
		});
	});

	describe('user events', () => {
		it('should track on `user-updated` event', () => {
			const event: RelayEventMap['user-updated'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				fieldsChanged: ['firstName', 'lastName'],
			};

			eventService.emit('user-updated', event);

			expect(telemetry.identify).toHaveBeenCalledWith(
				{
					user_role: GLOBAL_OWNER_ROLE.slug,
					user_email: 'user@example.com',
				},
				'user123',
			);
			expect(telemetry.track).toHaveBeenCalledWith('User changed personal settings', {
				user_id: 'user123',
				fields_changed: ['firstName', 'lastName'],
			});
		});

		it('should track on `user-deleted` event', () => {
			const event: RelayEventMap['user-deleted'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				publicApi: false,
				targetUserOldStatus: 'active',
				migrationStrategy: 'transfer_data',
				targetUserId: 'user456',
				migrationUserId: 'user789',
			};

			eventService.emit('user-deleted', event);

			expect(telemetry.track).toHaveBeenCalledWith('User deleted user', {
				user_id: 'user123',
				public_api: false,
				target_user_old_status: 'active',
				migration_strategy: 'transfer_data',
				target_user_id: 'user456',
				migration_user_id: 'user789',
			});
			expect(telemetry.identify).toHaveBeenCalledWith(
				{
					deleted: true,
				},
				'user456',
			);
		});

		it('should track on `user-invited` event', () => {
			const event: RelayEventMap['user-invited'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				targetUserId: ['user456'],
				publicApi: false,
				emailSent: true,
				inviteeRole: 'global:member',
			};

			eventService.emit('user-invited', event);

			expect(telemetry.track).toHaveBeenCalledWith('User invited new user', {
				user_id: 'user123',
				target_user_id: ['user456'],
				public_api: false,
				email_sent: true,
				invitee_role: 'global:member',
			});
		});

		it('should track on `user-signed-up` event', () => {
			const event: RelayEventMap['user-signed-up'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				userType: 'email',
				wasDisabledLdapUser: false,
			};

			eventService.emit('user-signed-up', event);

			expect(telemetry.identify).toHaveBeenCalledWith(
				{
					user_id: 'user123',
					user_type: 'email',
					was_disabled_ldap_user: false,
				},
				'user123',
			);
			expect(telemetry.groupIdentify).toHaveBeenCalledWith({
				userId: 'user123',
			});
			expect(telemetry.track).toHaveBeenCalledWith('User signed up', {
				user_id: 'user123',
				user_type: 'email',
				was_disabled_ldap_user: false,
			});
		});

		it('should track on `user-submitted-personalization-survey` event', () => {
			const event: RelayEventMap['user-submitted-personalization-survey'] = {
				userId: 'user123',
				answers: {
					version: 'v4',
					personalization_survey_n8n_version: '1.0.0',
					personalization_survey_submitted_at: '2021-10-01T00:00:00.000Z',
					companySize: '1-10',
				},
			};

			eventService.emit('user-submitted-personalization-survey', event);

			expect(telemetry.track).toHaveBeenCalledWith('User responded to personalization questions', {
				user_id: 'user123',
				version: 'v4',
				personalization_survey_n8n_version: '1.0.0',
				personalization_survey_submitted_at: '2021-10-01T00:00:00.000Z',
				company_size: '1-10',
			});
		});

		it('should track on `user-changed-role` event', () => {
			const event: RelayEventMap['user-changed-role'] = {
				userId: 'user123',
				targetUserId: 'user456',
				targetUserNewRole: 'global:member',
				publicApi: false,
			};

			eventService.emit('user-changed-role', event);

			expect(telemetry.identify).toHaveBeenCalledWith(
				{
					user_role: 'global:member',
				},
				'user456',
			);
			expect(telemetry.track).toHaveBeenCalledWith('User changed role', {
				user_id: 'user123',
				target_user_id: 'user456',
				target_user_new_role: 'global:member',
				public_api: false,
			});
		});

		it('should track on `user-retrieved-user` event', () => {
			const event: RelayEventMap['user-retrieved-user'] = {
				userId: 'user123',
				publicApi: false,
			};

			eventService.emit('user-retrieved-user', event);

			expect(telemetry.track).toHaveBeenCalledWith('User retrieved user', {
				user_id: 'user123',
				public_api: false,
			});
		});

		it('should track on `user-retrieved-all-users` event', () => {
			const event: RelayEventMap['user-retrieved-all-users'] = {
				userId: 'user123',
				publicApi: false,
			};

			eventService.emit('user-retrieved-all-users', event);

			expect(telemetry.track).toHaveBeenCalledWith('User retrieved all users', {
				user_id: 'user123',
				public_api: false,
			});
		});
	});

	describe('lifecycle events', () => {
		it('should track on `server-started` event', async () => {
			const firstWorkflow = mock<WorkflowEntity>({ createdAt: new Date() });
			workflowRepository.findOne.mockResolvedValue(firstWorkflow);
			Object.assign(globalConfig.instanceSettingsLoader, {
				ownerManagedByEnv: true,
				ssoManagedByEnv: true,
				securityPolicyManagedByEnv: true,
				logStreamingManagedByEnv: true,
				mcpManagedByEnv: true,
				communityPackagesManagedByEnv: true,
			});

			eventService.emit('server-started');

			await flushPromises();

			expect(telemetry.groupIdentify).toHaveBeenCalledWith(
				expect.objectContaining({
					traits: expect.objectContaining({
						n8n_host: expect.any(String),
						version_cli: N8N_VERSION,
						n8n_deployment_type: 'default',
					}),
				}),
			);
			expect(telemetry.identify).toHaveBeenCalledWith(
				expect.objectContaining({
					version_cli: N8N_VERSION,
					metrics: {
						metrics_category_cache: false,
						metrics_category_default: true,
						metrics_category_logs: false,
						metrics_category_queue: false,
						metrics_category_routes: false,
						metrics_category_execution_data: false,
						metrics_category_webhooks: false,
						metrics_category_forms: false,
						metrics_category_workflow_info: false,
						metrics_enabled: true,
					},
					n8n_binary_data_mode: 'default',
					n8n_deployment_type: 'default',
					saml_enabled: false,
					smtp_set_up: true,
					system_info: {
						is_docker: false,
						cpus: expect.objectContaining({
							count: expect.any(Number),
							model: expect.any(String),
							speed: expect.any(Number),
						}),
						memory: expect.any(Number),
						os: expect.objectContaining({
							type: expect.any(String),
							version: expect.any(String),
						}),
					},
				}),
			);
			expect(telemetry.identify).toHaveBeenCalledWith(
				expect.not.objectContaining({
					otel: expect.anything(),
				}),
			);
			expect(telemetry.identify).toHaveBeenCalledWith(
				expect.not.objectContaining({
					settings_managed_by_env_vars: expect.anything(),
				}),
			);
			expect(telemetry.track).toHaveBeenCalledWith(
				'Instance started',
				expect.objectContaining({
					earliest_workflow_created: firstWorkflow.createdAt,
					settings_managed_by_env_vars: {
						owner_managed_by_env: true,
						sso_managed_by_env: true,
						security_policy_managed_by_env: true,
						log_streaming_managed_by_env: true,
						mcp_managed_by_env: true,
						community_packages_managed_by_env: true,
					},
					metrics: {
						metrics_enabled: true,
						metrics_category_webhooks: false,
						metrics_category_forms: false,
						metrics_category_workflow_info: false,
						metrics_category_default: true,
						metrics_category_routes: false,
						metrics_category_cache: false,
						metrics_category_logs: false,
						metrics_category_queue: false,
						metrics_category_execution_data: false,
					},
					otel: {
						enabled: false,
						include_node_spans: true,
					},
				}),
			);
		});

		it('should track instance settings env management on `server-started` event', async () => {
			workflowRepository.findOne.mockResolvedValue(null);
			Object.assign(globalConfig.instanceSettingsLoader, {
				ownerManagedByEnv: true,
				ssoManagedByEnv: true,
				securityPolicyManagedByEnv: true,
				logStreamingManagedByEnv: true,
				mcpManagedByEnv: true,
				communityPackagesManagedByEnv: true,
			});

			eventService.emit('server-started');

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith(
				'Instance started',
				expect.objectContaining({
					settings_managed_by_env_vars: {
						owner_managed_by_env: true,
						sso_managed_by_env: true,
						security_policy_managed_by_env: true,
						log_streaming_managed_by_env: true,
						mcp_managed_by_env: true,
						community_packages_managed_by_env: true,
					},
				}),
			);
			expect(telemetry.identify).toHaveBeenCalledWith(
				expect.not.objectContaining({
					settings_managed_by_env_vars: expect.anything(),
				}),
			);
			expect(telemetry.groupIdentify).toHaveBeenCalledWith(
				expect.objectContaining({
					traits: expect.not.objectContaining({
						settings_managed_by_env_vars: expect.anything(),
					}),
				}),
			);
		});

		it('should not include sensitive instance settings loader values in startup telemetry', async () => {
			workflowRepository.findOne.mockResolvedValue(null);
			Object.assign(globalConfig.instanceSettingsLoader, {
				ownerManagedByEnv: true,
				ownerEmail: 'owner@example.com',
				ownerPasswordHash: '$2b$12$012345678901234567890u012345678901234567890123456789012',
				ssoManagedByEnv: true,
				oidcClientId: 'oidc-client-id',
				oidcClientSecret: 'oidc-client-secret',
				oidcDiscoveryEndpoint: 'https://idp.example.com/.well-known/openid-configuration',
				samlMetadata: '<EntityDescriptor entityID="sensitive-idp" />',
				samlMetadataUrl: 'https://idp.example.com/metadata',
				logStreamingManagedByEnv: true,
				logStreamingDestinations: '[{"type":"webhook","url":"https://hooks.example.com/audit"}]',
				mcpManagedByEnv: true,
				mcpAccessEnabled: true,
				communityPackagesManagedByEnv: true,
				communityPackages: '[{"name":"n8n-nodes-sensitive","version":"1.2.3"}]',
			});

			eventService.emit('server-started');

			await flushPromises();

			const startupEvent = telemetry.track.mock.calls.find(
				([eventName]) => eventName === 'Instance started',
			);
			expect(startupEvent).toBeDefined();
			if (!startupEvent) throw new Error('Expected Instance started telemetry event');

			const telemetryPayload = JSON.stringify(startupEvent[1]);

			expect(telemetryPayload).not.toContain('owner@example.com');
			expect(telemetryPayload).not.toContain('$2b$12$012345678901234567890u');
			expect(telemetryPayload).not.toContain('oidc-client-id');
			expect(telemetryPayload).not.toContain('oidc-client-secret');
			expect(telemetryPayload).not.toContain('idp.example.com');
			expect(telemetryPayload).not.toContain('sensitive-idp');
			expect(telemetryPayload).not.toContain('hooks.example.com');
			expect(telemetryPayload).not.toContain('n8n-nodes-sensitive');
		});

		it('should track OTEL startup configuration on `server-started` event', async () => {
			const otelConfig = Container.get(OtelConfig);
			otelConfig.enabled = true;
			otelConfig.includeNodeSpans = false;
			workflowRepository.findOne.mockResolvedValue(null);

			eventService.emit('server-started');

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith(
				'Instance started',
				expect.objectContaining({
					otel: {
						enabled: true,
						include_node_spans: false,
					},
				}),
			);
			expect(telemetry.groupIdentify).toHaveBeenCalledWith(
				expect.objectContaining({
					traits: expect.not.objectContaining({
						otel: expect.anything(),
					}),
				}),
			);
		});

		it('should track on `session-started` event', () => {
			const event: RelayEventMap['session-started'] = {
				pushRef: 'ref123',
			};

			eventService.emit('session-started', event);

			expect(telemetry.track).toHaveBeenCalledWith('Session started', {
				session_id: 'ref123',
			});
		});

		it('should track on `instance-stopped` event', () => {
			eventService.emit('instance-stopped', {});

			expect(telemetry.track).toHaveBeenCalledWith('User instance stopped');
		});

		it('should track on `instance-owner-setup` event', () => {
			const event: RelayEventMap['instance-owner-setup'] = {
				userId: 'user123',
			};

			eventService.emit('instance-owner-setup', event);

			expect(telemetry.groupIdentify).toHaveBeenCalledWith({
				userId: 'user123',
			});
			expect(telemetry.track).toHaveBeenCalledWith('Owner finished instance setup', {
				user_id: 'user123',
			});
		});
	});

	describe('workflow execution events', () => {
		it('should track on `first-production-workflow-succeeded` event for personal project', () => {
			const event: RelayEventMap['first-production-workflow-succeeded'] = {
				projectId: 'project123',
				workflowId: 'workflow123',
				userId: 'user123',
			};

			eventService.emit('first-production-workflow-succeeded', event);

			expect(telemetry.track).toHaveBeenCalledWith('Workflow first prod success', {
				project_id: 'project123',
				workflow_id: 'workflow123',
				user_id: 'user123',
			});
		});

		it('should track on `first-production-workflow-succeeded` event for team project with null userId', () => {
			const event: RelayEventMap['first-production-workflow-succeeded'] = {
				projectId: 'project123',
				workflowId: 'workflow123',
				userId: null,
			};

			eventService.emit('first-production-workflow-succeeded', event);

			expect(telemetry.track).toHaveBeenCalledWith('Workflow first prod success', {
				project_id: 'project123',
				workflow_id: 'workflow123',
				user_id: undefined,
			});
		});

		it('should track on `first-workflow-data-loaded` event', () => {
			const event: RelayEventMap['first-workflow-data-loaded'] = {
				userId: 'user123',
				workflowId: 'workflow123',
				nodeType: 'http',
				nodeId: 'node123',
				credentialType: 'oAuth2',
				credentialId: 'cred123',
			};

			eventService.emit('first-workflow-data-loaded', event);

			expect(telemetry.track).toHaveBeenCalledWith('Workflow first data fetched', {
				user_id: 'user123',
				workflow_id: 'workflow123',
				node_type: 'http',
				node_id: 'node123',
				credential_type: 'oAuth2',
				credential_id: 'cred123',
			});
		});
	});

	describe('email events', () => {
		it('should track on `email-failed` event', () => {
			const event: RelayEventMap['email-failed'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: { slug: GLOBAL_OWNER_ROLE.slug },
				},
				messageType: 'New user invite',
				publicApi: false,
			};

			eventService.emit('email-failed', event);

			expect(telemetry.track).toHaveBeenCalledWith(
				'Instance failed to send transactional email to user',
				{
					user_id: 'user123',
					message_type: 'New user invite',
					public_api: false,
				},
			);
		});
	});

	describe('Community+ registered', () => {
		it('should track `license-community-plus-registered` event', () => {
			const event: RelayEventMap['license-community-plus-registered'] = {
				userId: 'user123',
				email: 'user@example.com',
				licenseKey: 'license123',
			};

			eventService.emit('license-community-plus-registered', event);

			expect(telemetry.track).toHaveBeenCalledWith('User registered for license community plus', {
				user_id: 'user123',
				email: 'user@example.com',
				licenseKey: 'license123',
			});
		});
	});

	describe('workflow post execute events', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		const mockWorkflowBase = mock<IWorkflowBase>({
			id: 'workflow123',
			name: 'Test Workflow',
			active: true,
			activeVersionId: 'some-version-id',
			nodes: [
				{
					id: 'node1',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					parameters: {},
					typeVersion: 1,
					position: [100, 200],
				},
			],
			connections: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			staticData: {},
			settings: {},
		});

		it('should not track when workflow has no id', async () => {
			const event: RelayEventMap['workflow-post-execute'] = {
				workflow: { ...mockWorkflowBase, id: '' },
				executionId: 'execution123',
				userId: 'user123',
			};

			eventService.emit('workflow-post-execute', event);

			expect(telemetry.trackWorkflowExecution).not.toHaveBeenCalled();
		});

		it('should track successful workflow execution', async () => {
			const runData = {
				finished: true,
				status: 'success',
				mode: 'manual',
				data: { resultData: { runData: {} } },
			} as unknown as IRun;

			const event: RelayEventMap['workflow-post-execute'] = {
				workflow: mockWorkflowBase,
				executionId: 'execution123',
				userId: 'user123',
				runData,
			};

			eventService.emit('workflow-post-execute', event);

			await flushPromises();

			expect(telemetry.trackWorkflowExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					workflow_id: 'workflow123',
					user_id: 'user123',
					success: true,
					is_manual: true,
					execution_mode: 'manual',
				}),
			);
		});

		it('should add Instance AI execution metadata to workflow execution telemetry', async () => {
			const runData = {
				finished: true,
				status: 'success',
				mode: 'manual',
				data: { resultData: { runData: {} } },
			} as unknown as IRun;

			const event: RelayEventMap['workflow-post-execute'] = {
				workflow: mockWorkflowBase,
				executionId: 'execution123',
				userId: 'user123',
				runData,
				source: 'instance_ai',
				telemetryMetadata: {
					mockDataSources: ['trigger_input', 'verification_pin_data'],
				},
			};

			eventService.emit('workflow-post-execute', event);

			await flushPromises();

			const expectedProperties = expect.objectContaining({
				execution_source: 'instance_ai',
				mock_data_sources: 'trigger_input,verification_pin_data',
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				'Manual workflow exec finished',
				expectedProperties,
			);
			expect(telemetry.trackWorkflowExecution).toHaveBeenCalledWith(expectedProperties);
		});

		it('should call telemetry.track when manual node execution finished', async () => {
			sharedWorkflowRepository.findSharingRole.mockResolvedValue('workflow:editor');
			credentialsRepository.findOneBy.mockResolvedValue(
				mock<CredentialsEntity>({ type: 'openAiApi', isManaged: false }),
			);

			const errorNode: INode = {
				id: '1',
				typeVersion: 1,
				name: 'Jira',
				type: 'n8n-nodes-base.jira',
				parameters: {},
				position: [100, 200],
			};

			const error = new NodeApiError(
				errorNode,
				{
					message: 'Error message',
					description: 'Incorrect API key provided',
					httpCode: '401',
					stack: '',
				},
				{
					message: 'Error message',
					description: 'Error description',
					level: 'warning',
					functionality: 'regular',
				},
			);

			const runData = {
				status: 'error',
				mode: 'manual',
				data: createErrorExecutionData(errorNode, error),
			} as IRun;

			const nodeGraph: INodesGraphResult = {
				nodeGraph: { node_types: [], node_connections: [], webhookNodeNames: [] },
				nameIndices: {
					Jira: '1',
					OpenAI: '1',
				},
			} as unknown as INodesGraphResult;

			vi.spyOn(TelemetryHelpers, 'generateNodesGraph').mockImplementation(() => nodeGraph);

			vi.spyOn(TelemetryHelpers, 'getNodeTypeForName').mockImplementation(
				() => ({ type: 'n8n-nodes-base.jira', version: 1, name: 'Jira' }) as unknown as INode,
			);

			const event: RelayEventMap['workflow-post-execute'] = {
				workflow: mockWorkflowBase,
				executionId: 'execution123',
				userId: 'user123',
				runData,
			};

			eventService.emit('workflow-post-execute', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith(
				'Manual node exec finished',
				expect.objectContaining({
					webhook_domain: null,
					user_id: 'user123',
					workflow_id: 'workflow123',
					status: 'error',
					executionStatus: 'error',
					sharing_role: 'sharee',
					error_message: 'Error message',
					error_node_type: 'n8n-nodes-base.jira',
					error_node_id: '1',
					node_id: '1',
					node_type: 'n8n-nodes-base.jira',
					is_managed: false,
					credential_type: null,
					node_graph_string: JSON.stringify(nodeGraph.nodeGraph),
				}),
			);

			expect(telemetry.trackWorkflowExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					workflow_id: 'workflow123',
					success: false,
					is_manual: true,
					execution_mode: 'manual',
					version_cli: N8N_VERSION,
					error_message: 'Error message',
					error_node_type: 'n8n-nodes-base.jira',
					node_graph_string: JSON.stringify(nodeGraph.nodeGraph),
					error_node_id: '1',
				}),
			);
		});

		it('should call telemetry.track when manual node execution finished with canceled error message', async () => {
			sharedWorkflowRepository.findSharingRole.mockResolvedValue('workflow:owner');

			const errorNode: INode = {
				id: '1',
				typeVersion: 1,
				name: 'Jira',
				type: 'n8n-nodes-base.jira',
				parameters: {},
				position: [100, 200],
			};

			const error = new NodeApiError(
				errorNode,
				{
					message: 'Error message',
					description: 'Incorrect API key provided',
					httpCode: '401',
					stack: '',
				},
				{
					message: 'Error message canceled',
					description: 'Error description',
					level: 'warning',
					functionality: 'regular',
				},
			);

			const runData = {
				status: 'error',
				mode: 'manual',
				data: createErrorExecutionData(errorNode, error),
			} as IRun;

			const nodeGraph: INodesGraphResult = {
				nodeGraph: { node_types: [], node_connections: [] },
				nameIndices: {
					Jira: '1',
					OpenAI: '1',
				},
			} as unknown as INodesGraphResult;

			vi.spyOn(TelemetryHelpers, 'generateNodesGraph').mockImplementation(() => nodeGraph);

			vi.spyOn(TelemetryHelpers, 'getNodeTypeForName').mockImplementation(
				() => ({ type: 'n8n-nodes-base.jira', version: 1, name: 'Jira' }) as unknown as INode,
			);

			const event: RelayEventMap['workflow-post-execute'] = {
				workflow: mockWorkflowBase,
				executionId: 'execution123',
				userId: 'user123',
				runData,
			};

			eventService.emit('workflow-post-execute', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith(
				'Manual node exec finished',
				expect.objectContaining({
					webhook_domain: null,
					user_id: 'user123',
					workflow_id: 'workflow123',
					status: 'canceled',
					executionStatus: 'canceled',
					sharing_role: 'owner',
					error_message: 'Error message canceled',
					error_node_type: 'n8n-nodes-base.jira',
					error_node_id: '1',
					node_id: '1',
					node_type: 'n8n-nodes-base.jira',
					node_graph_string: JSON.stringify(nodeGraph.nodeGraph),
				}),
			);

			expect(telemetry.trackWorkflowExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					workflow_id: 'workflow123',
					success: false,
					is_manual: true,
					execution_mode: 'manual',
					version_cli: N8N_VERSION,
					error_message: 'Error message canceled',
					error_node_type: 'n8n-nodes-base.jira',
					node_graph_string: JSON.stringify(nodeGraph.nodeGraph),
					error_node_id: '1',
				}),
			);
		});

		it('should call telemetry.track when manual workflow execution finished', async () => {
			sharedWorkflowRepository.findSharingRole.mockResolvedValue('workflow:owner');

			const runData = {
				status: 'error',
				mode: 'manual',
				data: {
					startData: {
						runNodeFilter: ['OpenAI'],
					},
					resultData: {
						runData: {
							Jira: [
								{
									data: { main: [[{ json: { headers: { origin: 'https://www.test.com' } } }]] },
								},
							],
						},
						lastNodeExecuted: 'OpenAI',
						error: new NodeApiError(
							{
								id: '1',
								typeVersion: 1,
								name: 'Jira',
								type: 'n8n-nodes-base.jira',
								parameters: {},
								position: [100, 200],
							},
							{
								message: 'Error message',
								description: 'Incorrect API key provided',
								httpCode: '401',
								stack: '',
							},
							{
								message: 'Error message',
								description: 'Error description',
								level: 'warning',
								functionality: 'regular',
							},
						),
					},
				},
			} as unknown as IRun;

			const nodeGraph: INodesGraphResult = {
				webhookNodeNames: ['Jira'],
				nodeGraph: { node_types: [], node_connections: [] },
				nameIndices: {
					Jira: '1',
					OpenAI: '1',
				},
			} as unknown as INodesGraphResult;

			vi.spyOn(TelemetryHelpers, 'generateNodesGraph').mockImplementation(() => nodeGraph);

			vi.spyOn(TelemetryHelpers, 'getNodeTypeForName').mockImplementation(
				() => ({ type: 'n8n-nodes-base.jira', version: 1, name: 'Jira' }) as unknown as INode,
			);

			const event: RelayEventMap['workflow-post-execute'] = {
				workflow: mockWorkflowBase,
				executionId: 'execution123',
				userId: 'user123',
				runData,
			};

			// The handler `await import('psl')`s before tracking. Pre-warm the
			// module cache so that import resolves on a microtask and the single
			// `flushPromises()` below is enough to observe the tracked event.
			await import('psl');

			eventService.emit('workflow-post-execute', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith(
				'Manual workflow exec finished',
				expect.objectContaining({
					webhook_domain: 'test.com',
					user_id: 'user123',
					workflow_id: 'workflow123',
					status: 'error',
					executionStatus: 'error',
					sharing_role: 'owner',
					error_message: 'Error message',
					error_node_type: 'n8n-nodes-base.jira',
					error_node_id: '1',
					node_graph_string: JSON.stringify(nodeGraph.nodeGraph),
				}),
			);

			expect(telemetry.trackWorkflowExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					workflow_id: 'workflow123',
					success: false,
					is_manual: true,
					execution_mode: 'manual',
					version_cli: N8N_VERSION,
					error_message: 'Error message',
					error_node_type: 'n8n-nodes-base.jira',
					node_graph_string: JSON.stringify(nodeGraph.nodeGraph),
					error_node_id: '1',
				}),
			);
		});

		it('should call telemetry.track when manual node execution finished with is_managed and credential_type properties', async () => {
			sharedWorkflowRepository.findSharingRole.mockResolvedValue('workflow:editor');
			credentialsRepository.findOneBy.mockResolvedValue(
				mock<CredentialsEntity>({ type: 'openAiApi', isManaged: true }),
			);

			const errorNode: INode = {
				id: '1',
				typeVersion: 1,
				name: 'Jira',
				type: 'n8n-nodes-base.jira',
				parameters: {},
				position: [100, 200],
			};

			const error = new NodeApiError(
				errorNode,
				{
					message: 'Error message',
					description: 'Incorrect API key provided',
					httpCode: '401',
					stack: '',
				},
				{
					message: 'Error message',
					description: 'Error description',
					level: 'warning',
					functionality: 'regular',
				},
			);

			const data = createErrorExecutionData(errorNode, error);
			// Override executionData to include credentials for this test
			data.executionData!.nodeExecutionStack = [
				{ node: { credentials: { openAiApi: { id: 'nhu-l8E4hX' } } } } as any,
			];

			const runData = {
				status: 'error',
				mode: 'manual',
				data,
			} as unknown as IRun;

			const nodeGraph: INodesGraphResult = {
				nodeGraph: { node_types: [], node_connections: [], webhookNodeNames: [] },
				nameIndices: {
					Jira: '1',
					OpenAI: '1',
				},
			} as unknown as INodesGraphResult;

			vi.spyOn(TelemetryHelpers, 'generateNodesGraph').mockImplementation(() => nodeGraph);

			vi.spyOn(TelemetryHelpers, 'getNodeTypeForName').mockImplementation(
				() => ({ type: 'n8n-nodes-base.jira', version: 1, name: 'Jira' }) as unknown as INode,
			);

			const event: RelayEventMap['workflow-post-execute'] = {
				workflow: mockWorkflowBase,
				executionId: 'execution123',
				userId: 'user123',
				runData,
			};

			eventService.emit('workflow-post-execute', event);

			await flushPromises();

			expect(credentialsRepository.findOneBy).toHaveBeenCalledWith({
				id: 'nhu-l8E4hX',
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				'Manual node exec finished',
				expect.objectContaining({
					webhook_domain: null,
					user_id: 'user123',
					workflow_id: 'workflow123',
					status: 'error',
					executionStatus: 'error',
					sharing_role: 'sharee',
					error_message: 'Error message',
					error_node_type: 'n8n-nodes-base.jira',
					error_node_id: '1',
					node_id: '1',
					node_type: 'n8n-nodes-base.jira',

					is_managed: true,
					credential_type: 'openAiApi',
					node_graph_string: JSON.stringify(nodeGraph.nodeGraph),
				}),
			);

			expect(telemetry.trackWorkflowExecution).toHaveBeenCalledWith(
				expect.objectContaining({
					workflow_id: 'workflow123',
					success: false,
					is_manual: true,
					execution_mode: 'manual',
					version_cli: N8N_VERSION,
					error_message: 'Error message',
					error_node_type: 'n8n-nodes-base.jira',
					node_graph_string: JSON.stringify(nodeGraph.nodeGraph),
					error_node_id: '1',
				}),
			);
		});

		it('should call telemetry.track when user ran out of free AI credits', async () => {
			sharedWorkflowRepository.findSharingRole.mockResolvedValue('workflow:editor');
			credentialsRepository.findOneBy.mockResolvedValue(
				mock<CredentialsEntity>({ type: 'openAiApi', isManaged: true }),
			);

			const runData = {
				status: 'error',
				mode: 'trigger',
				data: {
					startData: {
						destinationNode: 'OpenAI',
						runNodeFilter: ['OpenAI'],
					},
					executionData: {
						nodeExecutionStack: [{ node: { credentials: { openAiApi: { id: 'nhu-l8E4hX' } } } }],
					},
					resultData: {
						runData: {},
						lastNodeExecuted: 'OpenAI',
						error: new NodeApiError(
							{
								id: '1',
								typeVersion: 1,
								name: 'OpenAI',
								type: 'n8n-nodes-base.openAi',
								parameters: {},
								position: [100, 200],
							},
							{
								message: `400 - ${JSON.stringify({
									error: {
										message: 'error message',
										type: 'error_type',
										code: 200,
									},
								})}`,
								error: {
									message: 'error message',
									type: 'error_type',
									code: 200,
								},
							},
							{
								httpCode: '400',
							},
						),
					},
				},
			} as unknown as IRun;

			vi.spyOn(TelemetryHelpers, 'userInInstanceRanOutOfFreeAiCredits').mockImplementation(
				() => true,
			);

			const event: RelayEventMap['workflow-post-execute'] = {
				workflow: mockWorkflowBase,
				executionId: 'execution123',
				userId: 'user123',
				runData,
			};

			eventService.emit('workflow-post-execute', event);

			await flushPromises();

			expect(telemetry.track).toHaveBeenCalledWith('User ran out of free AI credits');
		});
	});
	describe('workflow history compaction events', () => {
		it('should call telemetry.track when compacting history finishes', async () => {
			const payload = {
				compactionStartTime: new Date('2026-01-23T09:44:49.792Z'),
				durationMs: 3500,
				windowStartIso: '2026-01-22T09:44:49.792Z',
				windowEndIso: '2026-01-22T10:44:49.792Z',
				errorCount: 3,
				totalVersionsSeen: 25,
				totalVersionsDeleted: 23,
				workflowsProcessed: 3,
			} satisfies RelayEventMap['history-compacted'];

			eventService.emit('history-compacted', payload);

			expect(telemetry.track).toHaveBeenCalledWith('Instance compacted workflow history', {
				workflows_processed: payload['workflowsProcessed'],
				total_versions_seen: payload['totalVersionsSeen'],
				total_versions_deleted: payload['totalVersionsDeleted'],
				window_start_iso: new Date(payload['windowStartIso']),
				window_end_iso: new Date(payload['windowEndIso']),
				error_count: payload['errorCount'],
				compaction_start_time_iso: payload['compactionStartTime'],
				compaction_duration_ms: payload['durationMs'],
				compaction_batch_delay_ms: globalConfig.workflowHistoryCompaction.batchDelayMs,
				compaction_batch_size: globalConfig.workflowHistoryCompaction.batchSize,
				compaction_trimming_optimizing_time_window_hours:
					globalConfig.workflowHistoryCompaction.optimizingTimeWindowHours,
				compaction_trimming_time_window_days:
					globalConfig.workflowHistoryCompaction.trimmingTimeWindowDays,
			});
		});
	});

	describe('instance policies events', () => {
		it('should track workflow_publishing update', () => {
			const event: RelayEventMap['instance-policies-updated'] = {
				user: { id: 'user123' },
				settingName: 'workflow_publishing',
				value: true,
			};

			eventService.emit('instance-policies-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated instance policies', {
				user_id: 'user123',
				workflow_publishing: true,
			});
		});

		it('should track workflow_sharing update', () => {
			const event: RelayEventMap['instance-policies-updated'] = {
				user: { id: 'user789' },
				settingName: 'workflow_sharing',
				value: true,
			};

			eventService.emit('instance-policies-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated instance policies', {
				user_id: 'user789',
				workflow_sharing: true,
			});
		});

		it('should track 2fa_enforcement update', () => {
			const event: RelayEventMap['instance-policies-updated'] = {
				user: { id: 'user456' },
				settingName: '2fa_enforcement',
				value: false,
			};

			eventService.emit('instance-policies-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated instance policies', {
				user_id: 'user456',
				'2fa_enforcement': false,
			});
		});

		it('should track data_redaction_enforcement_floor update', () => {
			const event: RelayEventMap['instance-policies-updated'] = {
				user: { id: 'user-redaction' },
				settingName: 'data_redaction_enforcement_floor',
				value: 'all',
			};

			eventService.emit('instance-policies-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated instance policies', {
				user_id: 'user-redaction',
				data_redaction_enforcement_floor: 'all',
			});
		});
	});

	describe('instance AI MCP events', () => {
		it('tracks on `instance-ai-mcp-registry-connection-created`', () => {
			eventService.emit('instance-ai-mcp-registry-connection-created', {
				userId: 'user-1',
				serverSlug: 'linear',
			});

			expect(telemetry.track).toHaveBeenCalledWith('Instance AI mcp connected', {
				user_id: 'user-1',
				server_slug: 'linear',
			});
		});

		it('tracks on `instance-ai-mcp-registry-connection-deleted`', () => {
			eventService.emit('instance-ai-mcp-registry-connection-deleted', {
				userId: 'user-1',
				serverSlug: 'linear',
			});

			expect(telemetry.track).toHaveBeenCalledWith('Instance AI mcp disconnected', {
				user_id: 'user-1',
				server_slug: 'linear',
			});
		});
	});

	describe('getSemanticVersioning', () => {
		it('should parse standard semantic version', () => {
			const result = getSemanticVersioning('2.11.0');
			expect(result).toEqual({ major: 2, minor: 11, patch: 0 });
		});

		it('should parse version with pre-release', () => {
			const result = getSemanticVersioning('2.11.0-beta.1');
			expect(result).toEqual({ major: 2, minor: 11, patch: 0 });
		});

		it('should parse version with pre-release rc', () => {
			const result = getSemanticVersioning('2.11.0-rc.5');
			expect(result).toEqual({ major: 2, minor: 11, patch: 0 });
		});

		it('should parse version with build metadata', () => {
			const result = getSemanticVersioning('2.11.0+build.123');
			expect(result).toEqual({ major: 2, minor: 11, patch: 0 });
		});

		it('should parse version with pre-release and build metadata', () => {
			const result = getSemanticVersioning('2.11.0-alpha.1+build.456');
			expect(result).toEqual({ major: 2, minor: 11, patch: 0 });
		});

		it('should handle single digit versions', () => {
			const result = getSemanticVersioning('1.0.0');
			expect(result).toEqual({ major: 1, minor: 0, patch: 0 });
		});

		it('should handle large version numbers', () => {
			const result = getSemanticVersioning('100.200.300');
			expect(result).toEqual({ major: 100, minor: 200, patch: 300 });
		});

		it('should return null for invalid version', () => {
			const result = getSemanticVersioning('invalid');
			expect(result).toEqual({ major: null, minor: null, patch: null });
		});

		it('should return null for empty string', () => {
			const result = getSemanticVersioning('');
			expect(result).toEqual({ major: null, minor: null, patch: null });
		});

		it('should return null for malformed version', () => {
			const result = getSemanticVersioning('a.b.c');
			expect(result).toEqual({ major: null, minor: null, patch: null });
		});

		it('should return null for version with only major.minor', () => {
			const result = getSemanticVersioning('2.11');
			expect(result).toEqual({ major: null, minor: null, patch: null });
		});

		it('should handle errors gracefully', () => {
			const result = getSemanticVersioning('very.weird.version.string');
			expect(result).toEqual({ major: null, minor: null, patch: null });
		});

		it('should parse the current N8N_VERSION', () => {
			const result = getSemanticVersioning(N8N_VERSION);
			expect(result.major).not.toBeNull();
			expect(result.minor).not.toBeNull();
			expect(result.patch).not.toBeNull();
			expect(typeof result.major).toBe('number');
			expect(typeof result.minor).toBe('number');
			expect(typeof result.patch).toBe('number');
		});
	});
});
