/**
 * Structured diff output from a harness execution.
 */
export interface HarnessDiff {
	/** Raw unified diff string (git diff HEAD) */
	unified: string;

	/** Aggregate statistics */
	stats: {
		additions: number;
		deletions: number;
		filesChanged: number;
	};

	/** Per-file diff details */
	files: HarnessDiffFile[];
}

export interface HarnessDiffFile {
	/** Relative file path */
	path: string;

	/** Change type */
	status: 'added' | 'modified' | 'deleted' | 'renamed';

	/** Number of added lines */
	additions: number;

	/** Number of deleted lines */
	deletions: number;

	/** Per-file unified diff patch (for collapsed-expand UI) */
	patch: string;
}

/**
 * A file that changed during harness execution, with its content.
 */
export interface ChangedFile {
	/** Relative file path */
	path: string;

	/** Change type */
	status: 'added' | 'modified' | 'deleted';

	/** File content (null for deleted files) */
	content: Buffer | null;

	/** MIME type */
	mimeType: string;
}

/**
 * Handle to an execution workspace directory.
 */
export interface Workspace {
	/** Absolute path to the workspace directory */
	path: string;

	/** Workflow ID this workspace belongs to */
	workflowId: string;

	/** Execution ID this workspace belongs to */
	executionId: string;
}

/**
 * Parsed event from OpenCode's --format json output.
 */
export interface OpenCodeEvent {
	type: 'text' | 'tool_use' | 'step_start' | 'step_finish' | 'reasoning' | 'error';
	timestamp: number;
	sessionID: string;
	[key: string]: unknown;
}

/**
 * Full JSON output shape for the Summary output of a harness node.
 */
export interface HarnessOutputJson {
	success: boolean;
	exitCode: number;
	duration: number;
	stdout: string;
	stderr: string;
	diff: HarnessDiff;
	events: OpenCodeEvent[];
	workspacePath?: string;
}
