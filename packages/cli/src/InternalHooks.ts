import { Service } from 'typedi';
import { snakeCase } from 'change-case';
import type { ITelemetryTrackProperties, IWorkflowBase } from 'n8n-workflow';
import { TelemetryHelpers } from 'n8n-workflow';
import config from '@/config';
import { N8N_VERSION } from '@/constants';
import type { AuthProviderType } from '@db/entities/AuthIdentity';
import type { User } from '@db/entities/User';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import type { ITelemetryUserDeletionData, IWorkflowDb } from '@/Interfaces';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { NodeTypes } from '@/NodeTypes';
import { Telemetry } from '@/telemetry';
import type { Project } from '@db/entities/Project';
import { ProjectRelationRepository } from './databases/repositories/projectRelation.repository';
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
		private readonly projectRelationRepository: ProjectRelationRepository,
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

	onWorkflowCreated(
		user: User,
		workflow: IWorkflowBase,
		project: Project,
		publicApi: boolean,
	): void {
		const { nodeGraph } = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes);

		this.telemetry.track('User created workflow', {
			user_id: user.id,
			workflow_id: workflow.id,
			node_graph_string: JSON.stringify(nodeGraph),
			public_api: publicApi,
			project_id: project.id,
			project_type: project.type,
		});
	}

	onWorkflowDeleted(user: User, workflowId: string, publicApi: boolean): void {
		this.telemetry.track('User deleted workflow', {
			user_id: user.id,
			workflow_id: workflowId,
			public_api: publicApi,
		});
	}

	async onWorkflowSaved(user: User, workflow: IWorkflowDb, publicApi: boolean): Promise<void> {
		const isCloudDeployment = config.getEnv('deployment.type') === 'cloud';

		const { nodeGraph } = TelemetryHelpers.generateNodesGraph(workflow, this.nodeTypes, {
			isCloudDeployment,
		});

		let userRole: 'owner' | 'sharee' | 'member' | undefined = undefined;
		const role = await this.sharedWorkflowRepository.findSharingRole(user.id, workflow.id);
		if (role) {
			userRole = role === 'workflow:owner' ? 'owner' : 'sharee';
		} else {
			const workflowOwner = await this.sharedWorkflowRepository.getWorkflowOwningProject(
				workflow.id,
			);

			if (workflowOwner) {
				const projectRole = await this.projectRelationRepository.findProjectRole({
					userId: user.id,
					projectId: workflowOwner.id,
				});

				if (projectRole && projectRole !== 'project:personalOwner') {
					userRole = 'member';
				}
			}
		}

		const notesCount = Object.keys(nodeGraph.notes).length;
		const overlappingCount = Object.values(nodeGraph.notes).filter(
			(note) => note.overlapping,
		).length;

		this.telemetry.track('User saved workflow', {
			user_id: user.id,
			workflow_id: workflow.id,
			node_graph_string: JSON.stringify(nodeGraph),
			notes_count_overlapping: overlappingCount,
			notes_count_non_overlapping: notesCount - overlappingCount,
			version_cli: N8N_VERSION,
			num_tags: workflow.tags?.length ?? 0,
			public_api: publicApi,
			sharing_role: userRole,
		});
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
