import type {
	InboxCategory,
	InboxCounts,
	InboxItem,
	InboxSourceType,
	InboxState,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';

export type InboxSourceBoundary =
	// Compare timestamps with < for beforeTime and <= for atOrBeforeTime.
	| { mode: 'beforeTime' | 'atOrBeforeTime'; createdAt: Date }
	// Include earlier timestamps, or equal timestamps with a greater ID in database order.
	| { mode: 'afterItem'; createdAt: Date; id: string };

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
	// Return createdAt DESC, then id ASC in database order.
	list(user: User, query: InboxSourceQuery): Promise<InboxItem[]>;
	// Use the same access and state rules as list, without a boundary or limit.
	count(user: User): Promise<InboxCounts>;
}

@Service()
export class InboxSourceRegistry {
	private readonly sources = new Map<InboxSourceType, InboxSource>();

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
}
