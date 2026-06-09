import type { TranscriptTurn } from '../types';
import { transcriptAsText, userTurnsAsText } from '../utils/conversation-text';

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

describe('transcriptAsText', () => {
	it('surfaces tool-call args and result so the judge sees what each call did', () => {
		const transcript: TranscriptTurn[] = [
			{
				userMessage: 'fetch the rows',
				steps: [
					{
						kind: 'tool-call',
						toolName: 'add-nodes',
						args: { nodeType: 'n8n-nodes-base.httpRequest' },
						result: { added: 1 },
					},
				],
			},
		];
		const text = transcriptAsText(transcript);
		expect(text).toContain('Tool: add-nodes');
		expect(text).toContain('n8n-nodes-base.httpRequest');
		expect(text).toContain('"added":1');
	});

	it('prefers the error over the result and caps long fields', () => {
		const transcript: TranscriptTurn[] = [
			{
				steps: [
					{
						kind: 'tool-call',
						toolName: 'httpRequest',
						args: { url: 'x'.repeat(5000) },
						error: 'boom',
					},
				],
			},
		];
		const text = transcriptAsText(transcript);
		expect(text).toContain('error: boom');
		expect(text).not.toContain('result:');
		expect(text).toContain('more chars)');
	});
});
