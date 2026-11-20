import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { GymAdmin } from './gym-admin';
import { isRecord } from '@n8n/utils/is-record';
import type { McpCaller } from './mcp-upstream';
import { OnceByKey } from './once-by-key';
import { clip, errText, resultText } from './result-text';
import {
	dropUnprovenIds,
	fillPointers,
	idsInArgs,
	missingIds,
	provenIds,
	knownText,
	removeUnprovenLiterals,
	type PointerContext,
	type UnprovenLiteral,
} from './plan-template';
import { GYM_LACKS_FEATURE } from './router';
import type { Hydrator } from './router';
import { SeededEntities } from './seeded-entities';

/** One model turn without tools: instructions and a prompt in, the answer text out. */
export type PlanLlm = (request: { instructions: string; prompt: string }) => Promise<string>;

export interface PlanHydratorDeps {
	admin: GymAdmin;
	tenant: string;
	upstream: McpCaller;
	gym: McpCaller;
	// Only a tool that this accepts can reach the real service.
	readTools: { has(tool: string): boolean };
	// Plan format and service part, see hydration-prompts.ts.
	instructions: string;
	llm: PlanLlm;
	// Real reads for the objects that the args of a call name (project, team, labels). Code runs them
	// before the first model turn, because a result without items gives the model nothing to copy.
	lookups?: (tool: string, args: Record<string, unknown>, result?: unknown) => Plan['reads'];
	// Last change to an overlay, after the checks. Code adds data here that the real data does not hold.
	finalize?: (overlay: Record<string, unknown>, result?: unknown) => Record<string, unknown>;
	// Lookup tools that the gym answers first. An object that an agent created in the gym has no
	// real copy, and a real object with the same key is another object.
	gymFirst?: ReadonlySet<string>;
	// The gym takes a seed of an entity that it has and adds the new children, see SeededEntities.
	keepParents?: boolean;
	// Ids are no UUIDs. An id that the real data shows word for word stays in the plan.
	opaqueIds?: boolean;
}

interface Verify {
	tool: string;
	args: Record<string, unknown>;
	// Text of the real result. Only ids that it shows are expected in the gym's answer.
	real?: string;
}

interface Plan {
	reads: Array<{ tool: string; args: Record<string, unknown> }>;
	overlay?: Record<string, unknown>;
	events: unknown[];
}

const MAX_READS = 4;
const MAX_LOOKUPS = 8;
// Keys of a write result that hold the id of an object.
// Tools that return one whole entity: get_issue, notion-fetch.
const DETAIL_TOOL = /(^|[-_])(get|fetch)([-_]|$)/;

const MADE_ID_KEYS: ReadonlySet<string> = new Set(['id', 'uuid', 'identifier', 'page_id']);
const MAX_SHOWN = 6000;
const MAX_REPAIRS = 2;

// Keys and value types of a value, without the values. For logs.
function shapeOf(value: unknown): unknown {
	if (Array.isArray(value)) return value.slice(0, 2).map(shapeOf);
	if (isRecord(value))
		return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shapeOf(v)]));
	return typeof value === 'number' || typeof value === 'boolean' || value === null
		? value
		: typeof value;
}

function parseJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

// The ids of the list that the text shows. Dashes and case do not matter.
function shownIds(ids: string[], text: string): string[] {
	const haystack = text.toLowerCase().replace(/-/g, '');
	return ids.filter((id) => haystack.includes(id));
}

// Names that are not data keys. The overlay comes from a model, so code drops them.
const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** A model writes "native.linear" as one key. Make it the two levels that the gym reads. */
export function nestDottedKeys(overlay: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(overlay)) {
		const parts = key.split('.');
		if (parts.some((part) => RESERVED_KEYS.has(part))) continue;
		const last = parts.pop() ?? key;
		let level = out;
		for (const part of parts) {
			const next = Object.hasOwn(level, part) ? level[part] : undefined;
			const child: Record<string, unknown> = isRecord(next) ? next : {};
			level[part] = child;
			level = child;
		}
		const current = Object.hasOwn(level, last) ? level[last] : undefined;
		level[last] = isRecord(current) && isRecord(value) ? { ...current, ...value } : value;
	}
	return out;
}

