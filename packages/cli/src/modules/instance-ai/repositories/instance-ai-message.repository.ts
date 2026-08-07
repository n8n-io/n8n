import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { InstanceAiMessage } from '../entities/instance-ai-message.entity';

@Service()
export class InstanceAiMessageRepository extends Repository<InstanceAiMessage> {
	constructor(dataSource: DataSource) {
		super(InstanceAiMessage, dataSource.manager);
	}

	/**
	 * Whether anyone on this instance has ever sent the assistant a message.
	 *
	 * Instance-wide on purpose: the credit pool is per license, not per user, so "has this instance
	 * used the assistant" is the question the activation lock asks (INS-1082). Only `user` messages
	 * count — assistant and tool rows exist for runs the user never initiated.
	 */
	async hasAnyUserMessage(): Promise<boolean> {
		return await this.existsBy({ role: 'user' });
	}
}
