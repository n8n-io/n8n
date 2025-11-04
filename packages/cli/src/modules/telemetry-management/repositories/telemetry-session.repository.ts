import { Service } from '@n8n/di';
import { TelemetrySession } from '@n8n/db';
import { DataSource, IsNull, Repository } from '@n8n/typeorm';

@Service()
export class TelemetrySessionRepository extends Repository<TelemetrySession> {
	constructor(dataSource: DataSource) {
		super(TelemetrySession, dataSource.manager);
	}

	/**
	 * Find active session for user
	 */
	async findActiveSession(userId: string): Promise<TelemetrySession | null> {
		return await this.findOne({
			where: {
				userId,
				endedAt: IsNull(),
			},
			order: {
				createdAt: 'DESC',
			},
		});
	}

	/**
	 * End session
	 */
	async endSession(sessionId: string): Promise<void> {
		await this.update(sessionId, {
			endedAt: new Date(),
		});
	}
}