// The gym answers a seed with a report. A field that the gym does not know was not seeded.
function ignoredBySeed(report: unknown): { message: string; paths: string[] } | undefined {
	const r = isRecord(report) && isRecord(report.report) ? report.report : undefined;
	if (!r) return undefined;
	const warnings = Array.isArray(r.warnings) ? r.warnings : [];
	const unknown = warnings.filter(
		(w): w is { path?: unknown; message: string } =>
			isRecord(w) && typeof w.message === 'string' && /unknown/i.test(w.message),
	);
	if (unknown.length === 0) return undefined;
	return {
		message: unknown
			.slice(0, 4)
			.map((w) => `${String(w.path)}: ${w.message.slice(0, 120)}`)
			.join('; '),
		paths: unknown.flatMap((w) => (typeof w.path === 'string' ? [w.path] : [])),
	};
}

// The overlay without the fields at the paths that the gym did not take ("$.a.b").
function withoutPaths(overlay: Record<string, unknown>, paths: string[]): Record<string, unknown> {
	const next: Record<string, unknown> = structuredClone(overlay);
	for (const path of paths) {
		const parts = path
			.replace(/^\$\.?/, '')
			.split('.')
			.filter(Boolean);
		const last = parts.pop();
		if (last === undefined) continue;
		let level: unknown = next;
		for (const part of parts)
			level = isRecord(level) && Object.hasOwn(level, part) ? level[part] : undefined;
		if (isRecord(level)) delete level[last];
	}
	return next;
}

/** Reads the plan out of a model answer. Models wrap JSON in fences or add a sentence. */
export function parsePlan(answer: string): Plan {
	const start = answer.indexOf('{');
	const end = answer.lastIndexOf('}');
	if (start < 0 || end < start) throw new Error('the answer has no JSON object');
	const raw: unknown = JSON.parse(answer.slice(start, end + 1));
	if (!isRecord(raw)) throw new Error('the answer is not a JSON object');
	const reads = Array.isArray(raw.reads) ? raw.reads : [];
	return {
		reads: reads.flatMap((r) =>
			isRecord(r) && typeof r.tool === 'string'
				? [{ tool: r.tool, args: isRecord(r.args) ? r.args : {} }]
				: [],
		),
		overlay: isRecord(raw.overlay) ? raw.overlay : undefined,
		events: Array.isArray(raw.events) ? raw.events : [],
	};
}

/**
 * Hydrates the gym with a plan: one model turn names the objects to copy (and the extra real reads
 * it needs), and code runs it. The model has no tools. Code reads, fills the pointers, seeds,
 * replays the call on the gym and checks the ids. The model comes back only with an error to fix.
 *
 * A failed hydration never fails the call: the gym then answers with what it has.
 */
export class PlanHydrator implements Hydrator {
	private readonly once = new OnceByKey();
	// Lookups of one chat. The same project, team or user is read once.
	private readonly lookupCache = new Map<string, Promise<string>>();
	// What this chat's tenant holds, so a later call does not seed it again.
	private readonly seeded: SeededEntities;

	constructor(private readonly deps: PlanHydratorDeps) {
		this.seeded = new SeededEntities({ keepParents: deps.keepParents });
	}

	async hydrate(
		toolName: string,
		args: Record<string, unknown>,
		result: CallToolResult,
	): Promise<void> {
		await this.once.run(`${toolName} ${JSON.stringify(args)}`, async () => {
			const text = resultText(result);
			// Keys and types only, to see which fields the real result has.
			Container.get(Logger).info(
				`mcp-guard plan real result of ${toolName}: ${JSON.stringify(shapeOf(parseJson(text))).slice(0, 700)}`,
			);
			const prompt = [
				'An agent called a read tool. Make the gym answer this call like the real service did.',
				`Tool: ${toolName}`,
				`Args: ${JSON.stringify(args)}`,
				'Real result:',
				clip(text),
			].join('\n');
			return await this.process(toolName, prompt, parseJson(text), args, {
				verify: { tool: toolName, args, real: text },
			});
		});
	}

	// The ids of what a write made. A later plan must not seed another object under them.
	noteWrite(_toolName: string, result: CallToolResult): void {
		const found: string[] = [];
		const visit = (value: unknown, depth: number) => {
			if (depth > 3) return;
			if (Array.isArray(value)) value.forEach((item) => visit(item, depth + 1));
			else if (isRecord(value)) {
				for (const [key, item] of Object.entries(value)) {
					if (MADE_ID_KEYS.has(key) && typeof item === 'string' && item !== '') found.push(item);
					else visit(item, depth + 1);
				}
			}
		};
		visit(parseJson(resultText(result)), 0);
		this.seeded.hold(found);
	}

