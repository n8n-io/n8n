import {
	inboxCategorySchema,
	inboxSourceTypeSchema,
	inboxStateSchema,
	type GetInboxSummaryResponse,
	type InboxCategory,
	type InboxItem,
	type InboxSettings,
	type InboxSourceStatus,
	type InboxSourceType,
	type InboxState,
	type ListInboxQueryDto,
	type ListInboxResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ServiceUnavailableError } from '@n8n/errors';
import { z } from 'zod';

import { InboxSourceRegistry, type InboxSourceBoundary } from './inbox-source.registry';

const sourceOrder: InboxSourceType[] = ['workflow_review', 'self_healing_result'];

const cursorSchema = z
	.object({
		version: z.literal(2),
		state: inboxStateSchema,
		category: inboxCategorySchema.optional(),
		after: z.object({
			updatedAt: z.string().datetime(),
			type: inboxSourceTypeSchema,
			id: z.string().min(1).max(128),
		}),
		activeSources: z.array(inboxSourceTypeSchema).min(1).max(sourceOrder.length),
		failedSources: z.array(inboxSourceTypeSchema).max(sourceOrder.length),
	})
	.strict();

type InboxCursor = z.infer<typeof cursorSchema>;

class InboxUnavailableError extends ServiceUnavailableError {
	override readonly meta: Record<string, unknown>;

	constructor(status: InboxSourceStatus) {
		super('Inbox is temporarily unavailable');
		this.meta = { ...status };
	}
}

@Service()
export class InboxService {
	constructor(
		private readonly registry: InboxSourceRegistry,
		private readonly logger: Logger,
	) {}

	async list(user: User, query: ListInboxQueryDto): Promise<ListInboxResponse> {
		const sourceTypes = this.sourcesForCategory(query.category);
		const cursor = query.cursor
			? this.decodeCursor(query.cursor, query.state, query.category, sourceTypes)
			: undefined;
		const {
			available,
			failedSources: unavailableSources,
			disabledSources,
		} = await this.registry.getAllAvailable(
			cursor?.activeSources ?? this.registry.types().filter((type) => sourceTypes.includes(type)),
		);
		const results = await Promise.allSettled(
			available.map(
				async (source) =>
					await source.list(user, {
						state: query.state,
						...(query.category !== undefined ? { category: query.category } : {}),
						limit: query.limit + 1,
						boundary: this.boundaryFor(source.type, cursor?.after),
					}),
			),
		);
		const successful: Array<{ type: InboxSourceType; items: InboxItem[] }> = [];
		const failedSources = [...new Set([...(cursor?.failedSources ?? []), ...unavailableSources])];
		for (const [index, source] of available.entries()) {
			const result = results[index];
			if (result.status === 'rejected') {
				this.logger.warn('Inbox source list failed', { type: source.type, error: result.reason });
				failedSources.push(source.type);
			} else {
				successful.push({ type: source.type, items: result.value });
			}
		}
		const status: InboxSourceStatus = {
			partial: failedSources.length > 0,
			failedSources,
			disabledSources,
		};
		if (successful.length === 0 && status.partial) {
			throw new InboxUnavailableError(status);
		}

		const rows = this.mergeRows(
			successful.map(({ items }) => items),
			query.limit + 1,
		);
		const data = rows.slice(0, query.limit);
		const hasMore = rows.length > query.limit;
		const last = data.at(-1);

		return {
			...status,
			data,
			hasMore,
			nextCursor:
				hasMore && last
					? this.encodeCursor({
							version: 2,
							state: query.state,
							...(query.category !== undefined ? { category: query.category } : {}),
							after: { updatedAt: last.updatedAt, type: last.type, id: last.id },
							activeSources: successful.map(({ type }) => type),
							failedSources,
						})
					: null,
		};
	}

	async getSummary(user: User): Promise<GetInboxSummaryResponse> {
		const { available, failedSources, disabledSources } = await this.registry.getAllAvailable();
		const results = await Promise.allSettled(
			available.map(async (source) => await source.count(user)),
		);
		const counts = { open: 0, closed: 0 };
		let successfulReads = 0;
		for (const [index, source] of available.entries()) {
			const result = results[index];
			if (result.status === 'rejected') {
				this.logger.warn('Inbox source count failed', { type: source.type, error: result.reason });
				failedSources.push(source.type);
			} else {
				successfulReads++;
				counts.open += result.value.open;
				counts.closed += result.value.closed;
			}
		}
		const status: InboxSourceStatus = {
			partial: failedSources.length > 0,
			failedSources,
			disabledSources,
		};
		if (successfulReads === 0 && status.partial) {
			throw new InboxUnavailableError(status);
		}

		return { ...status, counts: status.partial ? null : counts };
	}

	async getSettings(): Promise<InboxSettings> {
		const { available, failedSources } = await this.registry.getAllAvailable();
		return {
			enabled: available.length > 0 || failedSources.length > 0,
			availableTypes: available.map(({ type }) => type),
			failedTypes: failedSources,
		};
	}

	private boundaryFor(
		type: InboxSourceType,
		after: InboxCursor['after'] | undefined,
	): InboxSourceBoundary | undefined {
		if (!after) return undefined;
		const updatedAt = new Date(after.updatedAt);
		if (type === after.type) return { mode: 'afterItem', updatedAt, id: after.id };
		// Later sources still have unread rows at the cursor's timestamp.
		return {
			mode:
				sourceOrder.indexOf(type) > sourceOrder.indexOf(after.type)
					? 'beforeOrAtTime'
					: 'beforeTime',
			updatedAt,
		};
	}

	private mergeRows(pages: InboxItem[][], limit: number): InboxItem[] {
		// Stable sorting preserves each source's database order for equal timestamps.
		return pages
			.flat()
			.sort(
				(left, right) =>
					Date.parse(right.updatedAt) - Date.parse(left.updatedAt) ||
					sourceOrder.indexOf(left.type) - sourceOrder.indexOf(right.type),
			)
			.slice(0, limit);
	}

	private encodeCursor(cursor: InboxCursor): string {
		return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
	}

	private sourcesForCategory(category?: InboxCategory): InboxSourceType[] {
		return category === 'authored' ? ['workflow_review'] : sourceOrder;
	}

	private decodeCursor(
		value: string,
		state: InboxState,
		category: InboxCategory | undefined,
		sourceTypes: InboxSourceType[],
	): InboxCursor {
		try {
			if (value.length > 2048 || !/^[\w-]+$/.test(value)) {
				throw new BadRequestError('Invalid Inbox pagination cursor');
			}
			const cursor = cursorSchema.parse(
				JSON.parse(Buffer.from(value, 'base64url').toString('utf8')),
			);
			const sources = [...cursor.activeSources, ...cursor.failedSources];
			if (
				cursor.state !== state ||
				cursor.category !== category ||
				sources.some((type) => !sourceTypes.includes(type)) ||
				new Set(sources).size !== sources.length ||
				!cursor.activeSources.includes(cursor.after.type)
			) {
				throw new BadRequestError('Invalid Inbox pagination cursor');
			}
			return cursor;
		} catch {
			throw new BadRequestError('Invalid Inbox pagination cursor');
		}
	}
}
