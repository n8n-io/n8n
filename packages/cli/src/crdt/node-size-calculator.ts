/**
 * Re-export calculateNodeSize from n8n-workflow for backward compatibility.
 *
 * The implementation has been moved to the shared n8n-workflow package
 * so it can be used by both the server and the coordinator SharedWorker.
 */
export { calculateNodeSize, type NodeSizeInputs } from 'n8n-workflow';
