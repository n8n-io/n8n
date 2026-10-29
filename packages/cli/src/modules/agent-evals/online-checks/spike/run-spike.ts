/**
 * Spike: generate checks from real agent definitions and judge their test chats.
 *
 *   ANTHROPIC_API_KEY=… tsx run-spike.ts <data-dir> <out-dir> [--model claude-sonnet-5-5] [--limit N]
 *
 * <data-dir> holds one JSON file per Assistant thread (exported from LangTracer):
 * the agent config snapshots and the `call_agent` test chats. The output is
 * `results.json` and `review.md`, both for a human to read. Nothing is saved
 * anywhere else, and no data is sent anywhere but the model API.
 */
import type { AgentJsonConfig } from '@n8n/api-types';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
	batchChecks,
	buildJudgePrompt,
	parseJudgeAnswers,
	type JudgedAgent,
} from '../judged-checks';
import {
	BASE_CHECK,
	buildPromiseCheckPrompt,
	parsePromiseChecks,
	type SkillText,
} from '../promise-checks';
import { generateToolChecks, runToolChecks } from '../tool-checks';
import { profileAgentTools, summarizeStakes } from '../tool-profile';
import type { AgentCheck, ChatTurn, CheckVerdict } from '../types';
import { parseSessionTranscript } from './session-transcript';

interface ExportedTestChat {
	turnIndex: number;
	configHash: string | null;
	message: string;
	response: string;
	status?: string;
	sessionId?: string;
}

interface ExportedThread {
	threadId: string;
	language?: string;
	finalConfig: AgentJsonConfig;
	finalSkills?: unknown;
	finalConfigHash: string;
	configsByHash?: Record<string, { config: AgentJsonConfig; skills?: unknown }>;
	testChats: ExportedTestChat[];
	sessionReads?: Array<{ turnIndex: number; input?: { threadId?: unknown }; output: unknown }>;
}

interface Usage {
	inputTokens: number;
	outputTokens: number;
	calls: number;
}

const args = process.argv.slice(2);
const [dataDir, outDir] = args;
const model = valueOf('--model') ?? 'claude-sonnet-5-5';
const limit = Number(valueOf('--limit') ?? Number.POSITIVE_INFINITY);

function valueOf(flag: string): string | undefined {
	const index = args.indexOf(flag);
	return index === -1 ? undefined : args[index + 1];
}

const usage = { generate: newUsage(), judge: newUsage() };
const unreadable: Array<{ agent: string; attempt: number; checks: string[]; text: string }> = [];

function newUsage(): Usage {
	return { inputTokens: 0, outputTokens: 0, calls: 0 };
}

async function ask(system: string, user: string, bucket: Usage): Promise<string> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) throw new Error('Set ANTHROPIC_API_KEY');
	for (let attempt = 1; ; attempt++) {
		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
			},
			body: JSON.stringify({
				model,
				max_tokens: 2_000,
				system,
				messages: [{ role: 'user', content: user }],
			}),
		});
		if (response.ok) {
			const body = (await response.json()) as {
				content: Array<{ type: string; text?: string }>;
				usage: { input_tokens: number; output_tokens: number };
			};
			bucket.calls++;
			bucket.inputTokens += body.usage.input_tokens;
			bucket.outputTokens += body.usage.output_tokens;
			return body.content.map((part) => part.text ?? '').join('');
		}
		if ((response.status === 429 || response.status >= 500) && attempt < 4) {
			await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt));
			continue;
		}
		throw new Error(`Model call failed: ${response.status} ${await response.text()}`);
	}
}

/** Skills arrive as an array or a record of skill bodies, depending on the snapshot. */
function readSkills(raw: unknown): SkillText[] {
	const list = Array.isArray(raw) ? raw : typeof raw === 'object' && raw ? Object.values(raw) : [];
	return list.flatMap((item) => {
		if (typeof item !== 'object' || item === null) return [];
		const record = item as Record<string, unknown>;
		const body = (
			typeof record.skill === 'object' && record.skill ? record.skill : record
		) as Record<string, unknown>;
		const instructions = typeof body.instructions === 'string' ? body.instructions : '';
		if (!instructions) return [];
		return [
			{
				name: typeof body.name === 'string' ? body.name : 'skill',
				description: typeof body.description === 'string' ? body.description : undefined,
				instructions,
			},
		];
	});
}

