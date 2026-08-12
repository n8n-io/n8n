/**
 * Consolidated logs tool — search, context, snapshot.
 *
 * Backed by the operator console's log surface through `InstanceAiLogQueryPort`
 * (see `./log-query.port.ts` for the security contract at that boundary).
 *
 * The agent PULLS. Logs are never streamed into its context: that burns tokens
 * without bound and a continuously mutating context block invalidates the
 * prompt cache prefix on every turn. The highest-leverage action is `snapshot`,
 * which materializes a bounded JSONL file into the sandbox so the agent can use
 * `rg` and `jq` — tools it already has — instead of a bespoke query DSL.
 */
import { Tool } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import {
	OPERATOR_LOG_LEVELS,
	type OperatorLogFilter,
	type OperatorLogRecord,
	type OperatorLogRole,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { assertRedactedLogPage, type InstanceAiLogQueryPort } from './log-query.port';
import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import { writeWorkspaceFile } from '../workspace/workspace-files';

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_SEARCH_LIMIT = 50;
const MAX_SEARCH_LIMIT = 200;

const DEFAULT_CONTEXT_LINES = 50;
const MAX_CONTEXT_LINES = 500;

/** Mirrors `N8N_OPERATOR_CONSOLE_AI_SNAPSHOT_MAX_LINES`. The host can lower it
 *  via `InstanceAiLogQueryPort.maxSnapshotLines`; it can never raise it. */
const DEFAULT_SNAPSHOT_MAX_LINES = 5000;

/** Sandbox directory, relative to the workspace root. */
const SNAPSHOT_DIR = 'logs';

const OPERATOR_LOG_ROLES = [
	'main',
	'worker',
	'webhook',
] as const satisfies readonly OperatorLogRole[];

// ── Shared filter fields ───────────────────────────────────────────────────

const executionIdField = z
	.string()
	.optional()
	.describe('Only lines emitted while this execution was running, on any host');
const hostIdsField = z
	.array(z.string())
	.optional()
	.describe("Restrict to these host IDs (from a previous result's `hostId`). Omit for all hosts");
const rolesField = z
	.array(z.enum(OPERATOR_LOG_ROLES))
	.optional()
	.describe('Restrict to these instance roles. Omit for all roles');
const minLevelField = z
	.enum(OPERATOR_LOG_LEVELS)
	.optional()
	.describe(
		'Minimum severity to include, from least to most verbose: error, warn, info, debug. ' +
			'"warn" returns warn and error lines. Omit for everything captured',
	);

// ── Action schemas ─────────────────────────────────────────────────────────

const searchAction = z.object({
	action: z
		.literal('search')
		.describe(
			'Substring lookup across captured log lines. Use ONLY when you already know the exact ' +
				'string to look for (an error code, a URL, a node name). For anything open-ended, ' +
				'use action="snapshot" and grep the file instead',
		),
	query: z
		.string()
		.min(1)
		.describe('Plain substring, case-insensitive. NOT a regex — regex syntax is matched literally'),
	executionId: executionIdField,
	hostIds: hostIdsField,
	roles: rolesField,
	minLevel: minLevelField,
	cursor: z
		.string()
		.optional()
		.describe(
			"Opaque cursor from a previous search's `nextCursor`, to continue paging. " +
				'Not a timestamp — never construct one',
		),
	limit: z
		.number()
		.int()
		.positive()
		.max(MAX_SEARCH_LIMIT)
		.optional()
		.describe(`Max records to return (default ${DEFAULT_SEARCH_LIMIT}, max ${MAX_SEARCH_LIMIT})`),
});

const contextAction = z.object({
	action: z
		.literal('context')
		.describe(
			'The lines surrounding one hit, on the host that produced it. Call this after ' +
				'`search` (or after grepping a snapshot) on any line you intend to cite: a match on ' +
				'its own rarely shows the cause — the stack trace, the request that preceded it and ' +
				'the retry that followed are in the neighbouring lines',
		),
	hostId: z.string().describe('`hostId` of the hit'),
	ts: z
		.string()
		.describe(
			'`ts` of the hit, copied verbatim from the record. Not `seq`: that counts lines ' +
				'within one storage tier and means nothing across them.',
		),
	before: z
		.number()
		.int()
		.min(0)
		.max(MAX_CONTEXT_LINES)
		.optional()
		.describe(`Lines before the hit (default ${DEFAULT_CONTEXT_LINES}, max ${MAX_CONTEXT_LINES})`),
	after: z
		.number()
		.int()
		.min(0)
		.max(MAX_CONTEXT_LINES)
		.optional()
		.describe(`Lines after the hit (default ${DEFAULT_CONTEXT_LINES}, max ${MAX_CONTEXT_LINES})`),
});

const snapshotFilterSchema = z.object({
	executionId: executionIdField,
	hostIds: hostIdsField,
	roles: rolesField,
	minLevel: minLevelField,
	grep: z
		.string()
		.optional()
		.describe(
			'Optional plain substring pre-filter, case-insensitive. Usually leave this out — ' +
				'take the whole window and narrow it with `rg` in the sandbox, so one snapshot ' +
				'answers several questions',
		),
});

const snapshotAction = z.object({
	action: z
		.literal('snapshot')
		.describe(
			'Write the matching log window to a JSONL file in the sandbox and return its path. ' +
				'THE PREFERRED ACTION. Then use your normal shell tools on it — ' +
				"`rg -n 'ECONNREFUSED|ETIMEDOUT' <path> | head -50`, or " +
				'`jq -r \'select(.level=="error") | "\\(.ts) \\(.hostId) \\(.message)"\' <path>` — ' +
				"which is far more expressive than this tool's own filters and costs no extra context",
		),
	filter: snapshotFilterSchema
		.optional()
		.describe('Narrows what gets written. Omit for everything in the retention window'),
	maxLines: z
		.number()
		.int()
		.positive()
		.max(DEFAULT_SNAPSHOT_MAX_LINES)
		.optional()
		.describe(
			`Cap on lines written (default and max ${DEFAULT_SNAPSHOT_MAX_LINES}). ` +
				'The newest lines are kept; `truncated: true` means older ones were dropped',
		),
});

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [searchAction, contextAction, snapshotAction]),
);