	async hydrateWrite(toolName: string, args: Record<string, unknown>): Promise<void> {
		// A call on an object that the gym made (an edit or a delete) has nothing to copy.
		const named = idsInArgs(args);
		if (named.length > 0 && this.seeded.knows(named)) return;
		const prompt = [
			'An agent is about to call a write tool. The call runs in the gym only. Make sure the objects it refers to (its parent, target page, database or issue) exist in the gym with their real ids, so the call can run. Do not apply its change.',
			`Tool: ${toolName}`,
			`Args: ${JSON.stringify(args)}`,
			'There is no real result. Ask for the real reads you need, then answer with the overlay. If the call needs nothing, answer {}.',
		].join('\n');
		await this.once.run(`${toolName} ${JSON.stringify(args)}`, async () => {
			return await this.process(toolName, prompt, undefined, args);
		});
	}

	private async process(
		toolName: string,
		prompt: string,
		result: unknown,
		args: Record<string, unknown>,
		options: { verify?: Verify } = {},
	): Promise<boolean> {
		const started = Date.now();
		const stats = { turns: 0, reads: 0 };
		try {
			const ok = await this.run(toolName, prompt, result, args, options.verify, stats);
			Container.get(Logger).info(
				`mcp-guard plan hydration ${toolName}: ${ok ? 'ok' : 'not verified'}, ${stats.turns} model turns, ${stats.reads} reads, ${Date.now() - started} ms`,
			);
			return ok;
		} catch (e) {
			// Tool name and error only. Never log args or real data.
			Container.get(Logger).warn(`mcp-guard plan hydration failed for ${toolName}`);
			return false;
		}
	}

	private async run(
		tool: string,
		prompt: string,
		result: unknown,
		args: Record<string, unknown>,
		verify: Verify | undefined,
		stats: { turns: number; reads: number },
	): Promise<boolean> {
		const ctx: PointerContext = { result, reads: [], args };
		let fullPrompt = prompt;
		const wanted = this.deps.lookups?.(tool, args, result).slice(0, MAX_LOOKUPS) ?? [];
		const { rest: lookups, held } = await this.withoutGymObjects(wanted);
		if (held.length > 0) {
			this.seeded.hold(
				held.flatMap(({ args: a }) => Object.values(a).filter((v) => typeof v === 'string')),
			);
			const named = held.map(({ tool: t, args: a }) => `${t} ${JSON.stringify(a)}`).join('; ');
			fullPrompt = `${fullPrompt}\n\nThe gym holds these objects already. Do not seed them: ${named}`;
		}
		if (lookups.length > 0) {
			const answers = await this.execute(lookups, ctx, stats, true);
			fullPrompt = `${fullPrompt}\n\nThe call names objects in its args. These are the real results of looking them up (${ctx.reads.length} reads, usable as $reads[n]). Each object that the call names must exist in the gym, also when the real result above has no items. Take it from these results.\n${answers}`;
		}
		let plan = await this.ask(fullPrompt, stats);
		if (plan.reads.length > 0) {
			const first = ctx.reads.length;
			const answers = await this.execute(plan.reads.slice(0, MAX_READS), ctx, stats);
			fullPrompt = `${fullPrompt}\n\nResults of the reads you asked for (in order, from $reads[${first}]):\n${answers}\n\nNow answer with the overlay. You may not ask for more reads.`;
			plan = await this.ask(fullPrompt, stats);
		}
		const trace: { sent?: unknown } = {};
		// A read that is not a lookup of one entity (a list, a search, a query) shows fewer fields.
		const shallow = verify !== undefined && !DETAIL_TOOL.test(tool);
		let problem = await this.apply(plan, ctx, verify, false, trace, shallow);
		for (let repair = 0; problem !== undefined && repair < MAX_REPAIRS; repair++) {
			Container.get(Logger).info(
				`mcp-guard plan problem; overlay shape ${JSON.stringify(shapeOf(plan.overlay)).slice(0, 700)}`,
			);
			// Pointers that name nothing are dropped, so the gym can get less than the plan said.
			const sent = JSON.stringify(trace.sent ?? null).slice(0, MAX_SHOWN);
			const again = `${fullPrompt}\n\nYour previous answer:\n${JSON.stringify({ overlay: plan.overlay, events: plan.events })}\n\nWhat code sent to the gym after it filled the pointers:\n${sent}\n\nIt did not work: ${problem}\nAnswer with a complete fixed plan. You may not ask for more reads.`;
			plan = await this.ask(again, stats);
			problem = await this.apply(plan, ctx, verify, repair === MAX_REPAIRS - 1, trace, shallow);
		}
		return problem === undefined;
	}

