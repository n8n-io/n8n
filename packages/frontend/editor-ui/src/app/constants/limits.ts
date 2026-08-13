export { MAX_PINNED_DATA_SIZE, MAX_WORKFLOW_SIZE, MAX_EXPECTED_REQUEST_SIZE } from '@n8n/api-types';
export const MAX_DISPLAY_DATA_SIZE = 1024 * 1024; // 1 MB
export const MAX_DISPLAY_DATA_SIZE_SCHEMA_VIEW = 1024 * 1024 * 4; // 4 MB
export const MAX_DISPLAY_DATA_SIZE_LOGS_VIEW = 1024 * 512; // 512 KB
export const MAX_DISPLAY_ITEMS_AUTO_ALL = 250;
/**
 * Upper bound on the number of executions an execution-preview session keeps in
 * memory. Each retained execution holds a per-execution run-data store; once a
 * load would exceed this, the least-recently-used one is evicted.
 */
export const MAX_PREVIEW_EXECUTIONS_IN_MEMORY = 10;
