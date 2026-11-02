import type {
	InstanceAiFileAttachment,
	InstanceAiResourceAttachment,
	InstanceAiThreadArtifactsContext,
} from '@n8n/api-types';

/**
 * A resource attachment as the trace records it: the reference, not its contents.
 */
type TracedResourceAttachment = {
	type: InstanceAiResourceAttachment['type'];
	id: string;
	projectId?: string;
	executionId?: string;
};

function traceResourceAttachment(
	attachment: InstanceAiResourceAttachment,
): TracedResourceAttachment {
	if (attachment.type === 'nodes') {
		return { type: attachment.type, id: attachment.workflowId };
	}

	const resource: TracedResourceAttachment = { type: attachment.type, id: attachment.id };
	if (attachment.type === 'agent') {
		resource.projectId = attachment.projectId;
	}
	if (attachment.type === 'workflow' && attachment.executionId) {
		resource.executionId = attachment.executionId;
	}
	return resource;
}

/**
 * A file as the trace input gets it: the base64 content of the current
 * runtime, or a stored file reference of the Assistant agent.
 */
export type TraceFileAttachment =
	| InstanceAiFileAttachment
	| { mimeType: string; sizeBytes: number };

/** The base64 length, so both runtimes record the same `size`. */
function traceFileSize(attachment: TraceFileAttachment): number {
	return 'data' in attachment ? attachment.data.length : Math.ceil(attachment.sizeBytes / 3) * 4;
}

/**
 * The inputs of a turn's trace root. Files are recorded by type and size only,
 * and resources by reference, so the trace never holds their contents.
 */
export function buildAssistantTurnTraceInput(params: {
	message: string;
	fileAttachments: TraceFileAttachment[];
	contextAttachments: InstanceAiResourceAttachment[];
	threadArtifacts?: InstanceAiThreadArtifactsContext;
	messageGroupId?: string;
}): Record<string, unknown> {
	const { message, fileAttachments, contextAttachments, threadArtifacts, messageGroupId } = params;
	const traceInput: Record<string, unknown> = { message };
	if (fileAttachments.length) {
		traceInput.attachments = fileAttachments.map((attachment) => ({
			mimeType: attachment.mimeType,
			size: traceFileSize(attachment),
		}));
	}
	// `message` is the user's raw text, so without this the trace has no
	// record that the editor handed the agent a resource.
	if (contextAttachments.length) {
		traceInput.resourceAttachments = contextAttachments.map(traceResourceAttachment);
	}
	if (threadArtifacts?.artifacts.length) {
		traceInput.threadArtifacts = threadArtifacts;
	}
	if (messageGroupId) {
		traceInput.messageGroupId = messageGroupId;
	}
	return traceInput;
}
