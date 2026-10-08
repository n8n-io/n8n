/**
 * Reads the harness run-debug page (`workflow-eval-llm-debug.html`): one section per
 * thread, one run panel per agent run, one step panel per model call. Same source and
 * rules as `parse_debug` in summarize.py, plus the tool calls of each step.
 */
import { z } from 'zod';

import type { ModelStep, ToolDefinition, Usage } from '../schema';

export interface DebugRun {
	label: string;
	steps: ModelStep[];
	system: string | null;
	tools: ToolDefinition[];
}

export interface DebugThread {
	thread: string;
	runs: DebugRun[];
}

const rawUsageSchema = z.object({
	inputTokens: z.number().nullish(),
	outputTokens: z.number().nullish(),
	inputTokenDetails: z
		.object({
			noCacheTokens: z.number().nullish(),
			cacheReadTokens: z.number().nullish(),
			cacheWriteTokens: z.number().nullish(),
		})
		.nullish(),
});

const outputExtrasSchema = z.object({
	rawFinishReason: z.string().nullish(),
	model: z.object({ modelId: z.string().nullish() }).nullish(),
	responseMeta: z
		.object({ timestamp: z.string().nullish(), modelId: z.string().nullish() })
		.nullish(),
	performance: z.object({ stepTimeMs: z.number().nullish() }).nullish(),
});

const toolCallMetaSchema = z.object({ toolCallId: z.string() });

/** The model-facing output of a tool result: `{ type: 'content', value: [{ type: 'text', text }] }`. */
const toolResultOutputSchema = z.object({
	value: z.array(z.object({ text: z.string().optional() })),
});

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function unescapeHtml(text: string): string {
	return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
		if (code.startsWith('#x') || code.startsWith('#X'))
			return String.fromCodePoint(parseInt(code.slice(2), 16));
		if (code.startsWith('#')) return String.fromCodePoint(parseInt(code.slice(1), 10));
		return ENTITIES[code.toLowerCase()] ?? match;
	});
}

/** The JSON of the first `<span class="json-label">label</span>` panel in `html`. */
function jsonBlock(html: string, label: string): unknown {
	const at = html.indexOf(`<span class="json-label">${label}</span>`);
	if (at < 0) return undefined;
	const open = '<pre class="json-block"><code>';
	const start = html.indexOf(open, at);
	const end = start < 0 ? -1 : html.indexOf('</code></pre>', start);
	if (end < 0) return undefined;
	try {
		return JSON.parse(unescapeHtml(html.slice(start + open.length, end)));
	} catch {
		return undefined;
	}
}

function usageOf(raw: unknown): Usage | null {
	const parsed = rawUsageSchema.safeParse(raw);
	if (!parsed.success) return null;
	const details = parsed.data.inputTokenDetails;
	return {
		input: parsed.data.inputTokens ?? 0,
		output: parsed.data.outputTokens ?? 0,
		noCache: details?.noCacheTokens ?? 0,
		cacheRead: details?.cacheReadTokens ?? 0,
		cacheWrite: details?.cacheWriteTokens ?? 0,
	};
}

function toolCallsOf(output: string, skills: Map<string, string>): ModelStep['toolCalls'] {
	return output
		.split('<div class="segment-block segment-tool-call">')
		.slice(1)
		.flatMap((segment) => {
			const name = /Tool call · <code>([^<]*)<\/code>/.exec(segment)?.[1];
			const meta = toolCallMetaSchema.safeParse(jsonBlock(segment, 'Metadata'));
			if (!name || !meta.success) return [];
			const id = meta.data.toolCallId;
			return [{ id, tool: unescapeHtml(name), skill: skills.get(id) ?? null }];
		});
}

function reasoningOf(output: string): string | null {
	const texts = output
		.split('<div class="segment-block segment-reasoning">')
		.slice(1)
		.map((segment) => /<p class="segment-text">([\s\S]*?)<\/p>/.exec(segment)?.[1] ?? '')
		.map((text) => unescapeHtml(text).trim())
		.filter((text) => text.length > 0);
	return texts.length > 0 ? texts.join('\n\n') : null;
}

/** The bracket lines before the markdown: skill name, directory, path, hash and linked files. */
const SKILL_HEADER = /^(\[[^\]\n]*\]\n)+\n?/;

/**
 * The skill markdown per `load_skill` call id. The transcript result only says the skill is
 * active; the model gets the markdown in the tool result, which the inputs of later steps repeat.
 */
function skillsOf(chunk: string): Map<string, string> {
	const kind = '<div class="segment-kind">Tool result · <code>load_skill</code>';
	return new Map(
		chunk
			.split('<div class="segment-block segment-tool-result">')
			.slice(1)
			.filter((segment) => segment.startsWith(kind))
			.flatMap((segment): Array<[string, string]> => {
				const meta = toolCallMetaSchema.safeParse(jsonBlock(segment, 'Metadata'));
				const output = toolResultOutputSchema.safeParse(jsonBlock(segment, 'Output'));
				const text = output.success
					? output.data.value.find((part) => part.text?.startsWith('[Skill: '))?.text
					: undefined;
				return meta.success && text ? [[meta.data.toolCallId, text.replace(SKILL_HEADER, '')]] : [];
			}),
	);
}

