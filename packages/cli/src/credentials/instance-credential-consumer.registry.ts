import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

export interface InstanceCredentialConsumer {
	readonly id: string;
	readonly credentialTypes: readonly string[];
}

@Service()
export class InstanceCredentialConsumerRegistry {
	private readonly consumers = new Map<string, InstanceCredentialConsumer>();

	register(consumer: InstanceCredentialConsumer) {
		if (consumer.id.trim().length === 0) {
			throw new UnexpectedError('Instance credential consumer ID cannot be empty');
		}
		if (this.consumers.has(consumer.id)) {
			throw new UnexpectedError(
				`Instance credential consumer "${consumer.id}" is already registered`,
			);
		}
		if (consumer.credentialTypes.length === 0) {
			throw new UnexpectedError(
				`Instance credential consumer "${consumer.id}" must allow at least one credential type`,
			);
		}

		this.consumers.set(consumer.id, consumer);
	}

	get(consumerId: string): InstanceCredentialConsumer {
		const consumer = this.consumers.get(consumerId);
		if (!consumer) {
			throw new UnexpectedError(`Unknown instance credential consumer "${consumerId}"`);
		}
		return consumer;
	}
}