	// Drops the lookups of objects that the gym holds already.
	private async withoutGymObjects(
		lookups: Plan['reads'],
	): Promise<{ rest: Plan['reads']; held: Plan['reads'] }> {
		const { gymFirst, gym } = this.deps;
		if (!gymFirst) return { rest: lookups, held: [] };
		const held = await Promise.all(
			lookups.map(async ({ tool, args }) => {
				if (!gymFirst.has(tool)) return false;
				try {
					const res = await gym.callTool(tool, args);
					Container.get(Logger).info(
						`mcp-guard plan gym check ${tool}: ${res.isError ? 'error' : 'answer'}`,
					);
					return !res.isError && resultText(res).trim() !== '';
				} catch (e) {
					Container.get(Logger).info(`mcp-guard plan gym check ${tool} failed`);
					return false;
				}
			}),
		);
		return { rest: lookups.filter((_, i) => !held[i]), held: lookups.filter((_, i) => held[i]) };
	}

	private async ask(prompt: string, stats: { turns: number }): Promise<Plan> {
		stats.turns++;
		const started = Date.now();
		const answer = await this.deps.llm({ instructions: this.deps.instructions, prompt });
		Container.get(Logger).info(
			`mcp-guard plan model turn ${stats.turns}: ${Date.now() - started} ms, prompt ${prompt.length} chars, answer ${answer.length} chars`,
		);
		const plan = parsePlan(answer);
		const pointers = (
			JSON.stringify(plan.overlay ?? {}).match(/"\$(?:result|reads\[\d+\])[^"]*"/g) ?? []
		).length;
		Container.get(Logger).info(`mcp-guard plan turn ${stats.turns} uses ${pointers} pointers`);
		return plan;
	}

	// Runs the reads the plan asked for, in parallel. A refused or failed read is reported as text.
	private async execute(
		reads: Plan['reads'],
		ctx: PointerContext,
		stats: { reads: number },
		cached = false,
	): Promise<string> {
		const outputs = await Promise.all(
			reads.map(async ({ tool, args }) => {
				stats.reads++;
				// A tool outside the read list could change data. Refuse it in code.
				if (!this.deps.readTools.has(tool)) return `error: ${tool} is not a read tool`;
				try {
					const key = `${tool} ${JSON.stringify(args)}`;
					const known = cached ? this.lookupCache.get(key) : undefined;
					if (known) return await known;
					const read = this.readReal(tool, args);
					if (cached) {
						this.lookupCache.set(key, read);
						// A failed read is read again next time.
						read.catch(() => this.lookupCache.delete(key));
					}
					return await read;
				} catch (e) {
					return `error: ${errText(e)}`;
				}
			}),
		);
		const first = ctx.reads.length;
		ctx.reads = [...ctx.reads, ...outputs.map(parseJson)];
		return outputs.map((o, i) => `[${first + i}] ${clip(o)}`).join('\n');
	}

	private async readReal(tool: string, args: Record<string, unknown>): Promise<string> {
		const text = resultText(await this.deps.upstream.callTool(tool, args));
		// Keys and types only, like the log of the real result of the call.
		Container.get(Logger).info(
			`mcp-guard plan read ${tool}: ${JSON.stringify(shapeOf(parseJson(text))).slice(0, 500)}`,
		);
		return text;
	}

	// Seeds are applied one at a time. Two calls that seed at once would both leave out, or both
	// send, the same entity.
	private applying: Promise<unknown> = Promise.resolve();