function stepOf(
	panel: string,
	index: number,
	skills: Map<string, string>,
): Omit<ModelStep, 'toolWindowMs'> | null {
	const extras = outputExtrasSchema.safeParse(jsonBlock(panel, 'Output extras'));
	const timestamp = extras.success ? extras.data.responseMeta?.timestamp : undefined;
	const startMs = timestamp ? Date.parse(timestamp) : Number.NaN;
	if (!extras.success || Number.isNaN(startMs)) return null;
	const outputAt = panel.indexOf('detail-section-title">Output');
	return {
		index,
		startMs,
		modelMs: extras.data.performance?.stepTimeMs ?? 0,
		finishReason: extras.data.rawFinishReason ?? null,
		modelId: extras.data.responseMeta?.modelId ?? extras.data.model?.modelId ?? null,
		usage: usageOf(jsonBlock(panel, 'Raw usage')),
		reasoning: outputAt < 0 ? null : reasoningOf(panel.slice(outputAt)),
		toolCalls: outputAt < 0 ? [] : toolCallsOf(panel.slice(outputAt), skills),
	};
}

function systemOf(panel: string): string | null {
	const text =
		/<div class="content-block role-system"><div class="content-role">system<\/div><p class="segment-text">([\s\S]*?)<\/p>/.exec(
			panel,
		)?.[1];
	return text === undefined ? null : unescapeHtml(text);
}

/** Tool definitions by name, from the "Tools (n)" panel of the step settings. */
function toolSegmentsOf(panel: string): Array<[string, string]> {
	const at = panel.indexOf('<summary>Tools (');
	if (at < 0) return [];
	return panel
		.slice(at)
		.split('<details class="json-panel"><summary><code>')
		.slice(1)
		.flatMap((segment): Array<[string, string]> => {
			const name = /^([^<]*)<\/code>/.exec(segment)?.[1];
			return name ? [[unescapeHtml(name), segment]] : [];
		});
}

/** Every tool any step offered, first definition per name. Tools load during a run, so steps differ. */
function toolsOf(panels: string[]): ToolDefinition[] {
	const segments = new Map<string, string>();
	for (const [name, segment] of panels.flatMap(toolSegmentsOf)) {
		if (!segments.has(name)) segments.set(name, segment);
	}
	return [...segments].map(([name, segment]) => {
		const schemaAt = segment.indexOf('<span class="json-label">Input schema</span>');
		const head = schemaAt < 0 ? segment : segment.slice(0, schemaAt);
		const description = /<p class="segment-text">([\s\S]*?)<\/p>/.exec(head)?.[1] ?? '';
		return {
			name,
			description: unescapeHtml(description),
			inputSchema: jsonBlock(segment, 'Input schema') ?? null,
		};
	});
}

/** Adds the derived tool window: the gap from the end of a step to the start of the next one. */
function withToolWindows(steps: Array<Omit<ModelStep, 'toolWindowMs'>>): ModelStep[] {
	return steps.map((step, i) => {
		const next = steps[i + 1];
		const gap = next ? next.startMs - (step.startMs + step.modelMs) : null;
		return { ...step, toolWindowMs: gap === null ? null : Math.max(gap, 0) };
	});
}

function runOf(chunk: string, label: string): DebugRun {
	const panels = chunk.split(/<div class="step-panel(?: hidden)?" data-step-index="\d+">/).slice(1);
	const skills = skillsOf(chunk);
	const steps = panels.flatMap((panel, i) => {
		const step = stepOf(panel, i, skills);
		return step ? [step] : [];
	});
	return {
		label,
		steps: withToolWindows(steps),
		system: panels.map(systemOf).find((text) => text !== null) ?? null,
		tools: toolsOf(panels),
	};
}

export function parseDebugHtml(html: string): Map<string, DebugThread> {
	const sections = html.split('<section class="debug-case"').slice(1);
	return new Map(
		sections.flatMap((section): Array<[string, DebugThread]> => {
			const thread = /thread ([0-9a-f-]{36})/.exec(section)?.[1];
			if (!thread) return [];
			const labels = [...section.matchAll(/<span class="run-label">([\s\S]*?)<\/span>/g)].map(
				(match) => unescapeHtml(match[1]),
			);
			const chunks = section
				.split(/<div class="run-panel(?: hidden)?" data-run-index="\d+">/)
				.slice(1);
			const runs = chunks.map((chunk, i) => runOf(chunk, labels[i] ?? `Run ${i + 1}`));
			return [[thread, { thread, runs }]];
		}),
	);
}

/**
 * Gives each debug run the index of its transcript turn. A turn lists its agent runs in
 * `runIds` (a suspended run resumes as a new run); the debug page lists the runs in the
 * same order. Runs past the listed ones go to the last turn.
 */
export function turnOfRuns(runIdsPerTurn: number[], runCount: number): number[] {
	const owners = runIdsPerTurn.flatMap((count, turn) =>
		Array.from({ length: Math.max(count, 1) }, () => turn),
	);
	const lastTurn = Math.max(runIdsPerTurn.length - 1, 0);
	return Array.from({ length: runCount }, (_, run) => owners[run] ?? lastTurn);
}
