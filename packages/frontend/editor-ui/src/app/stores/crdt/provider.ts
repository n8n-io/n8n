import { createCRDTProvider, CRDTEngine } from '@n8n/crdt';

/**
 * Shared CRDT provider for the editor.
 *
 * The Yjs provider is stateless — `createDoc()` just constructs a fresh
 * document — so a single instance is safe to share process-wide. Each workflow
 * document store creates its own `CRDTDoc` from this provider, keyed by the
 * store id.
 */
export const crdtProvider = createCRDTProvider({ engine: CRDTEngine.yjs });
