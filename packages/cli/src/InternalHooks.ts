import { Service } from 'typedi';
import { snakeCase } from 'change-case';
import { get as pslGet } from 'psl';
import type {
	ExecutionStatus,
	INodesGraphResult,
	IRun,
	ITelemetryTrackProperties,
	IWorkflowBase,
} from 'n8n-workflow';
import { TelemetryHelpers } from 'n8n-workflow';

import { N8N_VERSION } from '@/constants';
import type { AuthProviderType } from '@db/entities/AuthIdentity';
import type { User } from '@db/entities/User';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { determineFinalExecutionStatus } from '@/executionLifecycleHooks/shared/sharedHookFunctions';
import type { ITelemetryUserDeletionData, IExecutionTrackProperties } from '@/Interfaces';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { NodeTypes } from '@/NodeTypes';
import { Telemetry } from '@/telemetry';
import { MessageEventBus } from './eventbus/MessageEventBus/MessageEventBus';

/**
 * @deprecated Do not add to this class. To add audit or telemetry events, use
 * `EventService` to emit the event and then use the `AuditEventRelay` or
 * `TelemetryEventRelay` to forward them to the event bus or telemetry.
 */
@Service()
export class InternalHooks {
	constructor(
		private readonly telemetry: Telemetry,
		private readonly nodeTypes: NodeTypes,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		workflowStatisticsService: WorkflowStatisticsService,
		// Can't use @ts-expect-error because only dev time tsconfig considers this as an error, but not build time
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore - needed until we decouple telemetry
		private readonly _eventBus: MessageEventBus, // needed until we decouple telemetry
	) {
		workflowStatisticsService.on('telemetry.onFirstProductionWorkflowSuccess', (metrics) =>
			this.onFirstProductionWorkflowSuccess(metrics),
		);
		workflowStatisticsService.on('telemetry.onFirstWorkflowDataLoad', (metrics) =>
			this.onFirstWorkflowDataLoad(metrics),
		);
	}

	async init() {
		await this.telemetry.init();
	}

	onFrontendSettingsAPI(pushRef?: string): void {
		this.telemetry.track('Session started', { session_id: pushRef });
	}

	onPersonalizationSurveySubmitted(userId: string, answers: Record<string, string>): void {
		const camelCaseKeys = Object.keys(answers);
		const personalizationSurveyData = { user_id: userId } as Record<string, string | string[]>;
		camelCaseKeys.forEach((camelCaseKey) => {
			personalizationSurveyData[snakeCase(camelCaseKey)] = answers[camelCaseKey];
		});

		this.telemetry.track('User responded to personalization questions', personalizationSurveyData);
	}

