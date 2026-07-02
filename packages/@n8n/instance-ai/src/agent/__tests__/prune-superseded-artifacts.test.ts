import type { AgentDbMessage, ContentToolCall } from '@n8n/agents';

import { pruneSupersededArtifacts } from '../prune-superseded-artifacts';

type ResolvedToolCall = Extract<ContentToolCall, { state: 'resolved' }>;

// Large enough to clear the pruner's minimum-size guard.
const bigNodes = Array.from({ length: 20 }, (_, i) => ({
	id: `node-${i}`,
	name: `Node ${i}`,
	parameters: { value: 'x'.repeat(80) },
}));

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

function firstBlock(message: AgentDbMessage): ResolvedToolCall {
	if (message.type === 'custom') throw new Error('custom message has no blocks');
	return message.content[0] as ResolvedToolCall;
}

describe('pruneSupersededArtifacts', () => {
	beforeEach(() => {
		seq = 0;
	});

	it('stubs older workflow snapshots and keeps the latest one', () => {
		const older = toolCallMessage(
			'workflows',
			{ action: 'get-json' },
			{ id: 'wf-1', nodes: bigNodes },
		);
		const newer = toolCallMessage(
			'workflows',
			{ action: 'get-json' },
			{ id: 'wf-1', nodes: bigNodes },
		);

		const result = pruneSupersededArtifacts([older, newer]);

		expect(firstBlock(result[0]).output).toMatchObject({
			superseded: true,
			artifact: 'workflow:wf-1',
		});
		expect(firstBlock(result[1]).output).toEqual({ id: 'wf-1', nodes: bigNodes });
	});

	it('does not supersede snapshots of different workflows', () => {
		const a = toolCallMessage('workflows', { action: 'get-json' }, { id: 'wf-1', nodes: bigNodes });
		const b = toolCallMessage('workflows', { action: 'get-json' }, { id: 'wf-2', nodes: bigNodes });

		const result = pruneSupersededArtifacts([a, b]);

		expect(firstBlock(result[0]).output).toEqual({ id: 'wf-1', nodes: bigNodes });
		expect(firstBlock(result[1]).output).toEqual({ id: 'wf-2', nodes: bigNodes });
	});

	it('supersedes across representations (get-json then get-as-code) of the same workflow', () => {
		const json = toolCallMessage(
			'workflows',
			{ action: 'get-json' },
			{ id: 'wf-1', nodes: bigNodes },
		);
		const code = toolCallMessage(
			'workflows',
			{ action: 'get-as-code' },
			{ workflowId: 'wf-1', name: 'My workflow', code: 'workflow()'.repeat(200) },
		);

		const result = pruneSupersededArtifacts([json, code]);

		expect(firstBlock(result[0]).output).toMatchObject({ superseded: true });
		expect(firstBlock(result[1]).output).toMatchObject({ workflowId: 'wf-1' });
	});

	it('stubs older reads of the same file path and keeps the latest', () => {
		const older = toolCallMessage(
			'workspace_read_file',
			{ path: '/workspace/workflow.json' },
			{ content: '{}'.repeat(1000) },
		);
		const other = toolCallMessage(
			'workspace_read_file',
			{ path: '/workspace/other.md' },
			{ content: '#'.repeat(2000) },
		);
		const newer = toolCallMessage(
			'workspace_read_file',
			{ path: '/workspace/workflow.json' },
			{ content: '{"fresh":true}'.repeat(200) },
		);

		const result = pruneSupersededArtifacts([older, other, newer]);

		expect(firstBlock(result[0]).output).toMatchObject({
			superseded: true,
			artifact: 'file:/workspace/workflow.json',
		});
		expect(firstBlock(result[1]).output).toEqual({ content: '#'.repeat(2000) });
		expect(firstBlock(result[2]).output).toEqual({ content: '{"fresh":true}'.repeat(200) });
	});

	it('leaves small superseded outputs alone', () => {
		const older = toolCallMessage('workflows', { action: 'get-json' }, { id: 'wf-1', nodes: [] });
		const newer = toolCallMessage(
			'workflows',
			{ action: 'get-json' },
			{ id: 'wf-1', nodes: bigNodes },
		);

		const result = pruneSupersededArtifacts([older, newer]);

		expect(firstBlock(result[0]).output).toEqual({ id: 'wf-1', nodes: [] });
	});

	it('ignores non-snapshot workflows outputs (lists, errors) and other tools', () => {
		const list = toolCallMessage('workflows', { action: 'list' }, { workflows: bigNodes });
		const error = toolCallMessage(
			'workflows',
			{ action: 'get-json' },
			{ workflowId: 'wf-1', found: false, error: 'not found' },
		);
		const otherTool = toolCallMessage('executions', { action: 'list' }, { executions: bigNodes });
		const snapshot = toolCallMessage(
			'workflows',
			{ action: 'get-json' },
			{ id: 'wf-1', nodes: bigNodes },
		);

		const result = pruneSupersededArtifacts([list, error, otherTool, snapshot]);

		expect(firstBlock(result[0]).output).toEqual({ workflows: bigNodes });
		expect(firstBlock(result[1]).output).toEqual({
			workflowId: 'wf-1',
			found: false,
			error: 'not found',
		});
		expect(firstBlock(result[2]).output).toEqual({ executions: bigNodes });
		expect(firstBlock(result[3]).output).toEqual({ id: 'wf-1', nodes: bigNodes });
	});

	it('does not mutate the input messages', () => {
		const older = toolCallMessage(
			'workflows',
			{ action: 'get-json' },
			{ id: 'wf-1', nodes: bigNodes },
		);
		const newer = toolCallMessage(
			'workflows',
			{ action: 'get-json' },
			{ id: 'wf-1', nodes: bigNodes },
		);
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
		const older = toolCallMessage(
			'workflows',
			{ action: 'get-json' },
			{ id: 'wf-1', nodes: bigNodes },
		);
		const newer = toolCallMessage(
			'workflows',
			{ action: 'get-json' },
			{ id: 'wf-1', nodes: bigNodes },
		);

		const result = pruneSupersededArtifacts([user, custom, older, newer]);

		expect(result[0]).toBe(user);
		expect(result[1]).toBe(custom);
		expect(result[3]).toBe(newer);
		expect(result.map((m) => m.id)).toEqual(['msg-user', 'msg-custom', older.id, newer.id]);
	});

	it('unifies workflow-JSON file reads with workflows-tool snapshots of the same workflow', () => {
		const fileRead = toolCallMessage(
			'workspace_read_file',
			{ path: '/workspace/my.workflow.json' },
			{ content: JSON.stringify({ id: 'wf-1', name: 'WF', nodes: bigNodes, connections: {} }) },
		);
		const snapshot = toolCallMessage(
			'workflows',
			{ action: 'get-json' },
			{ id: 'wf-1', nodes: bigNodes },
		);

		const result = pruneSupersededArtifacts([fileRead, snapshot]);

		expect(firstBlock(result[0]).output).toMatchObject({
			superseded: true,
			artifact: 'workflow:wf-1',
		});
		expect(firstBlock(result[1]).output).toEqual({ id: 'wf-1', nodes: bigNodes });
	});

	it('keeps the path key for file reads that are not workflow JSON', () => {
		const readmeRead = toolCallMessage(
			'workspace_read_file',
			{ path: '/workspace/README.md' },
			{ content: '#'.repeat(2000) },
		);
		const snapshot = toolCallMessage(
			'workflows',
			{ action: 'get-json' },
			{ id: 'wf-1', nodes: bigNodes },
		);

		const result = pruneSupersededArtifacts([readmeRead, snapshot]);

		expect(firstBlock(result[0]).output).toEqual({ content: '#'.repeat(2000) });
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
});
