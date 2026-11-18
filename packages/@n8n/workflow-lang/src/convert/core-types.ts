/**
 * The core node types that have a native lowering (the keys of `NATIVE` in
 * `registry.ts`). The node compiler does not compile these from their source:
 * such a node reaches the fallback host only when its native form does not
 * fit. A test keeps the list equal to `NATIVE`.
 */
export const CORE_NODE_TYPES = new Set(
	[
		'noOp',
		'stickyNote',
		'if',
		'filter',
		'switch',
		'set',
		'merge',
		'limit',
		'sort',
		'splitOut',
		'aggregate',
		'removeDuplicates',
		'wait',
		'form',
		'respondToWebhook',
		'stopAndError',
		'code',
		'function',
		'functionItem',
		'aiTransform',
		'httpRequest',
		'splitInBatches',
		'executeWorkflow',
		'crypto',
		'renameKeys',
		'summarize',
	].map((t) => `n8n-nodes-base.${t}`),
);