	// eslint-disable-next-line complexity
	async onWorkflowPostExecute(
		_executionId: string,
		workflow: IWorkflowBase,
		runData?: IRun,
		userId?: string,
	) {
		if (!workflow.id) {
			return;
		}

		if (runData?.status === 'waiting') {
			// No need to send telemetry or logs when the workflow hasn't finished yet.
			return;
		}

		const telemetryProperties: IExecutionTrackProperties = {
			workflow_id: workflow.id,
			is_manual: false,
			version_cli: N8N_VERSION,
			success: false,
		};

		if (userId) {
			telemetryProperties.user_id = userId;
		}

		if (runData?.data.resultData.error?.message?.includes('canceled')) {
			runData.status = 'canceled';
		}

		telemetryProperties.success = !!runData?.finished;

		// const executionStatus: ExecutionStatus = runData?.status ?? 'unknown';
		const executionStatus: ExecutionStatus = runData
			? determineFinalExecutionStatus(runData)
			: 'unknown';

		if (runData !== undefined) {
			telemetryProperties.execution_mode = runData.mode;
			telemetryProperties.is_manual = runData.mode === 'manual';

			let nodeGraphResult: INodesGraphResult | null = null;

			if (!telemetryProperties.success && runData?.data.resultData.error) {
				telemetryProperties.error_message = runData?.data.resultData.error.message;
				let errorNodeName =
					'node' in runData?.data.resultData.error
						? runData?.data.resultData.error.node?.name
						: undefined;
				telemetryProperties.error_node_type =
					'node' in runData?.data.resultData.error
						? runData?.data.resultData.error.node?.type
						: undefined;

				if (runData.data.resultData.lastNodeExecuted) {
					const lastNode = TelemetryHelpers.getNodeTypeForName(
						workflow,
						runData.data.resultData.lastNodeExecuted,
					);

					if (lastNode !== undefined) {
						telemetryProperties.error_node_type = lastNode.type;
						errorNodeName = lastNode.name;
					}
				}

				if (telemetryProperties.is_manual) {
					nodeGraphResult = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);
					telemetryProperties.node_graph = nodeGraphResult.nodeGraph;
					telemetryProperties.node_graph_string = JSON.stringify(nodeGraphResult.nodeGraph);

					if (errorNodeName) {
						telemetryProperties.error_node_id = nodeGraphResult.nameIndices[errorNodeName];
					}
				}
			}

			if (telemetryProperties.is_manual) {
				if (!nodeGraphResult) {
					nodeGraphResult = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);
				}

				let userRole: 'owner' | 'sharee' | undefined = undefined;
				if (userId) {
					const role = await this.sharedWorkflowRepository.findSharingRole(userId, workflow.id);
					if (role) {
						userRole = role === 'workflow:owner' ? 'owner' : 'sharee';
					}
				}

				const manualExecEventProperties: ITelemetryTrackProperties = {
					user_id: userId,
					workflow_id: workflow.id,
					status: executionStatus,
					executionStatus: runData?.status ?? 'unknown',
					error_message: telemetryProperties.error_message as string,
					error_node_type: telemetryProperties.error_node_type,
					node_graph_string: telemetryProperties.node_graph_string as string,
					error_node_id: telemetryProperties.error_node_id as string,
					webhook_domain: null,
					sharing_role: userRole,
				};

				if (!manualExecEventProperties.node_graph_string) {
					nodeGraphResult = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);
					manualExecEventProperties.node_graph_string = JSON.stringify(nodeGraphResult.nodeGraph);
				}