/** One session per `sessionId`, in turn order. A chat with no session id is its own session. */
function groupSessions(chats: ExportedTestChat[]): ExportedTestChat[][] {
	const sessions = new Map<string, ExportedTestChat[]>();
	chats.forEach((chat, index) => {
		const key = chat.sessionId ?? `solo-${index}`;
		sessions.set(key, [...(sessions.get(key) ?? []), chat]);
	});
	return [...sessions.values()];
}

async function generateChecks(config: AgentJsonConfig, skills: SkillText[]) {
	const tools = profileAgentTools(config);
	const prompt = buildPromiseCheckPrompt({ config, skills, tools });
	const text = await ask(prompt.system, prompt.user, usage.generate);
	const promise = parsePromiseChecks(text, { instructions: config.instructions ?? '', skills });
	return {
		tools,
		stakes: summarizeStakes(tools),
		checks: [...generateToolChecks(tools), ...promise.kept, BASE_CHECK],
		dropped: promise.dropped,
		unreadable: promise.unreadable ?? false,
	};
}

async function judgeSession(
	turns: ChatTurn[],
	checks: AgentCheck[],
	agent: JudgedAgent,
): Promise<CheckVerdict[]> {
	const verdicts = runToolChecks(checks, turns);
	const judged = checks.filter((c) => c.kind !== 'tool');
	for (const batch of batchChecks(judged)) {
		const prompt = buildJudgePrompt(turns, batch, agent);
		let answers: CheckVerdict[] = [];
		// One retry for a reply with no readable answer; keep the text for the review.
		for (let attempt = 1; attempt <= 2; attempt++) {
			const text = await ask(prompt.system, prompt.user, usage.judge);
			answers = parseJudgeAnswers(text, batch, turns.length);
			if (answers.some((a) => a.status !== 'not_run')) break;
			unreadable.push({ agent: agent.name, attempt, checks: batch.map((c) => c.id), text });
		}
		verdicts.push(...answers);
	}
	return verdicts;
}

interface SessionInput {
	source: 'test-chat' | 'session-read';
	/** Where the session came from: `test` for an Assistant test chat, else the agent's channel. */
	origin: string;
	sessionId: string;
	configHash: string;
	turns: ChatTurn[];
}

/** The inner JSON of an `agent-context` session read: `{ session, transcript }`. */
function readSessionContext(output: unknown): { origin: string; transcript: string } | null {
	const outer = typeof output === 'string' ? safeJson(output) : output;
	const context = (outer as { context?: unknown } | null)?.context;
	if (typeof context !== 'string') return null;
	const match = /<untrusted_data[^>]*>\s*([\s\S]*)<\/untrusted_data>/.exec(context);
	if (!match) return null;
	const inner = firstJson(match[1]) as {
		session?: { origin?: string };
		transcript?: unknown;
	} | null;
	if (typeof inner?.transcript !== 'string') return null;
	return { origin: inner.session?.origin ?? 'unknown', transcript: inner.transcript };
}

function safeJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

/** Parse the first JSON value in `text`, ignoring anything after it. */
function firstJson(text: string): unknown {
	for (let end = text.lastIndexOf('}'); end > 0; end = text.lastIndexOf('}', end - 1)) {
		const value = safeJson(text.slice(0, end + 1));
		if (value !== null) return value;
	}
	return null;
}

/** The config in effect at a turn: the hash of the latest test chat at or before it. */
function hashAtTurn(thread: ExportedThread, turnIndex: number): string {
	const before = thread.testChats.filter((c) => c.turnIndex <= turnIndex && c.configHash);
	return before.at(-1)?.configHash ?? thread.finalConfigHash;
}

/**
 * Sessions to judge. A session the Assistant read in full replaces the test chats
 * of the same session, because the read carries the tool calls.
 */
function collectSessions(thread: ExportedThread): SessionInput[] {
	const reads = new Map<string, SessionInput>();
	for (const read of thread.sessionReads ?? []) {
		const sessionId = typeof read.input?.threadId === 'string' ? read.input.threadId : null;
		const context = readSessionContext(read.output);
		if (!sessionId || !context) continue;
		const turns = parseSessionTranscript(context.transcript);
		if (turns.length === 0) continue;
		const previous = reads.get(sessionId);
		if (previous && previous.turns.length >= turns.length) continue;
		reads.set(sessionId, {
			source: 'session-read',
			origin: context.origin,
			sessionId,
			configHash: hashAtTurn(thread, read.turnIndex),
			turns,
		});
	}

	const chats = groupSessions(thread.testChats)
		.filter((session) => !reads.has(session[0].sessionId ?? ''))
		.map(
			(session, index): SessionInput => ({
				source: 'test-chat',
				origin: 'test',
				sessionId: session[0].sessionId ?? `solo-${index}`,
				configHash: session[0].configHash ?? thread.finalConfigHash,
				turns: session.map((chat) => ({
					userMessage: chat.message,
					reply: chat.response ?? '',
					...(chat.status === 'error' ? { runFailed: true } : {}),
				})),
			}),
		);

	return [...reads.values(), ...chats];
}

