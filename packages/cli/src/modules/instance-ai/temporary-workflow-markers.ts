/**
 * The workflows that the Assistant created in one thread and has not promoted
 * to a deliverable yet. A run archives the ones that are still marked when it
 * ends, so failed attempts and scratch workflows do not stay in the list.
 */
export interface TemporaryWorkflowMarkers {
	mark(workflowId: string): Promise<void>;
	unmark(workflowId: string): Promise<void>;
	has(workflowId: string): Promise<boolean>;
	list(): Promise<string[]>;
}
