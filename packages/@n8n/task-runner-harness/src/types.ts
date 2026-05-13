/**
 * Settings sent from the harness node to the harness task runner.
 * Describes which CLI command to execute, where, and with what environment.
 */
export interface HarnessTaskSettings {
	/** CLI executable to run (e.g., 'opencode') */
	command: string;

	/** Arguments to pass to the CLI */
	args: string[];

	/** Working directory for the CLI process */
	workDir: string;

	/** Environment variables for the CLI process (curated, not inherited from parent) */
	env: Record<string, string>;

	/** Execution timeout in seconds */
	timeout: number;

	/** Maximum stdout/stderr capture size in bytes */
	maxOutputSize: number;

	/** Optional stdin input to pipe to the CLI */
	stdin?: string;
}

/**
 * Result returned from the harness task runner after CLI execution completes.
 */
export interface HarnessTaskResult {
	/** Raw stdout output from the CLI process */
	stdout: string;

	/** Raw stderr output from the CLI process */
	stderr: string;

	/** Process exit code (0 = success) */
	exitCode: number;

	/** Execution duration in milliseconds */
	duration: number;

	/** Whether stdout was truncated due to size limits */
	stdoutTruncated: boolean;

	/** Whether stderr was truncated due to size limits */
	stderrTruncated: boolean;
}

/**
 * Result of a pre-flight binary check.
 */
export interface PreflightResult {
	available: boolean;
	version?: string;
	path?: string;
	error?: string;
}
