import type { IDataObject } from 'n8n-workflow';

// ---------------------------------------------------------------------------
// CLI Execution
// ---------------------------------------------------------------------------

/** Settings for spawning a CLI process. */
export interface CliExecutionSettings {
	/** CLI executable to run (e.g. 'opencode'). */
	command: string;

	/** Arguments to pass to the CLI. */
	args: string[];

	/** Working directory for the CLI process. */
	workDir: string;

	/** Environment variables — curated, NOT inherited from the parent process. */
	env: Record<string, string>;

	/** Execution timeout in seconds. */
	timeout: number;

	/** Maximum stdout/stderr capture size in bytes (default 10 MB). */
	maxOutputSize: number;
}

/** Result returned after CLI execution completes. */
export interface CliExecutionResult {
	/** Raw stdout output. */
	stdout: string;

	/** Raw stderr output. */
	stderr: string;

	/** Process exit code (0 = success). */
	exitCode: number;

	/** Execution duration in milliseconds. */
	duration: number;

	/** Whether stdout was truncated due to size limits. */
	stdoutTruncated: boolean;

	/** Whether stderr was truncated due to size limits. */
	stderrTruncated: boolean;
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

/** Handle to an execution workspace directory. */
export interface Workspace {
	/** Absolute path to the workspace directory. */
	path: string;

	/** Workflow ID this workspace belongs to. */
	workflowId: string;

	/** Execution ID this workspace belongs to. */
	executionId: string;
}

// ---------------------------------------------------------------------------
// Git diff
// ---------------------------------------------------------------------------

/** Structured diff output from a harness execution. */
export interface HarnessDiff {
	/** Full unified diff string (git diff HEAD). */
	unified: string;

	/** Aggregate statistics. */
	stats: {
		additions: number;
		deletions: number;
		filesChanged: number;
	};

	/** Per-file diff details. */
	files: HarnessDiffFile[];
}

export interface HarnessDiffFile {
	/** Relative file path (for renames, the new path). */
	path: string;

	/** Change type. */
	status: 'added' | 'modified' | 'deleted';

	/** Number of added lines. */
	additions: number;

	/** Number of deleted lines. */
	deletions: number;

	/** Per-file unified diff patch. */
	patch: string;
}

/** A file that changed during harness execution, with its content. */
export interface ChangedFile {
	/** Relative file path. */
	path: string;

	/** Change type. */
	status: 'added' | 'modified' | 'deleted';

	/** File content (null for deleted files). */
	content: Buffer | null;

	/** MIME type. */
	mimeType: string;
}

// ---------------------------------------------------------------------------
// Harness output
// ---------------------------------------------------------------------------

/** Parsed structured event from a harness CLI's stdout. */
export interface HarnessEvent {
	type: string;
	[key: string]: unknown;
}

/** Shape of the JSON in the Summary output item. */
export interface HarnessSummaryOutput extends IDataObject {
	success: boolean;
	exitCode: number;
	duration: number;
	diff: {
		stats: { filesChanged: number; additions: number; deletions: number };
		files: Array<{
			path: string;
			status: string;
			additions: number;
			deletions: number;
			patch: string;
		}>;
		unified: string;
	};
	events: HarnessEvent[];
	workspacePath: string | null;
	stdout: string;
	stderr: string;
}

/** Result of a pre-flight binary check. */
export interface PreflightResult {
	available: boolean;
	version?: string;
	path?: string;
	error?: string;
}
