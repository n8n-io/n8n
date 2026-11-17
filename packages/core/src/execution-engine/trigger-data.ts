import type {
	IExecuteData,
	IRunExecutionData,
	ITriggerData,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { isExecutionOutputRedacted, isTriggerNode, TriggerDataSchema } from 'n8n-workflow';

/** Each sub-execution saves a copy, so a large item is not shared. */
export const MAX_TRIGGER_DATA_BYTES = 64 * 1024;

/**
 * Returns the JSON of the first item of the trigger that starts a root execution,
 * when the workflow shares trigger data. Returns nothing when the start node is
 * not a trigger (for example a partial manual run), when the run is redacted
 * (redaction does not apply to the execution context), or when the item is
 * larger than {@link MAX_TRIGGER_DATA_BYTES}.
 *
 * Call it after the context establishment hooks ran: they set the redaction
 * snapshot and strip sensitive fields from the trigger items.
 */
export function captureTriggerData(
	workflow: Workflow,
	startItem: IExecuteData,
	runExecutionData: IRunExecutionData,
	mode: WorkflowExecuteMode,
): ITriggerData | undefined {
	if (workflow.settings?.shareTriggerData !== true) return undefined;

	const { node } = startItem;
	const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
	if (!nodeType || !isTriggerNode(nodeType.description)) return undefined;

	if (isExecutionOutputRedacted(runExecutionData, workflow.settings, mode)) return undefined;

	const json = startItem.data.main?.[0]?.[0]?.json;
	if (!json) return undefined;

	// A round trip through JSON drops values that the context cannot save, such as functions.
	let serialized: string;
	try {
		serialized = JSON.stringify(json);
	} catch {
		// Sharing trigger data must not fail the run, for example on a circular value.
		return undefined;
	}
	if (Buffer.byteLength(serialized) > MAX_TRIGGER_DATA_BYTES) return undefined;

	const parsed = TriggerDataSchema.safeParse(JSON.parse(serialized));
	return parsed.success ? parsed.data : undefined;
}
