import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiThread } from '../entities/instance-ai-thread.entity';

@Service()
export class InstanceAiThreadRepository extends Repository<InstanceAiThread> {
	constructor(dataSource: DataSource) {
		super(InstanceAiThread, dataSource.manager);
	}

	/** A user's threads that build the app, newest activity first. */
	async findByApp(resourceId: string, appId: string): Promise<InstanceAiThread[]> {
		return await this.find({
			where: { resourceId, appId },
			order: { updatedAt: 'DESC', id: 'DESC' },
		});
	}

	/** The app a thread builds, or undefined for a thread without one. */
	async findAppId(threadId: string): Promise<string | undefined> {
		const thread = await this.findOne({ where: { id: threadId }, select: ['appId'] });
		return thread?.appId ?? undefined;
	}

	async setApp(threadId: string, appId: string): Promise<void> {
		await this.update({ id: threadId }, { appId });
	}
}
