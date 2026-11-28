import { createHash } from 'node:crypto';

import { getCreatedAt } from '../../sdk/message';
import type { AgentDbMessage } from '../../types/sdk/message';

const MAX_INDEX_CHARS = 1_024;
const HEADER =
	'<compacted-tool-calls>\nRecent calls in compacted history. Use the reference in the toolCallRef field of read_history to inspect a result. A returned result does not imply success.';
const FOOTER = '</compacted-tool-calls>';
const OMISSION_NOTICE =
	'Older compacted calls were omitted. Use read_history text search before repeating a check.';

// Only identifiers enter prompt metadata. Inputs, outputs and free text stay in history.
const IDENTIFIER = /^[a-zA-Z0-9_.:-]{1,128}$/;

/** Tool-call order stays stable when the runtime removes reasoning blocks. */
export function historyToolCallRef(messageId: string, callOrdinal: number): string {
	return createHash('sha256')
		.update(messageId)
		.update(':')
		.update(String(callOrdinal))
		.digest('base64url');
}

/** Keep the newest settled calls that fit the index budget. */
export function collectCompactedToolCalls(
	messages: readonly AgentDbMessage[],
	earlier: string[] = [],
): string[] {
	const lines: string[] = [];
	let remaining = MAX_INDEX_CHARS - HEADER.length - FOOTER.length - 1;
	const add = (line: string) => {
		const cost = line.length + 1;
		if (cost > remaining) return false;
		remaining -= cost;
		lines.push(line);
		return true;
	};
	const markOmitted = () => {
		const cost = OMISSION_NOTICE.length + 1;
		for (let i = lines.length - 1; remaining < cost && i >= 0; i--) {
			remaining += lines[i].length + 1;
			lines.pop();
		}
		return [...lines, OMISSION_NOTICE];
	};

	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];
		if (!('role' in message) || message.role !== 'assistant') continue;
		const calls = message.content.filter((block) => block.type === 'tool-call');
		for (let j = calls.length - 1; j >= 0; j--) {
			const block = calls[j];
			if (block.state === 'pending') continue;
			const state =
				block.state === 'rejected' ? 'rejected' : block.canceled ? 'canceled' : 'returned';
			const createdAt = getCreatedAt(message);
			const timestamp =
				createdAt && Number.isFinite(createdAt.getTime()) ? createdAt.toISOString() : undefined;
			const name = IDENTIFIER.test(block.toolName) ? block.toolName : 'tool';
			const line = [name, historyToolCallRef(message.id, j), state, timestamp]
				.filter(Boolean)
				.join(' ');
			if (!add(line)) return markOmitted();
		}
	}
	// Carry forward omissions as well as references when the index is restored or extended.
	for (const line of earlier) {
		if (line === OMISSION_NOTICE || !add(line)) return markOmitted();
	}
	return lines;
}

export function renderCompactedToolCalls(lines: string[]): string | undefined {
	if (lines.length) return [HEADER, ...lines, FOOTER].join('\n');
	return undefined;
}
