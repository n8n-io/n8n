/**
 * Relative-time anchors injected into eval LLM prompts — Phase 1 hints,
 * Phase 1.5 pin data, Phase 2 HTTP mocks must all include them and derive
 * every temporal value from them.
 *
 * The implementation lives in `@n8n/workflow-sdk` (`mock-data/date-anchors`),
 * shared with pin-data/fixture generation; this module keeps the local import
 * path for the eval pipeline.
 */
export { buildDateAnchors } from '@n8n/workflow-sdk';
