import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiMessage } from '../entities/instance-ai-message.entity';

@Service()
export class InstanceAiMessageRepository extends Repository<InstanceAiMessage> {
	constructor(dataSource: DataSource) {
		super(InstanceAiMessage, dataSource.manager);
	}

	/**
	 * Whether this instance has at least `threshold` user messages to the assistant.
	 *
	 * Instance-wide on purpose: the credit pool is per license, not per user, so "has this instance
	 * used the assistant" is the question the activation lock asks. Only `user` messages count —
	 * assistant and tool rows could exist for runs the user never initiated.
	 *
	 * Bounded by `take` rather than counting: this runs on every credits read and every run until
	 * the threshold trips, and a full count would scan a table that only grows.
	 */
	async hasAtLeastUserMessages(threshold: number): Promise<boolean> {
		if (threshold <= 0) return true;

		const rows = await this.find({
			where: { role: 'user' },
			take: threshold,
			select: { id: true },
		});

		return rows.length >= threshold;
	}
}
