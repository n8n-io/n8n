export const MANUAL_TRIGGER_TYPE = 'n8n-nodes-base.manualTrigger';
/** The one node whose `executeWorkflow` call the shim turns into a sub-execution. */
export const EXECUTE_WORKFLOW_TYPE = 'n8n-nodes-base.executeWorkflow';
export const MERGE_TYPE = 'n8n-nodes-base.merge';
export const SPLIT_IN_BATCHES_TYPE = 'n8n-nodes-base.splitInBatches';

/** The version the shim rebuilds a batch node at, matching SplitInBatchesV3. */
export const SPLIT_IN_BATCHES_TYPE_VERSION = 3;

/** SplitInBatchesV3's own default, for a workflow that never set the parameter. */
export const DEFAULT_BATCH_SIZE = 1;
export const MAIN_CONNECTION_TYPE = 'main';
