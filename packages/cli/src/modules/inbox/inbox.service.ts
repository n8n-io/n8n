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

import {
	InboxSourceRegistry,
	type InboxSource,
	type InboxSourceBoundary,
} from './inbox-source.registry';

const sourceOrder: InboxSourceType[] = ['workflow_review', 'self_healing_result'];

const cursorSchema = z
	.object({
		version: z.literal(1),
		state: inboxStateSchema,
		category: inboxCategorySchema.optional(),
		after: z.object({
			createdAt: z.string().datetime(),
			type: inboxSourceTypeSchema,
			id: z.string().min(1).max(128),
		}),
		activeSources: z.array(inboxSourceTypeSchema).min(1).max(sourceOrder.length),
		failedSources: z.array(inboxSourceTypeSchema).max(sourceOrder.length),
	})
	.strict();

type InboxCursor = z.infer<typeof cursorSchema>;

type SourceReads<T> = {
	successful: Array<{ type: InboxSourceType; value: T }>;
	failedSources: InboxSourceType[];
	disabledSources: InboxSourceType[];
};

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
		if (query.state === 'closed' && query.category !== undefined) {
			throw new BadRequestError('Inbox categories are only available for open items');
		}
		const sourceTypes = this.sourcesForCategory(query.category);
		const cursor = query.cursor
			? this.decodeCursor(query.cursor, query.state, query.category, sourceTypes)
			: undefined;
		const reads = await this.readAvailableSources(
			cursor?.activeSources ?? this.registry.types().filter((type) => sourceTypes.includes(type)),
			async (source) =>
				await source.list(user, {
					state: query.state,
					...(query.category !== undefined ? { category: query.category } : {}),
					limit: query.limit + 1,
					boundary: this.boundaryFor(source.type, cursor?.after),
				}),
		);
		const failedSources = [...new Set([...(cursor?.failedSources ?? []), ...reads.failedSources])];
		const status: InboxSourceStatus = {
			partial: failedSources.length > 0,
			failedSources,
			disabledSources: reads.disabledSources,
		};
		if (reads.successful.length === 0 && status.partial) {
			throw new InboxUnavailableError(status);
		}

		const rows = this.mergeRows(
			reads.successful.map(({ value }) => value),
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
							version: 1,
							state: query.state,
							...(query.category !== undefined ? { category: query.category } : {}),
							after: { createdAt: last.createdAt, type: last.type, id: last.id },
							activeSources: reads.successful.map(({ type }) => type),
							failedSources,
						})
					: null,
		};
	}

	async getSummary(user: User): Promise<GetInboxSummaryResponse> {
		const reads = await this.readAvailableSources(
			this.registry.types(),
			async (source) => await source.count(user),
		);
		const status: InboxSourceStatus = {
			partial: reads.failedSources.length > 0,
			failedSources: reads.failedSources,
			disabledSources: reads.disabledSources,
		};
		if (reads.successful.length === 0 && status.partial) {
			throw new InboxUnavailableError(status);
		}

		return {
			...status,
			counts: status.partial
				? null
				: reads.successful.reduce(
						(counts, { value }) => ({
							open: counts.open + value.open,
							closed: counts.closed + value.closed,
						}),
						{ open: 0, closed: 0 },
					),
		};
	}

	async getSettings(): Promise<InboxSettings> {
		const reads = await this.readAvailableSources(this.registry.types(), async () => true);
		return {
			enabled: reads.successful.length > 0 || reads.failedSources.length > 0,
			availableTypes: reads.successful.map(({ type }) => type),
			failedTypes: reads.failedSources,
		};
	}

	private async readAvailableSources<T>(
		types: InboxSourceType[],
		operation: (source: InboxSource) => Promise<T>,
	): Promise<SourceReads<T>> {
		const settled = await Promise.allSettled(
			types.map(async (type): Promise<{ disabled: true } | { disabled: false; value: T }> => {
				const source = this.registry.find(type);
				if (!source || !(await source.isEnabled())) return { disabled: true };
				return { disabled: false, value: await operation(source) };
			}),
		);
		const reads: SourceReads<T> = { successful: [], failedSources: [], disabledSources: [] };
		for (const [index, type] of types.entries()) {
			const result = settled[index];
			if (result.status === 'rejected') {
				this.logger.warn('Inbox source read failed', { type, error: result.reason });
				reads.failedSources.push(type);
			} else if (result.value.disabled) {
				reads.disabledSources.push(type);
			} else {
				reads.successful.push({ type, value: result.value.value });
			}
		}
		return reads;
	}

	private boundaryFor(
		type: InboxSourceType,
		after: InboxCursor['after'] | undefined,
	): InboxSourceBoundary | undefined {
		if (!after) return undefined;
		const createdAt = new Date(after.createdAt);
		if (type === after.type) return { mode: 'afterItem', createdAt, id: after.id };
		// Other sources resume at older timestamps. Equal timestamps can be skipped.
		return { mode: 'beforeTime', createdAt };
	}

	private mergeRows(pages: InboxItem[][], limit: number): InboxItem[] {
		const streams = pages.map((items) => ({ items, index: 0 }));
		const rows: InboxItem[] = [];
		while (rows.length < limit) {
			let next: (typeof streams)[number] | undefined;
			for (const stream of streams) {
				const item = stream.items[stream.index];
				if (!item) continue;
				const current = next?.items[next.index];
				const timeDifference = current
					? Date.parse(item.createdAt) - Date.parse(current.createdAt)
					: 0;
				if (
					!current ||
					timeDifference > 0 ||
					(timeDifference === 0 &&
						sourceOrder.indexOf(item.type) < sourceOrder.indexOf(current.type))
				) {
					next = stream;
				}
			}
			if (!next) break;
			// Keep each source's database order, including its ID collation.
			rows.push(next.items[next.index++]);
		}
		return rows;
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
			if (value.length > 2048 || !/^[\w-]+$/.test(value)) throw new Error();
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
				throw new Error();
			}
			return cursor;
		} catch {
			throw new BadRequestError('Invalid Inbox pagination cursor');
		}
	}
}
