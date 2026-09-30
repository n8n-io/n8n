import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { createInterface } from 'node:readline';

import { isRecord, killGroup } from './util';

export const DEFAULT_MODEL = 'anthropic/claude-sonnet-5-5';

export interface Tokens {
	readonly input: number;
	readonly output: number;
	readonly cacheRead: number;
	readonly cacheWrite: number;
	readonly cost: number;
}

export interface CommandCounts {
	readonly build: number;
	readonly check: number;
	readonly test: number;
	readonly run: number;
	readonly curl: number;
}

export interface ToolCall {
	readonly name: string;
	readonly seconds: number;
	readonly isError: boolean;
	readonly turn: number;
	readonly command?: string;
}

export interface AgentMetrics {
	readonly seconds: number;
	readonly exitCode: number | null;
	readonly timedOut: boolean;
	readonly turns: number;
	readonly toolCalls: number;
	readonly tools: Readonly<Record<string, { count: number; seconds: number }>>;
	readonly tokens: Tokens;
	/** Usage of each assistant message, in order. */
	readonly turnTokens: readonly Tokens[];
	readonly commands: CommandCounts;
	/** Turn of the first build or check command that passed. */
	readonly firstPassTurn?: number;
	readonly calls: readonly ToolCall[];
}

/** One line of the pi JSON event stream with the time the runner read it. */
export interface TimedEvent {
	readonly at: number;
	readonly event: Record<string, unknown>;
}

const COMMAND_PATTERNS: Record<keyof CommandCounts, RegExp> = {
	build: /\bn8n-node build\b|\btsc\b|\b(npm|pnpm) run build\b/,
	check: /\bn8n-node-next check\b|\bn8n-node lint\b|\beslint\b|\b(npm|pnpm) run lint\b/,
	test: /\bvitest\b|\bjest\b|\b(npm|pnpm) (run )?test\b|\bnode --test\b|\brunAction\b/,
	run: /(?:^|[\s;&|(])(?:tsx|node)\s/,
	curl: /\bcurl\b/,
};

const numberOf = (value: unknown) => (typeof value === 'number' ? value : 0);

function usageOf(message: unknown): Tokens {
	const usage = isRecord(message) && isRecord(message.usage) ? message.usage : {};
	const cost = isRecord(usage.cost) ? usage.cost : {};
	return {
		input: numberOf(usage.input),
		output: numberOf(usage.output),
		cacheRead: numberOf(usage.cacheRead),
		cacheWrite: numberOf(usage.cacheWrite),
		cost: numberOf(cost.total),
	};
}

const addTokens = (a: Tokens, b: Tokens): Tokens => ({
	input: a.input + b.input,
	output: a.output + b.output,
	cacheRead: a.cacheRead + b.cacheRead,
	cacheWrite: a.cacheWrite + b.cacheWrite,
	cost: a.cost + b.cost,
});

const NO_TOKENS: Tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };

/** Folds the pi event stream into run metrics. */
export function summarize(
	events: readonly TimedEvent[],
	run: { seconds: number; exitCode: number | null; timedOut: boolean },
): AgentMetrics {
	const turnEnds = events.filter(({ event }) => event.type === 'turn_end');
	const turnAt = (at: number) => turnEnds.filter((end) => end.at < at).length + 1;
	const assistant = events.filter(
		({ event }) =>
			event.type === 'message_end' && isRecord(event.message) && event.message.role === 'assistant',
	);
	const turnTokens = assistant.map(({ event }) => usageOf(event.message));
	const starts = new Map(
		events
			.filter(({ event }) => event.type === 'tool_execution_start')
			.map(({ at, event }) => [event.toolCallId, { at, event }]),
	);
	const calls = events
		.filter(({ event }) => event.type === 'tool_execution_end')
		.map(({ at, event }): ToolCall => {
			const start = starts.get(event.toolCallId);
			const args = isRecord(start?.event.args) ? start.event.args : {};
			return {
				name: String(event.toolName),
				seconds: (at - (start?.at ?? at)) / 1000,
				isError: event.isError === true,
				turn: turnAt(start?.at ?? at),
				...(typeof args.command === 'string' ? { command: args.command } : {}),
			};
		});
	const commands = calls.flatMap(({ command }) => (command ? [command] : []));
	const count = (pattern: RegExp) => commands.filter((command) => pattern.test(command)).length;
	const firstPass = calls.find(
		({ command, isError }) =>
			!isError &&
			command !== undefined &&
			(COMMAND_PATTERNS.build.test(command) || COMMAND_PATTERNS.check.test(command)),
	);
	const tools = calls.reduce<Record<string, { count: number; seconds: number }>>(
		(byName, call) => ({
			...byName,
			[call.name]: {
				count: (byName[call.name]?.count ?? 0) + 1,
				seconds: (byName[call.name]?.seconds ?? 0) + call.seconds,
			},
		}),
		{},
	);
	return {
		...run,
		turns: turnEnds.length,
		toolCalls: calls.length,
		tools,
		tokens: turnTokens.reduce(addTokens, NO_TOKENS),
		turnTokens,
		commands: {
			build: count(COMMAND_PATTERNS.build),
			check: count(COMMAND_PATTERNS.check),
			test: count(COMMAND_PATTERNS.test),
			run: count(COMMAND_PATTERNS.run),
			curl: count(COMMAND_PATTERNS.curl),
		},
		...(firstPass ? { firstPassTurn: firstPass.turn } : {}),
		calls,
	};
}

/** Runs pi headless in `cwd`, saves the raw event stream, and kills the run at the time limit. */
export async function runAgent(options: {
	cwd: string;
	prompt: string;
	env: NodeJS.ProcessEnv;
	eventsFile: string;
	model?: string;
	timeoutMs: number;
}): Promise<AgentMetrics> {
	const started = Date.now();
	const args = [
		'-p',
		'--mode',
		'json',
		'--no-session',
		'-ne',
		'-ns',
		// Only the project's own AGENTS.md counts; the agent reads it as the prompt says.
		'-nc',
		'--model',
		options.model ?? DEFAULT_MODEL,
		'-t',
		'read,bash,edit,write',
		options.prompt,
	];
	const child = spawn('pi', args, {
		cwd: options.cwd,
		env: options.env,
		stdio: ['ignore', 'pipe', 'pipe'],
		detached: true,
	});
	const raw = createWriteStream(options.eventsFile);
	const events: TimedEvent[] = [];
	const timedOut = { value: false };
	const timer = setTimeout(() => {
		timedOut.value = true;
		killGroup(child.pid);
	}, options.timeoutMs);
	child.stderr.pipe(createWriteStream(`${options.eventsFile}.stderr`));
	const lines = createInterface({ input: child.stdout });
	lines.on('line', (line) => {
		raw.write(`${line}\n`);
		try {
			const event: unknown = JSON.parse(line);
			if (isRecord(event)) events.push({ at: Date.now(), event });
		} catch {
			// pi prints only JSON lines in json mode; skip anything else.
		}
	});
	const exitCode = await new Promise<number | null>((resolve) => {
		child.on('error', () => resolve(null));
		child.on('close', (code) => resolve(code));
	});
	clearTimeout(timer);
	// Kill tool processes the agent left running, such as a dev server.
	killGroup(child.pid);
	await new Promise((resolve) => raw.end(resolve));
	return summarize(events, {
		seconds: (Date.now() - started) / 1000,
		exitCode,
		timedOut: timedOut.value,
	});
}
