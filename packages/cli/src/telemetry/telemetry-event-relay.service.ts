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

	async init() {
		if (!config.getEnv('diagnostics.enabled')) return;

		await this.telemetry.init();

		this.setupHandlers();
	}

	private setupHandlers() {
		this.eventRelay.on('team-project-updated', (event) => this.teamProjectUpdated(event));
		this.eventRelay.on('team-project-deleted', (event) => this.teamProjectDeleted(event));
		this.eventRelay.on('team-project-created', (event) => this.teamProjectCreated(event));
	}

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
}
