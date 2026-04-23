import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { EntityManager } from '@n8n/db';
import { In } from '@n8n/db';
import { Service } from '@n8n/di';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

import { EventDestinations } from '@/modules/log-streaming.ee/database/entities';
import { EventDestinationsRepository } from '@/modules/log-streaming.ee/database/repositories/event-destination.repository';

// The env schema mirrors the UI fields exactly (see logStreaming.constants.ts):
// fields hidden from the UI are not accepted here, and closed enums (method,
// facility, protocol) match the UI's dropdown values.

const circuitBreakerSchema = z
	.object({
		maxFailures: z.number().int().positive().optional(),
		failureWindow: z.number().int().min(100).optional(),
	})
	.strict()
	.optional();

const webhookParameterItemSchema = z
	.object({
		parameters: z.array(
			z
				.object({
					name: z.string(),
					value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
				})
				.strict(),
		),
	})
	.strict();

const webhookOptionsSchema = z
	.object({
		allowUnauthorizedCerts: z.boolean().optional(),
		queryParameterArrays: z.enum(['indices', 'brackets', 'repeat']).optional(),
		redirect: z
			.object({
				redirect: z
					.object({
						followRedirects: z.boolean().optional(),
						maxRedirects: z.number().int().positive().optional(),
					})
					.strict(),
			})
			.strict()
			.optional(),
		proxy: z
			.object({
				proxy: z
					.object({
						protocol: z.enum(['https', 'http']),
						host: z.string().min(1),
						port: z.number().int().positive(),
					})
					.strict(),
			})
			.strict()
			.optional(),
		timeout: z.number().int().positive().optional(),
		socket: z
			.object({
				keepAlive: z.boolean().optional(),
				maxSockets: z.number().int().positive().optional(),
				maxFreeSockets: z.number().int().positive().optional(),
			})
			.strict()
			.optional(),
	})
	.strict()
	.optional();

const commonFields = {
	id: z.string().uuid().optional(),
	label: z.string().min(1).optional(),
	enabled: z.boolean().optional(),
	subscribedEvents: z.array(z.string().min(1)).optional(),
	anonymizeAuditMessages: z.boolean().optional(),
	circuitBreaker: circuitBreakerSchema,
} as const;

const webhookEnvSchema = z
	.object({
		...commonFields,
		type: z.literal('webhook'),
		url: z.string().url(),
		method: z.enum(['GET', 'POST', 'PUT']).optional(),
		sendQuery: z.boolean().optional(),
		specifyQuery: z.enum(['keypair', 'json']).optional(),
		queryParameters: webhookParameterItemSchema.optional(),
		jsonQuery: z.string().optional(),
		sendHeaders: z.boolean().optional(),
		specifyHeaders: z.enum(['keypair', 'json']).optional(),
		headerParameters: webhookParameterItemSchema.optional(),
		jsonHeaders: z.string().optional(),
		options: webhookOptionsSchema,
	})
	.strict();

const syslogEnvSchema = z
	.object({
		...commonFields,
		type: z.literal('syslog'),
		host: z.string().min(1),
		port: z.number().int().positive().optional(),
		protocol: z.enum(['udp', 'tcp', 'tls']).optional(),
		facility: z.number().int().min(0).max(23).optional(),
		app_name: z.string().min(1).optional(),
		tlsCa: z.string().min(1).optional(),
	})
	.strict();

const sentryEnvSchema = z
	.object({
		...commonFields,
		type: z.literal('sentry'),
		dsn: z.string().url(),
	})
	.strict();

const envDestinationSchema = z.discriminatedUnion('type', [
	webhookEnvSchema,
	syslogEnvSchema,
	sentryEnvSchema,
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
			'logStreamingManagedByEnv is enabled — reconciling log streaming destinations from env vars',
		);

		const items = this.parseAndValidate(this.config.logStreamingDestinations);

		await this.eventDestinationsRepository.manager.transaction(async (tx) => {
			await this.reconcile(tx, items);
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
		const seenLabelType = new Set<string>();

		items.forEach((item, index) => {
			if (!item.id && !item.label) {
				throw new Error(
					`N8N_LOG_STREAMING_DESTINATIONS[${index}] must have either "id" or "label" for stable reconciliation`,
				);
			}
			if (item.type === 'syslog' && item.protocol === 'tls' && !item.tlsCa) {
				throw new Error(
					`N8N_LOG_STREAMING_DESTINATIONS[${index}] must provide "tlsCa" when "protocol" is "tls"`,
				);
			}
			if (item.id) {
				if (seenIds.has(item.id)) {
					throw new Error(
						`N8N_LOG_STREAMING_DESTINATIONS has duplicate id "${item.id}" at index ${index}`,
					);
				}
				seenIds.add(item.id);
			} else if (item.label) {
				const key = `${item.type}:${item.label}`;
				if (seenLabelType.has(key)) {
					throw new Error(
						`N8N_LOG_STREAMING_DESTINATIONS has duplicate (type,label) "${item.type}/${item.label}" at index ${index}`,
					);
				}
				seenLabelType.add(key);
			}
		});

		return items;
	}

	private async reconcile(tx: EntityManager, items: EnvDestination[]): Promise<void> {
		const existing = await tx.find(EventDestinations, {
			order: { createdAt: 'ASC', id: 'ASC' },
		});

		const byId = new Map(existing.map((row) => [row.id, row]));
		const byLabelType = new Map<string, EventDestinations[]>();
		for (const row of existing) {
			const dest = row.destination;
			if (dest?.label && dest.__type) {
				const key = `${dest.__type}:${dest.label}`;
				const bucket = byLabelType.get(key) ?? [];
				bucket.push(row);
				byLabelType.set(key, bucket);
			}
		}

		const keptIds = new Set<string>();
		const toDelete = new Set<string>();
		const toUpsert: Array<Pick<EventDestinations, 'id' | 'destination'>> = [];

		for (const item of items) {
			let targetId: string;

			if (item.id) {
				const match = byId.get(item.id);
				targetId = match ? match.id : item.id;
			} else {
				const internalType = TYPE_TO_INTERNAL[item.type];
				const key = `${internalType}:${item.label!}`;
				const matches = byLabelType.get(key) ?? [];
				if (matches.length > 0) {
					targetId = matches[0].id;
					for (let i = 1; i < matches.length; i++) toDelete.add(matches[i].id);
				} else {
					targetId = uuid();
				}
			}

			keptIds.add(targetId);
			toUpsert.push({
				id: targetId,
				destination: toDestinationOptions(item, targetId),
			});
		}

		for (const row of existing) {
			if (!keptIds.has(row.id)) toDelete.add(row.id);
		}
		for (const id of keptIds) toDelete.delete(id);

		if (toUpsert.length > 0) {
			await tx.upsert(EventDestinations, toUpsert, { conflictPaths: ['id'] });
		}
		if (toDelete.size > 0) {
			await tx.delete(EventDestinations, { id: In(Array.from(toDelete)) });
		}
	}
}
