// ---------------------------------------------------------------------------
// Export a real conversation into a seeded test-case skeleton.
//
// Given a thread id on an instance we control, pulls the thread's native
// message log (GET /instance-ai/eval/export-thread) plus every workflow the
// conversation touched, and writes:
//
//   evaluations/data/workflows/seeds/<name>.seed.json   — the restorable seed
//   evaluations/data/workflows/<name>.json              — case skeleton to fill
//
// The history is split at the LAST user message: everything before it becomes
// the seed, the last user message becomes `conversation[0]` (driven live by
// the eval), and the original assistant response after it is dropped — that's
// the turn the eval re-drives and judges. A seeded case is only worth shipping
// once `buildExpectations` detect the misbehaviour recurring; the skeleton
// leaves TODOs where the author must fill them in.
//
//   N8N_BASE_URL=http://localhost:5678 pnpm eval:export-thread <threadId> --name my-case
//
// Flags:
//   --name <slug>      case + seed filename (default: seeded-<thread prefix>)
//   --workflow <id>    include an extra workflow (repeatable; auto-detection
//                      covers build/patch/submit tool calls)
//   --base-url <url>   overrides N8N_BASE_URL
//
// Review the seed before committing: it contains the conversation verbatim.
// ---------------------------------------------------------------------------

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { N8nClient } from './clients/n8n-client';

const WORKFLOW_TOOLS = new Set(['build-workflow', 'patch-workflow', 'submit-workflow']);
const CASES_DIR = path.join(__dirname, 'data', 'workflows');

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseArgs(argv: string[]): {
	threadId: string;
	name?: string;
	baseUrl: string;
	extraWorkflowIds: string[];
} {
	const positional: string[] = [];
	const extraWorkflowIds: string[] = [];
	let name: string | undefined;
	let baseUrl = process.env.N8N_BASE_URL ?? 'http://localhost:5678';

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--name') name = argv[++i];
		else if (arg === '--workflow') extraWorkflowIds.push(argv[++i]);
		else if (arg === '--base-url') baseUrl = argv[++i];
		else positional.push(arg);
	}

	const threadId = positional[0];
	if (!threadId) {
		throw new Error(
			'Usage: pnpm eval:export-thread <threadId> [--name <slug>] [--workflow <id>] [--base-url <url>]',
		);
	}
	return { threadId, name, baseUrl, extraWorkflowIds };
}

/** Workflow ids referenced by build/patch/submit tool calls in the message log. */
function extractWorkflowIds(messages: Array<Record<string, unknown>>): string[] {
	const ids = new Set<string>();
	for (const message of messages) {
		if (!Array.isArray(message.content)) continue;
		for (const block of message.content) {
			if (!isRecord(block) || block.type !== 'tool-call') continue;
			if (typeof block.toolName !== 'string' || !WORKFLOW_TOOLS.has(block.toolName)) continue;
			for (const side of [block.input, block.output]) {
				if (isRecord(side) && typeof side.workflowId === 'string' && side.workflowId.length > 0) {
					ids.add(side.workflowId);
				}
			}
		}
	}
	return [...ids];
}

