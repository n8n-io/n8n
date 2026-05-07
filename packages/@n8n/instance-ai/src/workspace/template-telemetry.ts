/**
 * Template usage telemetry for the builder agent.
 *
 * Pattern-detects template-related shell commands (grep on `examples/index.txt`,
 * cat/head/sed on `examples/*.ts`) and emits three event types via the existing
 * `context.trackTelemetry?.(name, props)` channel:
 *
 *   - `Builder template search` — fired per index grep, with the search query
 *   - `Builder template read`   — fired per template file read, with the filename
 *   - `Builder template session`— fired once per builder run on flush(), with rollups
 *
 * Sessions are attached to a workspace via `attachTemplateTelemetrySession`
 * (a per-Workspace WeakMap binding). `runInSandbox` looks the session up and
 * calls `observe()` after each command — no caller-side threading required.
 */
import type { Workspace } from '@mastra/core/workspace';

import type { OrchestrationContext } from '../types';

const MAX_QUERY_LENGTH = 200;
const MAX_USER_REQUEST_LENGTH = 120;

const SEARCH_PATTERN = /\bgrep\b[^|]*\bexamples\/index\.txt\b/;
const READ_COMMAND_HEADS = ['cat', 'head', 'tail', 'sed', 'less', 'more'];
// Match `examples/<slug>.ts` anywhere in the path. `\b` boundaries reject
// `someotherexamples/...` while accepting `/abs/path/examples/foo.ts`.
const READ_FILE_PATTERN = /\bexamples\/([a-zA-Z0-9._-]+\.ts)\b/;

export interface TemplateTelemetrySession {
	/** Inspect a command + its stdout; emits search/read events when patterns match. */
	observe(command: string, stdout: string): void;
	/** Emit the session rollup event and clear state. Idempotent. */
	flush(): void;
	/** Return true when the session has not been flushed yet. */
	isOpen(): boolean;
}

export interface TelemetrySessionOptions {
	context: OrchestrationContext;
	threadId?: string;
	runId: string;
	workItemId: string;
	/** Optional NL request from the user; truncated to 120 chars. */
	userRequestExcerpt?: string;
}

export function createTemplateTelemetrySession(
	opts: TelemetrySessionOptions,
): TemplateTelemetrySession {
	const baseProps = {
		thread_id: opts.threadId,
		run_id: opts.runId,
		work_item_id: opts.workItemId,
	};

	let searchCount = 0;
	let readCount = 0;
	const templatesRead: string[] = [];
	let open = true;

	function emit(name: string, extra: Record<string, unknown>) {
		opts.context.trackTelemetry?.(name, { ...baseProps, ...extra });
	}

	function observe(command: string, stdout: string): void {
		if (!open) return;

		// Search detection: any grep at examples/index.txt
		if (SEARCH_PATTERN.test(command)) {
			searchCount++;
			emit('Builder template search', {
				query: extractGrepQuery(command),
				result_count: countResultLines(stdout),
			});
		}

		// Read detection: cat/head/sed/etc. against examples/*.ts
		const head = command.trim().split(/\s+/, 1)[0]?.split('/').pop() ?? '';
		if (READ_COMMAND_HEADS.includes(head)) {
			const match = command.match(READ_FILE_PATTERN);
			if (match) {
				const filename = match[1];
				readCount++;
				templatesRead.push(filename);
				emit('Builder template read', {
					template_filename: filename,
					bytes_read: stdout.length,
				});
			}
		}
	}

	function flush(): void {
		if (!open) return;
		open = false;
		emit('Builder template session', {
			search_count: searchCount,
			read_count: readCount,
			templates_read: templatesRead,
			unique_templates_read: Array.from(new Set(templatesRead)).length,
			user_request_excerpt: opts.userRequestExcerpt
				? truncate(opts.userRequestExcerpt, MAX_USER_REQUEST_LENGTH)
				: null,
		});
	}

	return {
		observe,
		flush,
		isOpen: () => open,
	};
}

/** Pull the user's grep query out of the command string. Best-effort; capped. */
export function extractGrepQuery(command: string): string {
	// Match: grep [-flags] "pattern" path  OR  grep [-flags] 'pattern' path  OR  grep -i pattern path
	// First try quoted forms, then a bare token
	const quoted = command.match(/grep\b[^"']*["']([^"']*)["']/);
	if (quoted) return truncate(quoted[1], MAX_QUERY_LENGTH);
	const bare = command.match(/grep\b\s+(?:-[a-zA-Z]+\s+)*([^\s|]+)/);
	if (bare) return truncate(bare[1], MAX_QUERY_LENGTH);
	return '';
}

function countResultLines(stdout: string): number {
	if (!stdout) return 0;
	const trimmed = stdout.replace(/\n+$/, '');
	if (trimmed.length === 0) return 0;
	return trimmed.split('\n').length;
}

function truncate(s: string, max: number): string {
	if (s.length <= max) return s;
	return s.slice(0, max);
}

// ---------------------------------------------------------------------------
// Workspace binding
// ---------------------------------------------------------------------------

const SESSIONS = new WeakMap<Workspace, TemplateTelemetrySession>();

/** Bind a session to a workspace so `runInSandbox` can pick it up automatically. */
export function attachTemplateTelemetrySession(
	workspace: Workspace,
	session: TemplateTelemetrySession,
): void {
	SESSIONS.set(workspace, session);
}

/** Remove the session binding. Safe to call multiple times. */
export function detachTemplateTelemetrySession(workspace: Workspace): void {
	SESSIONS.delete(workspace);
}

/** Internal: look up the session bound to a workspace, if any. */
export function getTemplateTelemetrySession(
	workspace: Workspace,
): TemplateTelemetrySession | undefined {
	return SESSIONS.get(workspace);
}
