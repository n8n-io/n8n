import { execFile } from 'node:child_process';
import { readFile, rm, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { lookup as mimeTypeLookup } from 'mime-types';

import type { ChangedFile, Workspace } from '../types';
import {
	computeDiff,
	gitAddAll,
	gitClone,
	gitCommitBaseline,
	gitDiffNameStatus,
	gitInit,
	removeGitLockFile,
} from './git-operations';

const execFileAsync = promisify(execFile);

/**
 * Manages per-execution workspace directories for harness nodes.
 *
 * Lifecycle:
 * 1. create()              — creates the isolated workspace directory
 * 2. populateFromGit()     — clone a remote repository
 *    populateFromDirectory() — copy a local directory
 * 3. initBaseline()        — create a git baseline commit for diff tracking
 * 4. [harness CLI runs and modifies files]
 * 5. computeDiff()         — compute structured diff of all changes
 * 6. getChangedFiles()     — read changed file contents as binary data
 * 7. cleanup()             — remove the workspace directory
 */
export class WorkspaceManager {
	constructor(
		private readonly rootDir: string,
		private readonly retentionSeconds: number = 0,
	) {}

	/**
	 * Create an isolated workspace directory for this execution.
	 */
	async create(workflowId: string, executionId: string): Promise<Workspace> {
		const workspacePath = join(this.rootDir, workflowId, executionId);
		await mkdir(workspacePath, { recursive: true });

		return {
			path: workspacePath,
			workflowId,
			executionId,
		};
	}

	/**
	 * Populate the workspace by cloning a git repository.
	 * The workspace directory is replaced by the clone.
	 */
	async populateFromGit(workspace: Workspace, url: string, branch: string): Promise<void> {
		// git clone needs a non-existent target, so remove the empty dir first.
		await rm(workspace.path, { recursive: true, force: true });
		await gitClone(url, branch, workspace.path);
	}

	/**
	 * Populate the workspace by copying an existing directory.
	 * Creates a working copy so the original directory is never modified.
	 */
	async populateFromDirectory(workspace: Workspace, sourcePath: string): Promise<void> {
		const srcStat = await stat(sourcePath);
		if (!srcStat.isDirectory()) {
			throw new Error(`Source path is not a directory: ${sourcePath}`);
		}

		// Copy contents (the /. ensures we copy contents, not the directory itself).
		await execFileAsync('cp', ['-r', `${sourcePath}/.`, workspace.path], {
			timeout: 120_000,
		});
	}

	/**
	 * Initialize git tracking for diff computation.
	 *
	 * For git clones, HEAD already serves as baseline.
	 * For directory copies, creates a new git repo with a baseline commit.
	 */
	async initBaseline(workspace: Workspace): Promise<void> {
		try {
			// Check if workspace is already a git repo (from clone).
			await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], {
				cwd: workspace.path,
			});
			// Already a git repo — HEAD is the baseline.
		} catch {
			// Not a git repo — initialize one for diff tracking.
			await gitInit(workspace.path);
			await gitAddAll(workspace.path);
			await gitCommitBaseline(workspace.path);
		}
	}

	/**
	 * Commit the current state as a new baseline.
	 * Used for workspace chaining so each harness node's diff is isolated.
	 */
	async commitCurrentState(workspace: Workspace, message: string): Promise<void> {
		await removeGitLockFile(workspace.path);
		await gitAddAll(workspace.path);
		await gitCommitBaseline(workspace.path, message);
	}

	/**
	 * Compute the structured diff of all changes since the baseline.
	 */
	async computeDiff(workspace: Workspace) {
		return await computeDiff(workspace.path);
	}

	/**
	 * Read the content of all changed files for output as binary data.
	 */
	async getChangedFiles(workspace: Workspace): Promise<ChangedFile[]> {
		const nameStatus = await gitDiffNameStatus(workspace.path);
		const changedFiles: ChangedFile[] = [];

		for (const entry of nameStatus) {
			const status = entry.status.charAt(0);

			if (status === 'D') {
				changedFiles.push({
					path: entry.path,
					status: 'deleted',
					content: null,
					mimeType: 'application/octet-stream',
				});
				continue;
			}

			const filePath = join(workspace.path, entry.path);

			// Guard against path traversal.
			if (!filePath.startsWith(workspace.path)) continue;

			try {
				const content = await readFile(filePath);
				const mimeType = mimeTypeLookup(entry.path) || 'application/octet-stream';

				changedFiles.push({
					path: entry.path,
					status: status === 'A' ? 'added' : 'modified',
					content,
					mimeType,
				});
			} catch {
				// File may have been removed between diff and read — skip it.
			}
		}

		return changedFiles;
	}

	/**
	 * Clean up the workspace directory.
	 * Respects the configured retention period.
	 */
	async cleanup(workspace: Workspace): Promise<void> {
		if (this.retentionSeconds > 0) {
			// Schedule cleanup after retention period.
			setTimeout(async () => {
				try {
					await rm(workspace.path, { recursive: true, force: true });
				} catch {
					// Best-effort cleanup.
				}
			}, this.retentionSeconds * 1_000).unref();
		} else {
			await rm(workspace.path, { recursive: true, force: true });
		}
	}
}
