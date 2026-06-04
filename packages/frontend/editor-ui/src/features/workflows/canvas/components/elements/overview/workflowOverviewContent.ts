// PROTOTYPE: curated, mock "auto-generated" workflow overviews, keyed by
// workflow id. The Overview panel's "Generate ▾" picks an audience and we drop
// in the matching markdown (after a fake delay). Nothing here calls a real LLM
// and nothing is written back to the workflow.

export type OverviewAudience = 'technical' | 'non-technical';

export interface OverviewContent {
	technical: string;
	'non-technical': string;
}

// The "Sales Call Intelligence" demo workflow exists as two copies (a plain one
// and the grouped one). Both share the same overview content.
const SALES_CALL_INTELLIGENCE: OverviewContent = {
	// Non-technical = the existing sticky-note content, verbatim.
	'non-technical': `**Purpose:** Turn raw sales/research call recordings into structured, searchable insights and notify the owning rep.

**Trigger:** Runs every minute to check for new call recordings.

**Inputs:** Google Drive folder "Research Recordings" — per-account subfolders containing call recordings.

**Outputs:** Structured session insights + highlight clips in Supabase, hosted video playback (Mux), a Slack DM to the rep, and a review page at review.example.com.

**Services:** Google Drive · Supabase · Mux · Deepgram · Anthropic · OpenAI · Slack · n8n Data Table.

**Data stores:**
- Supabase Postgres: \`project\`, \`session\`, \`clip\`
- Supabase pgvector: \`session_vectors\` (query \`match_session_vectors\`)
- n8n Data Table: recording dedup on \`drive_id\`
- Mux: hosted video assets (signed playback)`,

	// Technical = a level deeper: per-stage mechanics, models, schemas.
	technical: `**Purpose:** Ingest call recordings from Drive, transcribe and analyse them with an LLM agent, embed the transcript for semantic search, persist structured insights + highlight clips, then notify the owning rep in Slack.

**Trigger:** Schedule Trigger — every 1 minute (\`rule.interval[0] = { field: 'minutes', minutesInterval: 1 }\`). New recordings are de-duplicated against the n8n Data Table on \`drive_id\` so each file is processed once.

**Inputs:** Google Drive folder "Research Recordings" — per-account subfolders walked via \`List Account Folders\` → \`List Call Recordings\` → \`Download Recording\`; account context is loaded from Supabase (\`Find Account\` / \`Create Account\`).

**Outputs:** Structured session insights + highlight \`clip\` rows persisted to Supabase, transcript embeddings written to the \`session_vectors\` pgvector table, hosted video playback via Mux (signed URLs), a Slack DM to the owning rep, and a review page at \`review.example.com\`.

**Architecture:** A scheduled poller feeds a single, idempotent per-recording pipeline that fans out to storage and notification — Drive download → Mux upload → Deepgram transcription → Claude analysis → OpenAI embeddings → Supabase persistence → Slack DM. One linear branch, gated by a dedupe check so reruns are safe.

**Models & parameters:** Deepgram \`nova-3\` (diarization + smart formatting) for transcription; a Claude \`Claude Opus 4.6\` agent ("Analyze Sales Call") that emits JSON against a fixed insights schema; OpenAI \`text-embedding-3-large\` embeddings over chunked transcript text.

**Idempotency & error handling:** New recordings are de-duplicated against the n8n Data Table on \`drive_id\`, so each file is processed exactly once; the Mux upload/status HTTP steps retry with backoff before failing the run.

**Services:** Google Drive · Supabase (Postgres + pgvector) · Mux · Deepgram (\`nova-3\`) · Anthropic (Claude) · OpenAI (\`text-embedding-3-large\`) · Slack · n8n Data Table.

**Data stores:**
- Supabase Postgres: \`project\`, \`session\`, \`clip\`
- Supabase pgvector: \`session_vectors\` (similarity query \`match_session_vectors\`)
- n8n Data Table: recording dedupe keyed on \`drive_id\`
- Mux: hosted video assets with signed playback URLs`,
};

export const WORKFLOW_OVERVIEW_CONTENT: Record<string, OverviewContent> = {
	// Plain copy (sticky-note version).
	MOrmPdqXesdEYqkB: SALES_CALL_INTELLIGENCE,
	// Grouped copy.
	QcLDKGHibwOcwU0m: SALES_CALL_INTELLIGENCE,
};

/**
 * Best-effort overview for workflows we have not curated, so "Generate" still
 * produces something off-demo. Derives the trigger + a Services line from the
 * node types. No real LLM call.
 */
export function buildFallbackOverview(workflow: {
	name?: string;
	nodes: Array<{ name: string; type: string }>;
}): string {
	const triggerNode = workflow.nodes.find((node) => /trigger/i.test(node.type));
	const services = uniqueServiceLabels(workflow.nodes);

	const lines = [
		`**Purpose:** ${workflow.name ?? 'This workflow'} — overview generated from the current canvas.`,
		'',
		`**Trigger:** ${triggerNode ? triggerNode.name : 'Manual / no trigger node found'}.`,
		'',
		`**Nodes:** ${workflow.nodes.length} node${workflow.nodes.length === 1 ? '' : 's'}.`,
	];

	if (services.length) {
		lines.push('', `**Services:** ${services.join(' · ')}.`);
	}

	return lines.join('\n');
}

// Map a node type to a readable service label, dropping pure utility nodes.
const UTILITY_TYPES = new Set([
	'set',
	'if',
	'switch',
	'merge',
	'noOp',
	'code',
	'stickyNote',
	'filter',
	'splitInBatches',
	'wait',
]);

function uniqueServiceLabels(nodes: Array<{ type: string }>): string[] {
	const labels = new Set<string>();
	for (const node of nodes) {
		const segment = node.type.split('.').pop() ?? node.type;
		if (UTILITY_TYPES.has(segment) || /trigger/i.test(segment)) continue;
		labels.add(humanizeSegment(segment));
	}
	return [...labels];
}

function humanizeSegment(segment: string): string {
	const spaced = segment
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[-_]+/g, ' ')
		.trim();
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
