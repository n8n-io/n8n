import { Service } from 'typedi';
import { EventRelay } from '@/eventbus/event-relay.service';
import type { Event } from '@/eventbus/event.types';
import { Telemetry } from '.';
import config from '@/config';

@Service()
export class TelemetryEventRelay {
	constructor(
		private readonly eventRelay: EventRelay,
		private readonly telemetry: Telemetry,
	) {}

	init() {
		if (!config.getEnv('diagnostics.enabled')) return;

		this.setupHandlers();
	}

	private setupHandlers() {
		this.eventRelay.on('team-project-updated', (event) => this.teamProjectUpdated(event));
		this.eventRelay.on('team-project-deleted', (event) => this.teamProjectDeleted(event));
		this.eventRelay.on('team-project-created', (event) => this.teamProjectCreated(event));
		this.eventRelay.on('api-key-deleted', (event) => this.apiKeyDeleted(event));
		this.eventRelay.on('api-key-created', (event) => this.apiKeyCreated(event));
		this.eventRelay.on('user-signed-up', (event) => this.userSignedUp(event));
		this.eventRelay.on('user-invoked-api', (event) => this.userInvokedApi(event));
		this.eventRelay.on('user-retrieved-user', (event) => this.userRetrievedUser(event));
		this.eventRelay.on('user-retrieved-all-users', (event) => this.userRetrievedAllUsers(event));
		this.eventRelay.on('user-retrieved-execution', (event) => this.userRetrievedExecution(event));
		this.eventRelay.on('user-retrieved-all-executions', (event) =>
			this.userRetrievedAllExecution(event),
		);
		this.eventRelay.on('user-retrieved-workflow', (event) => this.userRetrievedWorkflow(event));
		this.eventRelay.on('user-retrieved-all-workflows', (event) =>
			this.userRetrievedAllWorkflows(event),
		);
		this.eventRelay.on('user-deleted', (event) => this.userDeleted(event));
		this.eventRelay.on('user-clicked-password-reset-email', (event) =>
			this.userClickedPasswordResetEmail(event),
		);
		this.eventRelay.on('n8n-stopped', (_) => this.onN8nStopped());
		this.eventRelay.on('user-owner-setup', (event) => this.userOwnerSetup(event));
		this.eventRelay.on('license-renew-attempted', (event) => this.licenseRenewAttempted(event));
	}

	/**
	 * Projects
	 */

	private teamProjectUpdated({ userId, role, members, projectId }: Event['team-project-updated']) {
		void this.telemetry.track('Project settings updated', {
			user_id: userId,
			role,
			// eslint-disable-next-line @typescript-eslint/no-shadow
			members: members.map(({ userId: user_id, role }) => ({ user_id, role })),
			project_id: projectId,
		});
	}

	private teamProjectDeleted({
		userId,
		role,
		projectId,
		removalType,
		targetProjectId,
	}: Event['team-project-deleted']) {
		void this.telemetry.track('User deleted project', {
			user_id: userId,
			role,
			project_id: projectId,
			removal_type: removalType,
			target_project_id: targetProjectId,
		});
	}

	private teamProjectCreated({ userId, role }: Event['team-project-created']) {
		void this.telemetry.track('User created project', {
			user_id: userId,
			role,
		});
	}

	/**
	 * API Keys
	 */

	private apiKeyDeleted({ user, public_api }: Event['api-key-deleted']) {
		void this.telemetry.track('User invited new user', {
			user_id: user.id,
			public_api: public_api ?? false,
		});
	}

	private apiKeyCreated({ user, public_api }: Event['api-key-created']) {
		void this.telemetry.track('User invited new user', {
			user_id: user.id,
			public_api: public_api ?? false,
		});
	}

	/**
	 * Users
	 */

	private userInvokedApi({ user, ...rest }: Event['user-invoked-api']) {
		void this.telemetry.track('User invoked API', {
			user_id: user.id,
			...rest,
		});
	}

	private userSignedUp({ user, signUpMetadata }: Event['user-signed-up']) {
		void this.telemetry.track('User signed up', {
			user_id: user.id,
			...signUpMetadata,
		});
	}

	private userRetrievedUser({ user }: Event['user-retrieved-user']) {
		void this.telemetry.track('User retrieved user', {
			user_id: user.id,
			public_api: true,
		});
	}

	private userRetrievedAllUsers({ user }: Event['user-retrieved-all-users']) {
		void this.telemetry.track('User retrieved all users', {
			user_id: user.id,
			public_api: true,
		});
	}

	private userRetrievedExecution({ user }: Event['user-retrieved-execution']) {
		void this.telemetry.track('User retrieved execution', {
			user_id: user.id,
			public_api: true,
		});
	}

	private userRetrievedAllExecution({ user }: Event['user-retrieved-all-executions']) {
		void this.telemetry.track('User retrieved all executions', {
			user_id: user.id,
			public_api: true,
		});
	}

	private userRetrievedWorkflow({ user }: Event['user-retrieved-workflow']) {
		void this.telemetry.track('User retrieved workflow', { user_id: user.id, public_api: true });
	}

	private userRetrievedAllWorkflows({ user }: Event['user-retrieved-all-workflows']) {
		void this.telemetry.track('User retrieved all workflows', {
			user_id: user.id,
			public_api: true,
		});
	}

	private userDeleted({ user, public_api, ...rest }: Event['user-deleted']) {
		void this.telemetry.track('User deleted', { user_id: user.id, public_api, ...rest });
	}

	private userClickedPasswordResetEmail({ user }: Event['user-clicked-password-reset-email']) {
		void this.telemetry.track('User clicked password reset link from email', {
			user_id: user.id,
		});
	}

	private userOwnerSetup({ user }: Event['user-owner-setup']) {
		void this.telemetry.track('Owner finished instance setup', { user_id: user.id });
	}

	/**
	 * n8n
	 */

	private onN8nStopped() {
		const timeoutPromise = new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve();
			}, 3000);
		});

		return Promise.race([timeoutPromise, this.telemetry.trackN8nStop()]);
	}

	/**
	 * License
	 */
	async licenseRenewAttempted({ success }: Event['license-renew-attempted']) {
		await this.telemetry.track('Instance attempted to refresh license', { success });
	}
}
