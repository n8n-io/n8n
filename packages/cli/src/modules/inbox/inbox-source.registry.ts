import type {
	InboxCategory,
	InboxCounts,
	InboxItem,
	InboxSourceType,
	InboxState,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';

export type InboxSourceBoundary =
	// Include only earlier timestamps.
	| { mode: 'beforeTime'; updatedAt: Date }
	// Include equal timestamps from sources ordered after the cursor's source.
	| { mode: 'beforeOrAtTime'; updatedAt: Date }
	// Include earlier timestamps, or equal timestamps with a greater ID in database order.
	| { mode: 'afterItem'; updatedAt: Date; id: string };

export type InboxSourceQuery = {
	state: InboxState;
	category?: InboxCategory;
	limit: number;
	boundary?: InboxSourceBoundary;
};

export interface InboxSource {
	type: InboxSourceType;
	// Return false when configuration or licensing excludes the source. Reject if the check fails.
	isEnabled(): Promise<boolean>;
	// Apply access, state, and category filters before the boundary and limit.
	// Return updatedAt DESC, then id ASC in database order.
	list(user: User, query: InboxSourceQuery): Promise<InboxItem[]>;
	// Use the same access and state rules as list, without a boundary or limit.
	count(user: User): Promise<InboxCounts>;
}

@Service()
export class InboxSourceRegistry {
	private readonly sources = new Map<InboxSourceType, InboxSource>();

	constructor(private readonly logger: Logger) {}

	register(source: InboxSource) {
		if (this.sources.has(source.type)) {
			throw new UnexpectedError('Inbox source is already registered', {
				extra: { type: source.type },
			});
		}
		this.sources.set(source.type, source);
	}

	find(type: InboxSourceType) {
		return this.sources.get(type);
	}

	types() {
		return [...this.sources.keys()];
	}

	async getAllAvailable(types = this.types()) {
		const checks = await Promise.allSettled(
			types.map(async (type) => {
				const source = this.sources.get(type);
				return source && (await source.isEnabled()) ? source : undefined;
			}),
		);
		const available: InboxSource[] = [];
		const failedSources: InboxSourceType[] = [];
		const disabledSources: InboxSourceType[] = [];
		for (const [index, type] of types.entries()) {
			const check = checks[index];
			if (check.status === 'rejected') {
				this.logger.warn('Inbox source availability check failed', { type, error: check.reason });
				failedSources.push(type);
			} else if (check.value) {
				available.push(check.value);
			} else {
				disabledSources.push(type);
			}
		}
		return { available, failedSources, disabledSources };
	}
}
