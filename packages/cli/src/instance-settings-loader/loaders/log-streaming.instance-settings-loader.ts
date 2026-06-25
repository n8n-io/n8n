import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { EntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import {
	MessageEventBusDestinationSentryOptionsSchema,
	MessageEventBusDestinationSyslogOptionsSchema,
	MessageEventBusDestinationTypeNames,
	MessageEventBusDestinationWebhookOptionsSchema,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

import { EventDestinationsRepository } from '@/modules/log-streaming.ee/database/repositories/event-destination.repository';
import { EventDestinations } from '@/modules/log-streaming.ee/database/entities';

import { InstanceBootstrappingError } from '../instance-bootstrapping.error';

// Env var format reuses the canonical destination DTOs from `n8n-workflow`,
// with three deliberate adjustments per variant:
//  1. Replace the internal `__type: '$$MessageEventBusDestination…'` discriminator
//     with a friendlier `type: 'webhook' | 'syslog' | 'sentry'`.
//  2. Tighten `id` to a UUID (the DTO only requires a non-empty string).
//  3. Switch to strict mode so unknown keys in the env JSON fail loudly
//     rather than being silently dropped on insert.
const envWebhookSchema = MessageEventBusDestinationWebhookOptionsSchema.omit({ __type: true })
	.extend({
		type: z.literal('webhook'),
		id: z.string().uuid().optional(),
	})
	.strict();

const envSyslogSchema = MessageEventBusDestinationSyslogOptionsSchema.omit({ __type: true })
	.extend({
		type: z.literal('syslog'),
		id: z.string().uuid().optional(),
	})
	.strict();

const envSentrySchema = MessageEventBusDestinationSentryOptionsSchema.omit({ __type: true })
	.extend({
		type: z.literal('sentry'),
		id: z.string().uuid().optional(),
	})
	.strict();

const envDestinationSchema = z.discriminatedUnion('type', [
	envWebhookSchema,
	envSyslogSchema,
	envSentrySchema,
]);

const envDestinationsSchema = z.array(envDestinationSchema);

type EnvDestination = z.infer<typeof envDestinationSchema>;

const TYPE_TO_INTERNAL: Record<EnvDestination['type'], MessageEventBusDestinationTypeNames> = {
	webhook: MessageEventBusDestinationTypeNames.webhook,
	syslog: MessageEventBusDestinationTypeNames.syslog,
	sentry: MessageEventBusDestinationTypeNames.sentry,
};

function toDestinationOptions(env: EnvDestination, id: string): MessageEventBusDestinationOptions {
	const { type, id: _ignored, ...rest } = env;
	return {
		...rest,
		__type: TYPE_TO_INTERNAL[type],
		id,
	} as MessageEventBusDestinationOptions;
}

@Service()
export class LogStreamingInstanceSettingsLoader {
	constructor(
		private readonly config: InstanceSettingsLoaderConfig,
		private readonly eventDestinationsRepository: EventDestinationsRepository,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async run(): Promise<'created' | 'skipped'> {
		if (!this.config.logStreamingManagedByEnv) {
			this.logger.debug(
				'logStreamingManagedByEnv is disabled — skipping log streaming destinations env config',
			);
			return 'skipped';
		}

		this.logger.info(
			'logStreamingManagedByEnv is enabled — replacing log streaming destinations from env vars',
		);

		let items: EnvDestination[] = [];
		try {
			items = this.parseAndValidate(this.config.logStreamingDestinations);
		} catch (error) {
			const message = (error as Error).message ?? 'Unknown error';
			this.logger.error(message);
			throw new InstanceBootstrappingError(message);
		}

		await this.eventDestinationsRepository.manager.transaction(async (tx) => {
			await this.replace(tx, items);
		});

		return 'created';
	}

	private parseAndValidate(raw: string): EnvDestination[] {
		const trimmed = (raw ?? '').trim();
		if (trimmed.length === 0) return [];

		let parsed: unknown;
		try {
			parsed = JSON.parse(trimmed);
		} catch (error) {
			throw new Error(
				`N8N_LOG_STREAMING_DESTINATIONS is not valid JSON: ${(error as Error).message}`,
			);
		}

		const result = envDestinationsSchema.safeParse(parsed);
		if (!result.success) {
			const issue = result.error.issues[0];
			const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
			throw new Error(
				`N8N_LOG_STREAMING_DESTINATIONS validation failed at "${path}": ${issue.message}`,
			);
		}

		const items = result.data;
		const seenIds = new Set<string>();

		items.forEach((item, index) => {
			if (item.id) {
				if (seenIds.has(item.id)) {
					throw new Error(
						`N8N_LOG_STREAMING_DESTINATIONS has duplicate id "${item.id}" at index ${index}`,
					);
				}
				seenIds.add(item.id);
			}
		});

		return items;
	}

	private async replace(tx: EntityManager, items: EnvDestination[]): Promise<void> {
		await tx.delete(EventDestinations, {});

		if (items.length === 0) return;

		const rows = items.map((item) => {
			const id = item.id ?? uuid();
			return {
				id,
				destination: toDestinationOptions(item, id),
			};
		});

		await tx.insert(EventDestinations, rows);
	}
}
