import type { AgentDbMessage, ContentToolCall } from '@n8n/agents';

import { pruneSupersededArtifacts } from '../prune-superseded-artifacts';

type ResolvedToolCall = Extract<ContentToolCall, { state: 'resolved' }>;

// Large enough to clear the pruner's minimum-size guard.
const bigSkillContent = '#'.repeat(5000);

let seq = 0;

function toolCallMessage(toolName: string, input: unknown, output: unknown): AgentDbMessage {
	seq += 1;
	return {
		id: `msg-${seq}`,
		createdAt: new Date('2026-01-01T00:00:00Z'),
		role: 'assistant',
		content: [
			{
				type: 'tool-call',
				toolCallId: `call-${seq}`,
				toolName,
				input: input as ResolvedToolCall['input'],
				state: 'resolved',
				output: output as ResolvedToolCall['output'],
			},
		],
	};
}

function skillLoadMessage(skillId: string): AgentDbMessage {
	return toolCallMessage(
		'load_skill',
		{ skillId },
		{ ok: true, success: true, skillId, content: bigSkillContent },
	);
}

function firstBlock(message: AgentDbMessage): ResolvedToolCall {
	if (message.type === 'custom') throw new Error('custom message has no blocks');
	return message.content[0] as ResolvedToolCall;
}

describe('pruneSupersededArtifacts', () => {
	beforeEach(() => {
		seq = 0;
	});

	it('keeps a single load_skill result intact and stubs older duplicate loads', () => {
		const older = skillLoadMessage('workflow-builder');
		const newer = skillLoadMessage('workflow-builder');

		const single = pruneSupersededArtifacts([older]);
		expect(firstBlock(single[0]).output).toMatchObject({ ok: true });

		const result = pruneSupersededArtifacts([older, newer]);
		expect(firstBlock(result[0]).output).toMatchObject({
			superseded: true,
			artifact: 'skill:workflow-builder',
		});
		expect(firstBlock(result[1]).output).toMatchObject({ ok: true });
	});

	it('does not supersede loads of different skills', () => {
		const a = skillLoadMessage('workflow-builder');
		const b = skillLoadMessage('data-tables');

		const result = pruneSupersededArtifacts([a, b]);

		expect(firstBlock(result[0]).output).toMatchObject({ skillId: 'workflow-builder' });
		expect(firstBlock(result[1]).output).toMatchObject({ skillId: 'data-tables' });
	});

	it('leaves small load_skill results (e.g. errors) alone', () => {
		const failed = toolCallMessage(
			'load_skill',
			{ skillId: 'nope' },
			{ ok: false, success: false, skillId: 'nope', error: 'Unknown skill: nope' },
		);

		const result = pruneSupersededArtifacts([failed, skillLoadMessage('nope')]);

		expect(firstBlock(result[0]).output).toMatchObject({ ok: false });
	});

	it('ignores tools without a rule, even with large duplicate outputs', () => {
		const bigOutput = { id: 'wf-1', nodes: [{ parameters: { value: 'x'.repeat(2000) } }] };
		const older = toolCallMessage('workflows', { action: 'get-json' }, bigOutput);
		const newer = toolCallMessage('workflows', { action: 'get-json' }, bigOutput);

		const result = pruneSupersededArtifacts([older, newer]);

		expect(firstBlock(result[0]).output).toEqual(bigOutput);
		expect(firstBlock(result[1]).output).toEqual(bigOutput);
	});

	it('does not mutate the input messages', () => {
		const older = skillLoadMessage('workflow-builder');
		const newer = skillLoadMessage('workflow-builder');
		const snapshotBefore = JSON.stringify(older);

		pruneSupersededArtifacts([older, newer]);

		expect(JSON.stringify(older)).toBe(snapshotBefore);
	});

	it('returns untouched messages by reference and preserves ids and order', () => {
		const user: AgentDbMessage = {
			id: 'msg-user',
			createdAt: new Date('2026-01-01T00:00:00Z'),
			role: 'user',
			content: [{ type: 'text', text: 'build me a workflow' }],
		};
		const custom: AgentDbMessage = {
			id: 'msg-custom',
			createdAt: new Date('2026-01-01T00:00:00Z'),
			type: 'custom',
			data: { dummy: 'value' },
		};
		const older = skillLoadMessage('workflow-builder');
		const newer = skillLoadMessage('workflow-builder');

		const result = pruneSupersededArtifacts([user, custom, older, newer]);

		expect(result[0]).toBe(user);
		expect(result[1]).toBe(custom);
		expect(result[3]).toBe(newer);
		expect(result.map((m) => m.id)).toEqual(['msg-user', 'msg-custom', older.id, newer.id]);
	});

	it('returns the same array when nothing matches', () => {
		const user: AgentDbMessage = {
			id: 'msg-user',
			createdAt: new Date('2026-01-01T00:00:00Z'),
			role: 'user',
			content: [{ type: 'text', text: 'hello' }],
		};

		const messages = [user];
		expect(pruneSupersededArtifacts(messages)).toBe(messages);
	});

	it('replaces large inline file blocks with a text note and keeps small ones', () => {
		const withFiles: AgentDbMessage = {
			id: 'msg-files',
			createdAt: new Date('2026-01-01T00:00:00Z'),
			role: 'user',
			content: [
				{ type: 'text', text: 'see attached' },
				{ type: 'file', mediaType: 'image/png', data: 'A'.repeat(100_000) },
				{ type: 'file', mediaType: 'image/png', data: 'B'.repeat(100) },
			],
		};

		const result = pruneSupersededArtifacts([withFiles]);

		if (result[0].type === 'custom') throw new Error('unexpected custom message');
		const [text, bigFile, smallFile] = result[0].content;
		expect(text).toEqual({ type: 'text', text: 'see attached' });
		expect(bigFile).toMatchObject({ type: 'text' });
		if (bigFile.type !== 'text') throw new Error('expected text stub');
		expect(bigFile.text).toContain('image/png');
		expect(smallFile).toMatchObject({ type: 'file', data: 'B'.repeat(100) });
	});
});
