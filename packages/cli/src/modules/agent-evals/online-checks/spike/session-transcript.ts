import type { ChatTurn, TimelineEvent } from '../types';

/**
 * Spike-only adapter: rebuild turns and timeline events from the session
 * transcript that `formatPreviewSessionContext` renders for the Assistant. The
 * product reads `agent_execution.timeline` directly and needs none of this; the
 * spike has only what the Assistant traced.
 */

type Block =
	| { kind: 'user' | 'assistant'; text: string }
	| {
			kind: 'tool';
			header: string;
			input: string;
			output: string;
			field: 'input' | 'output' | null;
	  }
	| { kind: 'other' };

const TURN_HEADER = /^## Turn \(/;

function parseValue(text: string): unknown {
	const trimmed = text.trim();
	if (trimmed === '(none)') return undefined;
	try {
		return JSON.parse(trimmed);
	} catch {
		return trimmed;
	}
}

export function parseSessionTranscript(text: string): ChatTurn[] {
	const turns: ChatTurn[] = [];
	let user: string[] = [];
	let replies: string[] = [];
	let timeline: TimelineEvent[] = [];
	let block: Block | null = null;
	let lastSuspensionId = '';
	let callCount = 0;
	let runFailed = false;
	let complete = false;

	const closeBlock = () => {
		if (block?.kind === 'user') user.push(block.text);
		if (block?.kind === 'assistant') replies.push(block.text);
		if (block?.kind === 'tool') {
			const [namePart, ...parts] = block.header.split(' | ');
			const kind = parts.find((p) => p.startsWith('kind='))?.slice(5) ?? 'tool';
			timeline.push({
				type: 'tool-call',
				kind: kind as Extract<TimelineEvent, { type: 'tool-call' }>['kind'],
				name: namePart.trim(),
				toolCallId: `call-${++callCount}`,
				input: parseValue(block.input),
				output: parseValue(block.output),
				startTime: 0,
				endTime: 0,
				success: parts.includes('succeeded'),
			});
		}
		block = null;
	};

	const closeTurn = () => {
		closeBlock();
		if (user.length || replies.length || timeline.length) {
			turns.push({
				userMessage: user.join('\n'),
				reply: replies.join('\n'),
				timeline,
				...(runFailed ? { runFailed } : {}),
			});
		}
		runFailed = false;
		user = [];
		replies = [];
		timeline = [];
	};

	for (const line of text.split('\n')) {
		if (line.startsWith('</preview_session_context>')) {
			complete = true;
			break;
		}
		if (TURN_HEADER.test(line)) {
			closeTurn();
			runFailed = line.includes('status=error');
			continue;
		}
		if (line.startsWith('User: ')) {
			closeBlock();
			block = { kind: 'user', text: line.slice(6) };
		} else if (line.startsWith('Assistant: ')) {
			closeBlock();
			block = { kind: 'assistant', text: line.slice(11) };
		} else if (line.startsWith('Tool call: ')) {
			closeBlock();
			block = { kind: 'tool', header: line.slice(11), input: '', output: '', field: null };
		} else if (block?.kind === 'tool' && line.startsWith('  Input: ')) {
			block.input = line.slice(9);
			block.field = 'input';
		} else if (block?.kind === 'tool' && line.startsWith('  Output: ')) {
			block.output = line.slice(10);
			block.field = 'output';
		} else if (line.startsWith('[suspended waiting on ')) {
			closeBlock();
			lastSuspensionId = `suspension-${timeline.length}-${turns.length}`;
			timeline.push({
				type: 'suspension',
				toolName: line.slice(22).replace(/\]$/, ''),
				toolCallId: lastSuspensionId,
				timestamp: 0,
			});
		} else if (line.startsWith('Human response: ')) {
			closeBlock();
			timeline.push({
				type: 'hitl-response',
				toolCallId: lastSuspensionId,
				response: parseValue(line.slice(16)),
				timestamp: 0,
			});
		} else if (line.startsWith('[stopped by guardrail ')) {
			closeBlock();
			timeline.push({ type: 'guardrail', code: line.slice(22).replace(/\]$/, ''), timestamp: 0 });
		} else if (/^(Reasoning|Host event|Background task results received)/.test(line)) {
			closeBlock();
			block = { kind: 'other' };
		} else if (block?.kind === 'user' || block?.kind === 'assistant') {
			block.text += `\n${line}`;
		} else if (block?.kind === 'tool' && block.field) {
			block[block.field] += `\n${line}`;
		}
	}
	closeTurn();
	// A transcript cut before its closing tag ends inside a turn: that turn's
	// reply is unknown, so judging it would read a missing reply as an empty one.
	if (!complete) turns.pop();

	// Blank lines between turns end up at the end of the last block.
	return turns.map((turn) => ({
		...turn,
		userMessage: turn.userMessage.trimEnd(),
		reply: turn.reply.trimEnd(),
	}));
}
