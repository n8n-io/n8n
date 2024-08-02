import { Service } from 'typedi';
import { snakeCase } from 'change-case';
import type { ITelemetryTrackProperties } from 'n8n-workflow';
import type { AuthProviderType } from '@db/entities/AuthIdentity';
import type { User } from '@db/entities/User';
import type { ITelemetryUserDeletionData } from '@/Interfaces';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { Telemetry } from '@/telemetry';
import { MessageEventBus } from './eventbus/MessageEventBus/MessageEventBus';

/**
 * @deprecated Do not add to this class. To add log streaming or telemetry events, use
 * `EventService` to emit the event and then use the `LogStreamingEventRelay` or
 * `TelemetryEventRelay` to forward them to the event bus or telemetry.
 */
@Service()
export class InternalHooks {
	constructor(
		private readonly telemetry: Telemetry,
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