function userText(message: Record<string, unknown>): string | undefined {
	if (message.role !== 'user' || !Array.isArray(message.content)) return undefined;
	const text = message.content
		.flatMap((block) =>
			isRecord(block) && block.type === 'text' && typeof block.text === 'string'
				? [block.text]
				: [],
		)
		.join('\n');
	return text.length > 0 ? text : undefined;
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const name = args.name ?? `seeded-${args.threadId.slice(0, 8)}`;

	const client = new N8nClient(args.baseUrl);
	console.log(`Logging in to ${args.baseUrl}`);
	await client.login();

	const exported = await client.exportThread(args.threadId);
	if (exported.messages.length === 0) throw new Error(`Thread ${args.threadId} has no messages`);

	// Split at the last user message: it becomes the live turn, everything
	// before it the seed. The original response to it is dropped on purpose.
	let lastUserIndex = -1;
	for (let i = exported.messages.length - 1; i >= 0; i--) {
		if (userText(exported.messages[i]) !== undefined) {
			lastUserIndex = i;
			break;
		}
	}
	if (lastUserIndex <= 0) {
		throw new Error(
			lastUserIndex === 0
				? `Thread ${args.threadId} has only one user message — nothing to seed; use a plain conversation case instead`
				: `Thread ${args.threadId} has no user message to drive live`,
		);
	}
	const seedMessages = exported.messages.slice(0, lastUserIndex);
	const liveMessage = userText(exported.messages[lastUserIndex])!;
	const dropped = exported.messages.length - lastUserIndex - 1;

	// Fetch every workflow the seeded history references (plus explicit extras).
	const workflowIds = [...new Set([...extractWorkflowIds(seedMessages), ...args.extraWorkflowIds])];
	const workflows: Array<{ id: string; name: string; nodes: unknown[]; connections: unknown }> = [];
	for (const id of workflowIds) {
		try {
			const wf = await client.getWorkflow(id);
			workflows.push({ id: wf.id, name: wf.name, nodes: wf.nodes, connections: wf.connections });
		} catch {
			console.warn(`  ! workflow ${id} is referenced by the history but not fetchable — skipped`);
		}
	}

	const seedsDir = path.join(CASES_DIR, 'seeds');
	mkdirSync(seedsDir, { recursive: true });
	const seedPath = path.join(seedsDir, `${name}.seed.json`);
	const casePath = path.join(CASES_DIR, `${name}.json`);
	if (existsSync(casePath)) throw new Error(`${casePath} already exists — pick another --name`);

	const seed = {
		source: {
			kind: 'thread-export',
			threadId: args.threadId,
			baseUrl: args.baseUrl,
			exportedAt: new Date().toISOString(),
		},
		messages: seedMessages,
		workflows,
	};

	const caseSkeleton = {
		description:
			'TODO: what misbehaviour does this case replicate, and what should happen instead?',
		conversation: [{ role: 'user', text: liveMessage }],
		complexity: 'medium',
		tags: ['behaviour', 'seeded'],
		datasets: ['behaviour', 'full'],
		seedFile: `seeds/${name}.seed.json`,
		buildExpectations: [
			'TODO: assertions that DETECT THE MISBEHAVIOUR RECURRING — a seeded case without them passes vacuously',
		],
		executionScenarios: [
			{
				name: 'TODO',
				description: 'TODO: what state the workflow is in after the live turn',
				dataSetup: 'TODO',
				successCriteria: 'TODO: judge only the workflow, not the conversation',
			},
		],
	};

	writeFileSync(seedPath, JSON.stringify(seed, null, '\t') + '\n');
	writeFileSync(casePath, JSON.stringify(caseSkeleton, null, '\t') + '\n');

	const userTurns = seedMessages.filter((m) => userText(m) !== undefined).length;
	console.log(
		[
			`Wrote ${seedPath}`,
			`  seed: ${seedMessages.length} messages (${userTurns} user turns), ${workflows.length} workflow(s): ${workflows.map((w) => `"${w.name}"`).join(', ') || '(none)'}`,
			`  live turn: "${liveMessage.slice(0, 100)}${liveMessage.length > 100 ? '…' : ''}"`,
			`  dropped ${dropped} trailing message(s) after the live turn (the eval re-drives that response)`,
			`Wrote ${casePath}`,
			'',
			'Next steps:',
			'  1. Trim the seed if the early history is irrelevant (keep message order intact).',
			'  2. Fill the TODOs — buildExpectations must catch the misbehaviour if it recurs.',
			'  3. Review the seed for anything you would not commit (it is the conversation verbatim).',
			`  4. Run it: pnpm eval --filter ${name}`,
		].join('\n'),
	);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
