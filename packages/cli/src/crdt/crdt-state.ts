import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { CRDTEngine, createCRDTProvider, type CRDTDoc } from '@n8n/crdt';

interface Subscriber {
	userId: User['id'];
	pushRef: string;
}

/**
 * Data structure for seeding a workflow into a CRDT document.
 */
export interface WorkflowSeedData {
	id: string;
	name: string;
	nodes: unknown[];
	connections: Record<string, unknown>;
	settings?: Record<string, unknown>;
}

/**
 * In-memory state management for CRDT documents.
 *
 * For production use, this would need to be extended with:
 * - Database persistence
 * - Document cleanup on inactivity
 * - Multi-instance support via pubsub
 */
@Service()
export class CRDTState {
	/** CRDT documents by docId */
	private docs = new Map<string, CRDTDoc>();

	/** Track which documents have been seeded with initial data */
	private seededDocs = new Set<string>();

	/** Subscribers by docId */
	private subscribers = new Map<string, Subscriber[]>();

	/** pushRef to docIds mapping for cleanup */
	private pushRefDocs = new Map<string, Set<string>>();

	private readonly provider = createCRDTProvider({ engine: CRDTEngine.yjs });

	constructor(private readonly logger: Logger) {}

	/**
	 * Get or create a CRDT document
	 */
	private getOrCreateDoc(docId: string): CRDTDoc {
		let doc = this.docs.get(docId);
		if (!doc) {
			doc = this.provider.createDoc(docId);
			this.docs.set(docId, doc);
			this.logger.debug('Created CRDT document', { docId });
		}
		return doc;
	}

	/**
	 * Get the current state of a document as Uint8Array
	 */
	getStateBytes(docId: string): Uint8Array {
		const doc = this.getOrCreateDoc(docId);
		return doc.encodeState();
	}

	/**
	 * Apply an update (Uint8Array) to a document
	 */
	applyUpdateBytes(docId: string, update: Uint8Array): void {
		const doc = this.getOrCreateDoc(docId);
		doc.applyUpdate(update);
		this.logger.debug('Applied CRDT update', { docId, size: update.length });
	}

	/**
	 * Get the current awareness state as Uint8Array
	 */
	getAwarenessBytes(docId: string): Uint8Array {
		const doc = this.getOrCreateDoc(docId);
		const awareness = doc.getAwareness();
		return awareness.encodeState();
	}

	/**
	 * Apply an awareness update (Uint8Array) to a document
	 */
	applyAwarenessBytes(docId: string, update: Uint8Array): void {
		const doc = this.getOrCreateDoc(docId);
		const awareness = doc.getAwareness();
		awareness.applyUpdate(update);
		this.logger.debug('Applied awareness update', { docId, size: update.length });
	}

	/**
	 * Add a subscriber to a document
	 */
	addSubscriber(docId: string, userId: User['id'], pushRef: string): void {
		let subs = this.subscribers.get(docId);
		if (!subs) {
			subs = [];
			this.subscribers.set(docId, subs);
		}

		// Don't add duplicates
		if (!subs.some((s) => s.pushRef === pushRef)) {
			subs.push({ userId, pushRef });
			this.logger.debug('Added subscriber', { docId, pushRef });
		}

		// Track pushRef -> docIds for cleanup
		let docIds = this.pushRefDocs.get(pushRef);
		if (!docIds) {
			docIds = new Set();
			this.pushRefDocs.set(pushRef, docIds);
		}
		docIds.add(docId);
	}

	/**
	 * Get all subscribers for a document
	 */
	getSubscribers(docId: string): Subscriber[] {
		return this.subscribers.get(docId) || [];
	}

	/**
	 * Remove a subscriber from all documents (e.g., on disconnect)
	 */
	removeSubscriber(pushRef: string): void {
		const docIds = this.pushRefDocs.get(pushRef);
		if (!docIds) return;

		for (const docId of docIds) {
			const subs = this.subscribers.get(docId);
			if (subs) {
				const index = subs.findIndex((s) => s.pushRef === pushRef);
				if (index !== -1) {
					subs.splice(index, 1);
					this.logger.debug('Removed subscriber', { docId, pushRef });

					// Cleanup empty subscriber lists and potentially docs
					if (subs.length === 0) {
						this.subscribers.delete(docId);
						// Optionally destroy doc if no subscribers
						// For now, keep it in memory for subsequent connections
					}
				}
			}
		}

		this.pushRefDocs.delete(pushRef);
	}

	/**
	 * Get document for direct access (e.g., for initial data seeding)
	 */
	getDoc(docId: string): CRDTDoc {
		return this.getOrCreateDoc(docId);
	}

	/**
	 * Clean up a document when no more connections exist.
	 * This removes the document from memory and clears seeded state.
	 */
	cleanupDoc(docId: string): void {
		const doc = this.docs.get(docId);
		if (doc) {
			doc.destroy();
			this.docs.delete(docId);
			this.seededDocs.delete(docId);
			this.logger.debug('Cleaned up CRDT document', { docId });
		}
	}

	/**
	 * Check if a document needs to be seeded with initial data.
	 * Returns true if the document hasn't been seeded yet.
	 */
	needsSeeding(docId: string): boolean {
		return !this.seededDocs.has(docId);
	}

	/**
	 * Seed a document with workflow data.
	 * This should only be called once per document (on first connection).
	 */
	seedWorkflow(docId: string, workflow: WorkflowSeedData): void {
		if (this.seededDocs.has(docId)) {
			this.logger.debug('Document already seeded, skipping', { docId });
			return;
		}

		const doc = this.getOrCreateDoc(docId);

		doc.transact(() => {
			// Seed workflow metadata
			const meta = doc.getMap<unknown>('meta');
			meta.set('id', workflow.id);
			meta.set('name', workflow.name);
			if (workflow.settings) {
				meta.set('settings', workflow.settings);
			}

			// Seed nodes - each node is a nested CRDTMap for fine-grained updates
			const nodesMap = doc.getMap<unknown>('nodes');
			for (const node of workflow.nodes as Array<{ id: string; [key: string]: unknown }>) {
				if (node.id) {
					// Create a nested CRDTMap for this node
					const nodeMap = doc.createMap<unknown>();
					for (const [key, value] of Object.entries(node)) {
						nodeMap.set(key, value);
					}
					nodesMap.set(node.id, nodeMap);
				}
			}

			// Seed connections
			const connectionsMap = doc.getMap<unknown>('connections');
			for (const [key, value] of Object.entries(workflow.connections)) {
				connectionsMap.set(key, value);
			}
		});

		this.seededDocs.add(docId);
		this.logger.debug('Seeded workflow into CRDT document', {
			docId,
			workflowId: workflow.id,
			nodeCount: workflow.nodes.length,
		});
	}
}
