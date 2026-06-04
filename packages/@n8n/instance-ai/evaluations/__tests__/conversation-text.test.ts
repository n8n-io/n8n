import type { TranscriptTurn } from '../types';
import { userTurnsAsText } from '../utils/conversation-text';

describe('userTurnsAsText', () => {
	it('returns empty string on empty transcript', () => {
		expect(userTurnsAsText([])).toBe('');
	});

	it('returns the lone user message as plain text on single-turn', () => {
		const transcript: TranscriptTurn[] = [
			{ userMessage: 'build a webhook', steps: [{ kind: 'agent-text', text: 'sure' }] },
		];
		expect(userTurnsAsText(transcript)).toBe('build a webhook');
	});

	it('numbers user turns on multi-turn and drops empty/agent-only turns', () => {
		const transcript: TranscriptTurn[] = [
			{ userMessage: 'build it', steps: [{ kind: 'agent-text', text: 'what kind?' }] },
			{ userMessage: undefined, steps: [{ kind: 'agent-text', text: 'thinking…' }] },
			{ userMessage: '', steps: [{ kind: 'agent-text', text: 'plan emitted' }] },
			{ userMessage: 'a webhook', steps: [{ kind: 'agent-text', text: 'done' }] },
		];
		expect(userTurnsAsText(transcript)).toBe('Turn 1: build it\n\nTurn 2: a webhook');
	});
});