type Input = z.infer<typeof inputSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────

type FilterFields = {
	executionId?: string;
	hostIds?: string[];
	roles?: OperatorLogRole[];
	minLevel?: OperatorLogFilter['minLevel'];
	grep?: string;
};

function toOperatorLogFilter(fields: FilterFields): OperatorLogFilter {
	return {
		executionId: fields.executionId,
		hostIds: fields.hostIds,
		roles: fields.roles,
		minLevel: fields.minLevel,
		grep: fields.grep,
	};
}

function toJsonl(records: OperatorLogRecord[]): string {
	if (records.length === 0) return '';
	return `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

// ── Handlers ───────────────────────────────────────────────────────────────

async function handleSearch(
	port: InstanceAiLogQueryPort,
	input: Extract<Input, { action: 'search' }>,
	abortSignal?: AbortSignal,
) {
	const limit = input.limit ?? DEFAULT_SEARCH_LIMIT;
	const page = await port.read({
		filter: toOperatorLogFilter({ ...input, grep: input.query }),
		limit,
		cursor: input.cursor,
		abortSignal,
	});
	assertRedactedLogPage(page, 'search');

	const missingHostIds = page.missingHostIds ?? [];

	return {
		records: page.records,
		count: page.records.length,
		nextCursor: page.nextCursor,
		// Honest about a partial window rather than implying continuity.
		gap: page.gap,
		// Absent hosts are not "no matches" — say so, or the agent will conclude
		// the error did not happen when in fact nobody looked on that host.
		...(missingHostIds.length > 0
			? {
					missingHostIds,
					warning:
						`${missingHostIds.length} host(s) did not answer in time, so their logs are ` +
						'not represented. Do not conclude that nothing matched on them.',
				}
			: {}),
		hint:
			page.records.length >= limit
				? 'Result hit the limit, so there may be more matches. Prefer action="snapshot" and grep the file instead of paging.'
				: undefined,
	};
}

async function handleContext(
	port: InstanceAiLogQueryPort,
	input: Extract<Input, { action: 'context' }>,
	abortSignal?: AbortSignal,
) {
	const page = await port.readContext({
		hostId: input.hostId,
		ts: input.ts,
		before: input.before ?? DEFAULT_CONTEXT_LINES,
		after: input.after ?? DEFAULT_CONTEXT_LINES,
		abortSignal,
	});
	assertRedactedLogPage(page, 'context');

	return {
		hostId: input.hostId,
		ts: input.ts,
		records: page.records,
		count: page.records.length,
		gap: page.gap,
	};
}

async function handleSnapshot(
	context: InstanceAiContext,
	port: InstanceAiLogQueryPort,
	input: Extract<Input, { action: 'snapshot' }>,
	abortSignal?: AbortSignal,
) {
	const workspace = context.workspace;
	if (!workspace) {
		return {
			path: '',
			lineCount: 0,
			truncated: false,
			error:
				'No sandbox workspace is available in this session, so a snapshot file cannot be written. ' +
				'Use action="search" with a specific substring instead.',
		};
	}

	// The host's cap wins; the model's `maxLines` can only lower it.
	const ceiling = Math.min(
		port.maxSnapshotLines ?? DEFAULT_SNAPSHOT_MAX_LINES,
		DEFAULT_SNAPSHOT_MAX_LINES,
	);
	const maxLines = Math.max(1, Math.min(input.maxLines ?? ceiling, ceiling));

	// One over the cap tells us whether anything was left behind, without a second read.
	const page = await port.read({
		filter: toOperatorLogFilter(input.filter ?? {}),
		limit: maxLines + 1,
		abortSignal,
	});
	assertRedactedLogPage(page, 'snapshot');

	const truncated = page.records.length > maxLines;
	const records = truncated ? page.records.slice(-maxLines) : page.records;

	const relativePath = `${SNAPSHOT_DIR}/snapshot-${nanoid(8)}.jsonl`;
	let path: string;
	try {
		const root = await getWorkspaceRoot(workspace);
		path = `${root}/${relativePath}`;
		await writeWorkspaceFile(workspace, path, toJsonl(records), {
			logger: context.logger,
			resourceLabel: 'Log snapshot file',
			abortSignal,
		});
	} catch (error) {
		return {
			path: '',
			lineCount: 0,
			truncated: false,
			error: `Failed to write the log snapshot into the sandbox: ${errorMessage(error)}`,
		};
	}

	return {
		path,
		lineCount: records.length,
		truncated,
		gap: page.gap,
		hint:
			records.length === 0
				? 'No log lines matched. Widen the filter, or check that the execution actually ran on a host with capture enabled.'
				: `One JSON record per line. Grep it: rg -n '<pattern>' ${path} | head -50. Cite the exact line, including its hostId, and use action="context" for the lines around it.`,
	};
}

// ── Tool factory ───────────────────────────────────────────────────────────

export function createLogsTool(context: InstanceAiContext) {
	const port = context.logQueryService;

	if (!port) {
		return (
			new Tool('logs')
				.description('Instance log search is not available in this environment.')
				.input(z.object({ action: z.string() }))
				// eslint-disable-next-line @typescript-eslint/require-await -- must be async to match execute signature
				.handler(async () => {
					return {
						error:
							'Instance log search is not enabled on this instance (the operator-console module is off).',
					};
				})
				.build()
		);
	}

	return new Tool('logs')
		.description(
			"Search this n8n instance's own runtime logs — every host (main, worker, webhook), " +
				'cross-linked to executions. Use it to explain WHY something failed when the ' +
				'execution record alone does not say (crashes, timeouts, connection errors, ' +
				'third-party output, OOM kills).\n' +
				'\n' +
				'How to use it:\n' +
				'- Open-ended question ("why did execution 1234 fail?") → action="snapshot" with ' +
				'{ filter: { executionId } }, then `rg`/`jq` the returned file in the sandbox. ' +
				'One snapshot answers many follow-ups and keeps the log content out of your context.\n' +
				'- Narrow, known string ("does anything mention ECONNREFUSED?") → action="search".\n' +
				'- Any line you plan to cite → action="context" first. A match without its ' +
				'neighbours is nearly useless: the cause is almost always in the lines around it.\n' +
				'\n' +
				'Typical flow: executions(action="get") → logs(action="snapshot", filter.executionId) → ' +
				'grep the file → logs(action="context") on the hit → quote the exact line and name ' +
				'the host that produced it.\n' +
				'\n' +
				'Logs are partially ordered across hosts: each record carries (hostId, seq, ts), and ' +
				'`seq` is monotonic per host only. Retention is a bounded window, so old lines may ' +
				'be gone — `gap: true` says so explicitly. Records are redacted before they reach you.',
		)
		.input(inputSchema)
		.handler(async (input: Input, ctx) => {
			switch (input.action) {
				case 'search':
					return await handleSearch(port, input, ctx.abortSignal);
				case 'context':
					return await handleContext(port, input, ctx.abortSignal);
				case 'snapshot':
					return await handleSnapshot(context, port, input, ctx.abortSignal);
			}
		})
		.build();
}
