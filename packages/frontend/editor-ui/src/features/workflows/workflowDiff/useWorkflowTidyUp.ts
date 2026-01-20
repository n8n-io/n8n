export type TidyUpOption = 'always' | 'if-missing';

/**
 * Workflow structure for tidy-up checks.
 * Uses a minimal type since workflows from external sources (postMessage)
 * may have nodes without positions.
 */
export interface WorkflowForTidyUp {
	nodes: Array<{ position?: [number, number] }>;
}

export function shouldTidyUp(
	workflow: WorkflowForTidyUp,
	option: TidyUpOption | undefined,
): boolean {
	if (option === 'always') {
		return true;
	}

	if (option === 'if-missing') {
		return workflow.nodes.every((node) => node.position === undefined);
	}

	return false;
}
