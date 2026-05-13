import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { BoardStatusChangedEvent, IBoardEventEmitter } from 'n8n-workflow';

type StatusChangedListener = (event: BoardStatusChangedEvent) => void;

interface ListenerEntry {
	status: string | undefined;
	handler: StatusChangedListener;
}

@Service()
export class BoardEventEmitter implements IBoardEventEmitter {
	private readonly listeners = new Map<string, Set<ListenerEntry>>();

	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('board-events');
	}

	onStatusChanged(
		boardId: string,
		status: string | undefined,
		listener: StatusChangedListener,
	): () => void {
		if (!this.listeners.has(boardId)) {
			this.listeners.set(boardId, new Set());
		}

		const entry: ListenerEntry = { status, handler: listener };
		this.listeners.get(boardId)!.add(entry);

		return () => {
			const entries = this.listeners.get(boardId);
			if (entries) {
				entries.delete(entry);
				if (entries.size === 0) {
					this.listeners.delete(boardId);
				}
			}
		};
	}

	emit(event: BoardStatusChangedEvent): void {
		const entries = this.listeners.get(event.boardId);
		if (!entries || entries.size === 0) return;

		for (const entry of entries) {
			if (entry.status === undefined || entry.status === event.newStatus) {
				try {
					entry.handler(event);
				} catch (error) {
					this.logger.error('Error in board event listener', {
						boardId: event.boardId,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			}
		}
	}
}
