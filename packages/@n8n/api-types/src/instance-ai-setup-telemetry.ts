import { z } from 'zod';

/** Identify requirements independently of UI grouping and editable node names. */
export function instanceAiSetupRequirementId(
	workflowId: string,
	nodeId: string,
	kind: 'credential' | 'parameter',
	name: string,
): string {
	return [workflowId, nodeId, kind, name].map(encodeURIComponent).join(':');
}

export const instanceAiSetupTestRequestSchema = z.object({
	test_request_id: z.string().uuid(),
	thread_id: z.string().uuid(),
	session_id: z.string().max(128),
});
export type InstanceAiSetupTestRequest = z.infer<typeof instanceAiSetupTestRequestSchema>;