	// Seeds the plan and checks it. Returns the problem for the model, or undefined when all is well.
	// Text that the real data does not contain goes back to the model once. On the last try it is
	// removed and the rest is seeded.
	private async apply(
		plan: Plan,
		ctx: PointerContext,
		verify: Verify | undefined,
		last: boolean,
		trace: { sent?: unknown } = {},
		shallow = false,
	): Promise<string | undefined> {
		const turn = this.applying.then(
			async () => await this.applyPlan(plan, ctx, verify, last, trace, shallow),
		);
		this.applying = turn.catch(() => undefined);
		return await turn;
	}

	private async applyPlan(
		plan: Plan,
		ctx: PointerContext,
		verify: Verify | undefined,
		last: boolean,
		trace: { sent?: unknown } = {},
		shallow = false,
	): Promise<string | undefined> {
		const { admin, tenant } = this.deps;
		const proven = provenIds(ctx.result, ctx.reads, ctx.args);
		const known = knownText(ctx.result, ctx.reads, ctx.args);
		// Case matters for an id such as a spreadsheet id, so this text keeps the case.
		const opaqueSource = this.deps.opaqueIds
			? JSON.stringify([ctx.result, ctx.reads, ctx.args])
			: undefined;
		const flagged: UnprovenLiteral[] = [];
		// Pointers first, then ids and text: only data of the real call is left.
		const clean = (value: unknown): unknown => {
			const checked = removeUnprovenLiterals(
				dropUnprovenIds(fillPointers(value, ctx), proven, opaqueSource),
				known,
			);
			flagged.push(...checked.flagged);
			return checked.cleaned;
		};
		const cleaned =
			plan.overlay && Object.keys(plan.overlay).length > 0
				? clean({ world_version: 1, ...nestDottedKeys(plan.overlay) })
				: undefined;
		// The tenant keeps what an earlier call seeded. The gym refuses an id that it has.
		const fresh = isRecord(cleaned) ? this.seeded.dedupe(cleaned, !shallow) : cleaned;
		const toSeed = isRecord(fresh) && SeededEntities.isEmpty(fresh) ? undefined : fresh;
		const overlay =
			this.deps.finalize && isRecord(toSeed) ? this.deps.finalize(toSeed, ctx.result) : toSeed;
		trace.sent = overlay;
		Container.get(Logger).info(
			`mcp-guard plan seed shape: ${JSON.stringify(shapeOf(overlay)).slice(0, 500)}`,
		);
		const events = plan.events.map(clean);
		if (flagged.length > 0 && !last) {
			const shown = flagged
				.slice(0, 8)
				.map((f) => `${f.path} = ${JSON.stringify(f.value)}`)
				.join('; ');
			return `these values are not in the real data: ${shown}. Take each from the real data with a pointer, or leave it out.`;
		}
		try {
			const report = overlay ? await admin.seed(tenant, overlay) : undefined;
			const ignored = last ? undefined : ignoredBySeed(report);
			// The gym holds what it took. Record that before a repair, which must not seed it again.
			if (isRecord(overlay)) {
				this.seeded.record(ignored ? withoutPaths(overlay, ignored.paths) : overlay, shallow);
			}
			if (ignored) return `the gym ignored parts of it: ${ignored.message}`;
			for (const event of events) await admin.event(tenant, event);
		} catch (e) {
			return `the gym refused it: ${errText(e)}`;
		}
		return verify ? await this.check(verify) : undefined;
	}

	// Replays the original call on the gym. Every id the call names, and the real result shows, must be in the answer.
	private async check({ tool, args, real }: Verify): Promise<string | undefined> {
		let res: CallToolResult;
		try {
			res = await this.deps.gym.callTool(tool, args);
		} catch (e) {
			return `the gym could not answer the original call: ${errText(e)}`;
		}
		const text = resultText(res);
		if (res.isError) {
			// A limit of the gym build. No plan can change it, so the model is not asked again.
			if (GYM_LACKS_FEATURE.test(text)) return undefined;
			return `the gym answered the original call with an error: ${text.slice(0, 500)}`;
		}
		// An id that only filters (a project of an empty list) is not in the answer, and not in the real one.
		const expected = real === undefined ? idsInArgs(args) : shownIds(idsInArgs(args), real);
		const missing = missingIds(expected, text);
		return missing.length > 0
			? `the gym's answer to the original call does not show these ids from the call: ${missing.join(', ')}`
			: undefined;
	}
}
