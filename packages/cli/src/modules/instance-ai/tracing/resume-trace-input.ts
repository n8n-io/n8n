import { isRecord } from '@n8n/utils/is-record';

/** The card answer fields that a resume trace records with their values. */
const TRACED_ANSWER_FIELDS = ['userInput', 'action', 'resourceDecision', 'answers'] as const;

/**
 * The card answer as a resume trace root records it: the fields that the
 * answer has, and the values that the user typed or chose. Credentials, node
 * parameters and other setup values stay out of the trace.
 */
export function buildResumeTraceInput(resumeData: unknown): Record<string, unknown> {
	if (!isRecord(resumeData)) return {};
	const input: Record<string, unknown> = { resumeFields: Object.keys(resumeData) };
	if (typeof resumeData.approved === 'boolean') input.approved = resumeData.approved;
	for (const field of TRACED_ANSWER_FIELDS) {
		if (resumeData[field]) input[field] = resumeData[field];
	}
	return input;
}