async function runThread(thread: ExportedThread) {
	const generated = new Map<string, Awaited<ReturnType<typeof generateChecks>>>();
	const sessions = [];
	for (const session of collectSessions(thread)) {
		const snapshot = thread.configsByHash?.[session.configHash] ?? {
			config: thread.finalConfig,
			skills: thread.finalSkills,
		};
		if (!generated.has(session.configHash)) {
			generated.set(
				session.configHash,
				await generateChecks(snapshot.config, readSkills(snapshot.skills)),
			);
		}
		const { checks, tools } = generated.get(session.configHash)!;
		const verdicts = await judgeSession(session.turns, checks, {
			name: snapshot.config.name,
			description: snapshot.config.description,
			tools,
		});
		sessions.push({ ...session, verdicts });
	}
	console.log(`${thread.threadId}: ${thread.finalConfig.name} (${sessions.length} sessions)`);
	return {
		threadId: thread.threadId,
		language: thread.language,
		agentName: thread.finalConfig.name,
		checkSets: Object.fromEntries(generated),
		sessions,
	};
}

async function main() {
	if (!dataDir || !outDir) throw new Error('Usage: run-spike.ts <data-dir> <out-dir>');
	const files = (await readdir(dataDir)).filter((f) => f.endsWith('.json') && f !== 'index.json');
	const threads = await Promise.all(
		files
			.slice(0, limit)
			.map(
				async (f) => JSON.parse(await readFile(path.join(dataDir, f), 'utf8')) as ExportedThread,
			),
	);

	const results: Result[] = [];
	const queue = [...threads];
	await Promise.all(
		Array.from({ length: 4 }, async () => {
			for (let thread = queue.shift(); thread; thread = queue.shift()) {
				results.push(await runThread(thread));
			}
		}),
	);

	await mkdir(outDir, { recursive: true });
	await writeFile(
		path.join(outDir, 'results.json'),
		JSON.stringify({ model, usage, results }, null, 2),
	);
	await writeFile(path.join(outDir, 'review.md'), renderReview(results));
	await writeFile(path.join(outDir, 'unreadable.json'), JSON.stringify(unreadable, null, 2));
	console.log(JSON.stringify({ model, usage }, null, 2));
}

type Result = {
	threadId: string;
	agentName: string;
	checkSets: Record<string, Awaited<ReturnType<typeof generateChecks>>>;
	sessions: Array<SessionInput & { verdicts: CheckVerdict[] }>;
};

function renderReview(results: Result[]): string {
	const lines = ['# Agent checks spike: review sheet', ''];
	for (const result of results) {
		lines.push(`## ${result.agentName}`, '', `Thread: ${result.threadId}`, '');
		for (const [hash, set] of Object.entries(result.checkSets)) {
			lines.push(`### Checks for config ${hash.slice(0, 8)} (stakes: ${set.stakes})`, '');
			lines.push(
				`Tools: ${set.tools.map((t) => `${t.name} (${t.action}${t.requireApproval ? ', approval' : ''})`).join(', ') || 'none'}`,
				'',
			);
			for (const check of set.checks) {
				lines.push(`- [ ] keep? **${check.id}**: ${check.question}`);
				if (check.appliesWhen) lines.push(`  - applies when: ${check.appliesWhen}`);
				if (check.source.quote) lines.push(`  - quote: "${check.source.quote}"`);
			}
			for (const drop of set.dropped) lines.push(`- dropped (${drop.why}): ${drop.question ?? ''}`);
			lines.push('');
		}
		result.sessions.forEach((session, index) => {
			lines.push(
				`### Session ${index + 1}: ${session.source}, origin ${session.origin} (${session.turns.length} turns)`,
				'',
			);
			for (const verdict of session.verdicts) {
				if (verdict.status === 'not_run') continue;
				const at = verdict.moment ? ` (turn ${verdict.moment.turnIndex + 1})` : '';
				lines.push(
					`- [ ] agree? ${verdict.checkId}: **${verdict.status}**${at}: ${verdict.reason}`,
				);
			}
			lines.push('');
		});
	}
	return lines.join('\n');
}

void main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
