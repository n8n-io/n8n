import type { NodeTypes } from '@/node-types';
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
} from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { type BinaryDataConfig, InstanceSettings } from 'n8n-core';
import {
	type INode,
	type INodesGraphResult,
	type IRun,
	type IWorkflowBase,
	NodeApiError,
	TelemetryHelpers,
} from 'n8n-workflow';

import { N8N_VERSION } from '@/constants';
import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { TelemetryEventRelay } from '@/events/relays/telemetry.event-relay';
import type { License } from '@/license';
import type { Telemetry } from '@/telemetry';

const flushPromises = async () => await new Promise((resolve) => setImmediate(resolve));

describe('TelemetryEventRelay', () => {
	const telemetry = mock<Telemetry>();
	const license = mock<License>();
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
			},
		},
		logging: {
			level: 'info',
			outputs: ['console'],
		},
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
	const eventService = new EventService();

	let telemetryEventRelay: TelemetryEventRelay;

	beforeAll(async () => {
		telemetryEventRelay = new TelemetryEventRelay(
			eventService,
			telemetry,
			license,
			globalConfig,
			instanceSettings,
			binaryDataConfig,
			workflowRepository,
			nodeTypes,
			sharedWorkflowRepository,
			projectRelationRepository,
			credentialsRepository,
		);

		await telemetryEventRelay.init();
	});

	beforeEach(() => {
		jest.clearAllMocks();
		globalConfig.diagnostics.enabled = true;
	});

	describe('init', () => {
		it('with diagnostics enabled, should init telemetry and register listeners', async () => {
			globalConfig.diagnostics.enabled = true;
			const telemetryEventRelay = new TelemetryEventRelay(
				eventService,
				telemetry,
				license,
				globalConfig,
				instanceSettings,
				binaryDataConfig,
				workflowRepository,
				nodeTypes,
				sharedWorkflowRepository,
				projectRelationRepository,
				credentialsRepository,
			);
			// @ts-expect-error Private method
			const setupListenersSpy = jest.spyOn(telemetryEventRelay, 'setupListeners');

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
				globalConfig,
				instanceSettings,
				binaryDataConfig,
				workflowRepository,
				nodeTypes,
				sharedWorkflowRepository,
				projectRelationRepository,
				credentialsRepository,
			);
			// @ts-expect-error Private method
			const setupListenersSpy = jest.spyOn(telemetryEventRelay, 'setupListeners');

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
		it('should track on `variable-created` event', () => {
			eventService.emit('variable-created', {});

			expect(telemetry.track).toHaveBeenCalledWith('User created variable');
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
	});

	describe('public API events', () => {
		it('should track on `public-api-invoked` event', () => {
			const event: RelayEventMap['public-api-invoked'] = {
				userId: 'user123',
				path: '/api/v1/workflows',
				method: 'GET',
				apiVersion: 'v1',
			};

			eventService.emit('public-api-invoked', event);

			expect(telemetry.track).toHaveBeenCalledWith('User invoked API', {
				user_id: 'user123',
				path: '/api/v1/workflows',
				method: 'GET',
				api_version: 'v1',
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
			};

			eventService.emit('public-api-key-deleted', event);

			expect(telemetry.track).toHaveBeenCalledWith('API key deleted', {
				user_id: 'user123',
				public_api: true,
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
			};

			eventService.emit('credentials-created', event);

			expect(telemetry.track).toHaveBeenCalledWith('User created credentials', {
				user_id: 'user123',
				credential_type: 'github',
				credential_id: 'cred123',
				project_id: 'project123',
				project_type: 'personal',
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
			};

			eventService.emit('credentials-updated', event);

			expect(telemetry.track).toHaveBeenCalledWith('User updated credentials', {
				user_id: 'user123',
				credential_type: 'github',
				credential_id: 'cred123',
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
				credential_type: 'github',
				credential_id: 'cred123',
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
				workflow: mock<IWorkflowBase>({ id: 'workflow123', name: 'Test Workflow', nodes: [] }),
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
				is_manual: false,
				success: false,
				user_id: 'user123',
				version_cli: N8N_VERSION,
				workflow_id: 'workflow123',
			});
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
				workflow: mock<IWorkflowDb>({ id: 'workflow123', name: 'Test Workflow', nodes: [] }),
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

			eventService.emit('server-started');

			await flushPromises();

			expect(telemetry.identify).toHaveBeenCalledWith(
				expect.objectContaining({
					version_cli: N8N_VERSION,
					metrics: {
						metrics_category_cache: false,
						metrics_category_default: true,
						metrics_category_logs: false,
						metrics_category_queue: false,
						metrics_category_routes: false,
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
			expect(telemetry.track).toHaveBeenCalledWith(
				'Instance started',
				expect.objectContaining({
					earliest_workflow_created: firstWorkflow.createdAt,
					metrics: {
						metrics_enabled: true,
						metrics_category_default: true,
						metrics_category_routes: false,
						metrics_category_cache: false,
						metrics_category_logs: false,
						metrics_category_queue: false,
					},
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

			expect(telemetry.track).toHaveBeenCalledWith('Owner finished instance setup', {
				user_id: 'user123',
			});
		});
	});

	describe('workflow execution events', () => {
		it('should track on `first-production-workflow-succeeded` event', () => {
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
			jest.clearAllMocks();
		});

		const mockWorkflowBase = mock<IWorkflowBase>({
			id: 'workflow123',
			name: 'Test Workflow',
			active: true,
			nodes: [
				{
					id: 'node1',
					name: 'Start',
					type: 'n8n-nodes-base.start',
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
			const runData = mock<IRun>({
				finished: true,
				status: 'success',
				mode: 'manual',
				data: { resultData: {} },
			});

			const event: RelayEventMap['workflow-post-execute'] = {
				workflow: mockWorkflowBase,
				executionId: 'execution123',
				userId: 'user123',
				runData: runData as unknown as IRun,
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

		it('should call telemetry.track when manual node execution finished', async () => {
			sharedWorkflowRepository.findSharingRole.mockResolvedValue('workflow:editor');
			credentialsRepository.findOneBy.mockResolvedValue(
				mock<CredentialsEntity>({ type: 'openAiApi', isManaged: false }),
			);

			const runData = {
				status: 'error',
				mode: 'manual',
				data: {
					startData: {
						destinationNode: 'OpenAI',
						runNodeFilter: ['OpenAI'],
					},
					resultData: {
						runData: {},
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
			} as IRun;

			const nodeGraph: INodesGraphResult = {
				nodeGraph: { node_types: [], node_connections: [], webhookNodeNames: [] },
				nameIndices: {
					Jira: '1',
					OpenAI: '1',
				},
			} as unknown as INodesGraphResult;

			jest.spyOn(TelemetryHelpers, 'generateNodesGraph').mockImplementation(() => nodeGraph);

			jest
				.spyOn(TelemetryHelpers, 'getNodeTypeForName')
				.mockImplementation(
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

			const runData = {
				status: 'error',
				mode: 'manual',
				data: {
					startData: {
						destinationNode: 'OpenAI',
						runNodeFilter: ['OpenAI'],
					},
					resultData: {
						runData: {},
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
								message: 'Error message canceled',
								description: 'Error description',
								level: 'warning',
								functionality: 'regular',
							},
						),
					},
				},
			} as IRun;

			const nodeGraph: INodesGraphResult = {
				nodeGraph: { node_types: [], node_connections: [] },
				nameIndices: {
					Jira: '1',
					OpenAI: '1',
				},
			} as unknown as INodesGraphResult;

			jest.spyOn(TelemetryHelpers, 'generateNodesGraph').mockImplementation(() => nodeGraph);

			jest
				.spyOn(TelemetryHelpers, 'getNodeTypeForName')
				.mockImplementation(
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

			jest.spyOn(TelemetryHelpers, 'generateNodesGraph').mockImplementation(() => nodeGraph);

			jest
				.spyOn(TelemetryHelpers, 'getNodeTypeForName')
				.mockImplementation(
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

			const runData = {
				status: 'error',
				mode: 'manual',
				data: {
					executionData: {
						nodeExecutionStack: [{ node: { credentials: { openAiApi: { id: 'nhu-l8E4hX' } } } }],
					},
					startData: {
						destinationNode: 'OpenAI',
						runNodeFilter: ['OpenAI'],
					},
					resultData: {
						runData: {},
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
				nodeGraph: { node_types: [], node_connections: [], webhookNodeNames: [] },
				nameIndices: {
					Jira: '1',
					OpenAI: '1',
				},
			} as unknown as INodesGraphResult;

			jest.spyOn(TelemetryHelpers, 'generateNodesGraph').mockImplementation(() => nodeGraph);

			jest
				.spyOn(TelemetryHelpers, 'getNodeTypeForName')
				.mockImplementation(
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

			jest
				.spyOn(TelemetryHelpers, 'userInInstanceRanOutOfFreeAiCredits')
				.mockImplementation(() => true);

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
});