				if (runData.data.startData?.destinationNode) {
					const telemetryPayload = {
						...manualExecEventProperties,
						node_type: TelemetryHelpers.getNodeTypeForName(
							workflow,
							runData.data.startData?.destinationNode,
						)?.type,
						node_id: nodeGraphResult.nameIndices[runData.data.startData?.destinationNode],
					};

					this.telemetry.track('Manual node exec finished', telemetryPayload);
				} else {
					nodeGraphResult.webhookNodeNames.forEach((name: string) => {
						const execJson = runData.data.resultData.runData[name]?.[0]?.data?.main?.[0]?.[0]
							?.json as { headers?: { origin?: string } };
						if (execJson?.headers?.origin && execJson.headers.origin !== '') {
							manualExecEventProperties.webhook_domain = pslGet(
								execJson.headers.origin.replace(/^https?:\/\//, ''),
							);
						}
					});

					this.telemetry.track('Manual workflow exec finished', manualExecEventProperties);
				}
			}
		}

		this.telemetry.trackWorkflowExecution(telemetryProperties);
	}

	onWorkflowSharingUpdate(workflowId: string, userId: string, userList: string[]) {
		const properties: ITelemetryTrackProperties = {
			workflow_id: workflowId,
			user_id_sharer: userId,
			user_id_list: userList,
		};

		this.telemetry.track('User updated workflow sharing', properties);
	}

	async onN8nStop(): Promise<void> {
		const timeoutPromise = new Promise<void>((resolve) => {
			setTimeout(resolve, 3000);
		});

		return await Promise.race([timeoutPromise, this.telemetry.trackN8nStop()]);
	}

	onUserDeletion(userDeletionData: {
		user: User;
		telemetryData: ITelemetryUserDeletionData;
		publicApi: boolean;
	}) {
		this.telemetry.track('User deleted user', {
			...userDeletionData.telemetryData,
			user_id: userDeletionData.user.id,
			public_api: userDeletionData.publicApi,
		});
	}

	onUserInvite(userInviteData: {
		user: User;
		target_user_id: string[];
		public_api: boolean;
		email_sent: boolean;
		invitee_role: string;
	}) {
		this.telemetry.track('User invited new user', {
			user_id: userInviteData.user.id,
			target_user_id: userInviteData.target_user_id,
			public_api: userInviteData.public_api,
			email_sent: userInviteData.email_sent,
			invitee_role: userInviteData.invitee_role,
		});
	}

	onUserRoleChange(userRoleChangeData: {
		user: User;
		target_user_id: string;
		public_api: boolean;
		target_user_new_role: string;
	}) {
		const { user, ...rest } = userRoleChangeData;

		this.telemetry.track('User changed role', { user_id: user.id, ...rest });
	}

	onUserRetrievedUser(userRetrievedData: { user_id: string; public_api: boolean }) {
		this.telemetry.track('User retrieved user', userRetrievedData);
	}

	onUserRetrievedAllUsers(userRetrievedData: { user_id: string; public_api: boolean }) {
		this.telemetry.track('User retrieved all users', userRetrievedData);
	}

	onUserRetrievedExecution(userRetrievedData: { user_id: string; public_api: boolean }) {
		this.telemetry.track('User retrieved execution', userRetrievedData);
	}

	onUserRetrievedAllExecutions(userRetrievedData: { user_id: string; public_api: boolean }) {
		this.telemetry.track('User retrieved all executions', userRetrievedData);
	}

	onUserRetrievedWorkflow(userRetrievedData: { user_id: string; public_api: boolean }) {
		this.telemetry.track('User retrieved workflow', userRetrievedData);
	}

	onUserRetrievedAllWorkflows(userRetrievedData: { user_id: string; public_api: boolean }) {
		this.telemetry.track('User retrieved all workflows', userRetrievedData);
	}

	onUserUpdate(userUpdateData: { user: User; fields_changed: string[] }) {
		this.telemetry.track('User changed personal settings', {
			user_id: userUpdateData.user.id,
			fields_changed: userUpdateData.fields_changed,
		});
	}

	onUserInviteEmailClick(userInviteClickData: { inviter: User; invitee: User }) {
		this.telemetry.track('User clicked invite link from email', {
			user_id: userInviteClickData.invitee.id,
		});
	}

	onUserPasswordResetEmailClick(userPasswordResetData: { user: User }) {
		this.telemetry.track('User clicked password reset link from email', {
			user_id: userPasswordResetData.user.id,
		});
	}

	onUserTransactionalEmail(userTransactionalEmailData: {
		user_id: string;
		message_type:
			| 'Reset password'
			| 'New user invite'
			| 'Resend invite'
			| 'Workflow shared'
			| 'Credentials shared';
		public_api: boolean;
	}) {
		this.telemetry.track('Instance sent transactional email to user', userTransactionalEmailData);
	}

	onUserPasswordResetRequestClick(userPasswordResetData: { user: User }) {
		this.telemetry.track('User requested password reset while logged out', {
			user_id: userPasswordResetData.user.id,
		});
	}

	onInstanceOwnerSetup(instanceOwnerSetupData: { user_id: string }) {
		this.telemetry.track('Owner finished instance setup', instanceOwnerSetupData);
	}

	onUserSignup(
		user: User,
		userSignupData: {
			user_type: AuthProviderType;
			was_disabled_ldap_user: boolean;
		},
	) {
		this.telemetry.track('User signed up', {
			user_id: user.id,
			...userSignupData,
		});
	}

	onEmailFailed(failedEmailData: {
		user: User;
		message_type:
			| 'Reset password'
			| 'New user invite'
			| 'Resend invite'
			| 'Workflow shared'
			| 'Credentials shared';
		public_api: boolean;
	}) {
		this.telemetry.track('Instance failed to send transactional email to user', {
			user_id: failedEmailData.user.id,
		});
	}

	/*
	 * Execution Statistics
	 */
	onFirstProductionWorkflowSuccess(data: { user_id: string; workflow_id: string }) {
		this.telemetry.track('Workflow first prod success', data);
	}

	onFirstWorkflowDataLoad(data: {
		user_id: string;
		workflow_id: string;
		node_type: string;
		node_id: string;
		credential_type?: string;
		credential_id?: string;
	}) {
		this.telemetry.track('Workflow first data fetched', data);
	}
}
