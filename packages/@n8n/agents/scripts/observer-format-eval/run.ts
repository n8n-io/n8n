// Observer format eval: real observer prompt + model, scored by the real runObservationLogObserver.
//   collect <variant> <model> <reps>  -> out/outputs.jsonl (LLM calls, cached by key)
//   score                             -> accept rate per variant/model/size, using the code in src/
//   loop <variant> <model>            -> 3 successive batches per scenario through the real observer loop
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import type { AgentDbMessage } from '../../src/types/sdk/message';
import { InMemoryMemory } from '../../src/runtime/memory/memory-store';
import { createObservationLogObserveFn } from '../../src/runtime/memory/observation-log-defaults';
import { runObservationLogObserver } from '../../src/runtime/memory/observation-log-observer';

const OUT = 'out/outputs.jsonl';
const MODELS: Record<string, string> = {
	opus: 'anthropic/claude-opus-5-5',
	sonnet: 'anthropic/claude-sonnet-5-5',
};
const modelConfig = (m: string) => ({ id: MODELS[m], apiKey: process.env.N8N_AI_ANTHROPIC_KEY });
const prompt = (variant: string) => readFileSync(`prompts/${variant}.txt`, 'utf8');
const scenarios = () =>
	[...new Set(readdirSync('data').map((f) => f.split('-')[0]))].sort(
		(a, b) => Number(a.slice(1)) - Number(b.slice(1)),
	);
const part = (s: string, p: number) => readFileSync(`data/${s}-p${p}.txt`, 'utf8');
const partCount = (s: string) => [1, 2, 3].filter((p) => existsSync(`data/${s}-p${p}.txt`)).length;
const estimateTokens = (text: string) => Math.ceil(text.length / 4);

type Output = {
	key: string;
	variant: string;
	model: string;
	scenario: string;
	size: string;
	rep: number;
	text: string;
	inputTokens?: number;
	outputTokens?: number;
};
const readOutputs = (): Output[] =>
	existsSync(OUT)
		? readFileSync(OUT, 'utf8')
				.trim()
				.split('\n')
				.filter(Boolean)
				.map((l) => JSON.parse(l) as Output)
		: [];

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
	const queue = [...items];
	await Promise.all(
		Array.from({ length: n }, async () => {
			for (let t = queue.shift(); t; t = queue.shift()) await fn(t);
		}),
	);
}

/** Split a rendered transcript into user/assistant messages; tool lines stay in the assistant text. */
function toMessages(transcript: string, prefix: string): AgentDbMessage[] {
	const messages: AgentDbMessage[] = [];
	let current: { role: 'user' | 'assistant'; ts: string; lines: string[] } | undefined;
	const flush = () => {
		if (current && current.lines.join('').trim())
			messages.push({
				id: `${prefix}-${messages.length}`,
				createdAt: new Date(current.ts),
				role: current.role,
				content: [{ type: 'text', text: current.lines.join('\n') }],
			});
	};
	for (const line of transcript.split('\n')) {
		const m = /^\[(\d{4}-[^\]]+)\] (user|assistant):\s*$/.exec(line);
		if (m) {
			flush();
			current = { role: m[2] as 'user' | 'assistant', ts: m[1], lines: [] };
			continue;
		}
		const t = /^\[(\d{4}-[^\]]+)\] tool_/.exec(line);
		if (t && current?.role !== 'assistant') {
			flush();
			current = { role: 'assistant', ts: t[1], lines: [] };
		}
		current?.lines.push(line);
	}
	flush();
	return messages;
}

async function collect(variant: string, model: string, reps: number) {
	const done = new Set(readOutputs().map((o) => o.key));
	const observe = createObservationLogObserveFn(modelConfig(model), {
		observerPrompt: prompt(variant),
	});
	const jobs = scenarios().flatMap((s) =>
		(['p1', 'p1-2', 'p1-3'] as const)
			.filter((size) => Number(size.slice(-1)) <= partCount(s) || size === 'p1')
			.flatMap((size) => Array.from({ length: reps }, (_, rep) => ({ s, size, rep }))),
	);
	await pool(jobs, 8, async ({ s, size, rep }) => {
		const key = `${variant}|${model}|${s}|${size}|${rep}`;
		if (done.has(key)) return;
		const n = size === 'p1' ? 1 : size === 'p1-2' ? 2 : 3;
		const transcript = Array.from({ length: n }, (_, i) => part(s, i + 1)).join('\n');
		try {
			const r = await observe({
				observationScopeId: s,
				now: new Date('2026-10-14T12:00:00Z'),
				deltaMessages: [],
				transcript,
				transcriptTokenCount: estimateTokens(transcript),
				observationLogTail: [],
				renderedObservationLogTail: undefined,
			} as never);
			const res = typeof r === 'string' ? { text: r } : r;
			appendFileSync(
				OUT,
				JSON.stringify({
					key,
					variant,
					model,
					scenario: s,
					size,
					rep,
					text: res.text,
					inputTokens: res.usage?.promptTokens,
					outputTokens: res.usage?.completionTokens,
				} satisfies Output) + '\n',
			);
			process.stdout.write('.');
		} catch (e) {
			console.error('\n', key, (e as Error).message);
		}
	});
	console.log();
}

/** Run the cached output through the real observer and report whether it was persisted. */
async function persist(text: string) {
	const store = new InMemoryMemory();
	await store.saveThread({ id: 't', resourceId: 'u' });
	await store.saveMessages({
		threadId: 't',
		resourceId: 'u',
		messages: [
			{
				id: 'm1',
				createdAt: new Date('2026-10-14T11:00:00Z'),
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			},
		],
	});
	const result = await runObservationLogObserver({
		memory: store,
		observationScopeId: 't',
		observationLogTailLimit: 20,
		tokenCounter: (t) => estimateTokens(t),
		observe: async () => text,
	});
	const stored = (await store.getActiveObservationLog({ observationScopeId: 't' }))
		.map((e) => e.text)
		.join('\n');
	return { result, stored };
}

/** Share of the output's words that survive into stored entries (catches silent content loss). */
function retention(text: string, stored: string) {
	const words = (s: string) => s.toLowerCase().match(/[\p{L}\p{N}_$.#-]{4,}/gu) ?? [];
	const out = words(
		text.replace(/^\s*[*-]\s+(CRITICAL|IMPORTANT|INFO|COMPLETION)(\s+\(\d\d:\d\d\))?/gimu, ''),
	);
	const have = new Set(words(stored));
	return out.length ? out.filter((w) => have.has(w)).length / out.length : 1;
}

async function score() {
	const groups = new Map<string, { n: number; ok: number; ret: number; inTok: number }>();
	for (const o of readOutputs()) {
		const { result, stored } = await persist(o.text);
		const ok = result.status === 'ran' && result.cursorAdvanced;
		for (const g of [`${o.variant} ${o.model} ALL`, `${o.variant} ${o.model} ${o.size}`]) {
			const v = groups.get(g) ?? { n: 0, ok: 0, ret: 0, inTok: 0 };
			v.n++;
			v.ok += ok ? 1 : 0;
			v.ret += ok ? retention(o.text, stored) : 0;
			v.inTok += o.inputTokens ?? 0;
			groups.set(g, v);
		}
	}
	console.log(
		'group'.padEnd(34),
		'n'.padStart(4),
		'accepted'.padStart(9),
		'retention(accepted)'.padStart(20),
		'avg input'.padStart(10),
	);
	for (const [g, v] of [...groups].sort())
		console.log(
			g.padEnd(34),
			String(v.n).padStart(4),
			`${Math.round((100 * v.ok) / v.n)}%`.padStart(9),
			(v.ok ? `${Math.round((100 * v.ret) / v.ok)}%` : '-').padStart(20),
			String(Math.round(v.inTok / v.n)).padStart(10),
		);
}

async function loop(variant: string, model: string, only?: string) {
	const observe = createObservationLogObserveFn(modelConfig(model), {
		observerPrompt: prompt(variant),
	});
	const list = scenarios().filter((s) => !only || only.split(',').includes(s));
	await pool(list, 8, async (s) => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: s, resourceId: 'u' });
		const log: string[] = [];
		let total = 0;
		for (const p of [1, 2, 3].slice(0, partCount(s))) {
			await store.saveMessages({
				threadId: s,
				resourceId: 'u',
				messages: toMessages(part(s, p), `${s}p${p}`),
			});
			let usage = 0;
			const result = await runObservationLogObserver({
				memory: store,
				observationScopeId: s,
				observationLogTailLimit: 20,
				tokenCounter: (t) => estimateTokens(t),
				observe: async (input) => {
					const r = await observe(input);
					usage = (typeof r === 'string' ? 0 : r.usage?.promptTokens) ?? 0;
					return r;
				},
			});
			total += usage;
			log.push(
				`batch${p}: in=${usage} ${result.status === 'ran' && result.cursorAdvanced ? 'advanced' : 'STUCK'}`,
			);
		}
		console.log(`${variant} ${model} ${s}: ${log.join(' | ')} | total in=${total}`);
	});
}

const [mode, a, b, c] = process.argv.slice(2);
if (mode === 'collect') void collect(a, b, Number(c ?? 3));
else if (mode === 'score') void score();
else if (mode === 'loop') void loop(a, b, c);
