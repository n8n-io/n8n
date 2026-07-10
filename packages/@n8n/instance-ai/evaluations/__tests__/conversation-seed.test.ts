import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
	loadConversationSeed,
	remapSeedWorkflowIds,
	seedFromProse,
	transcriptPrefixFromSeed,
	type ConversationSeed,
} from '../harness/conversation-seed';

const WF_ID = 'AbCdEf1234567890';

function makeSeed(): ConversationSeed {
	return {
		source: { kind: 'thread-export', threadId: 'thread-1' },
		messages: [
			{
				id: 'msg-user',
				type: 'llm',
				role: 'user',
				content: [{ type: 'text', text: 'Send a daily digest to #cosmic-otter-alerts' }],
				createdAt: '2026-01-01T00:00:00.000Z',
			},
			{
				id: 'msg-assistant',
				type: 'llm',
				role: 'assistant',
				content: [
					{ type: 'text', text: 'Built it.' },
					{
						type: 'tool-call',
						toolCallId: 'tc-1',
						toolName: 'build-workflow',
						state: 'resolved',
						input: { workflowId: WF_ID },
						output: { success: true, workflowId: WF_ID, url: `/workflow/${WF_ID}` },
					},
				],
				createdAt: '2026-01-01T00:00:01.000Z',
			},
		],
		workflows: [{ id: WF_ID, name: 'Daily digest', nodes: [], connections: {} }],
	};
}

describe('loadConversationSeed', () => {
	const dir = mkdtempSync(join(tmpdir(), 'conversation-seed-'));

	it('loads and validates a seed file', () => {
		const path = join(dir, 'valid.seed.json');
		writeFileSync(path, JSON.stringify(makeSeed()));

		const seed = loadConversationSeed(path);
		expect(seed.messages).toHaveLength(2);
		expect(seed.workflows[0].id).toBe(WF_ID);
	});

	it('defaults workflows to an empty array', () => {
		const path = join(dir, 'no-workflows.seed.json');
		writeFileSync(path, JSON.stringify({ messages: [{ id: 'm1' }] }));

		expect(loadConversationSeed(path).workflows).toEqual([]);
	});

	it('rejects a seed without messages, naming the file', () => {
		const path = join(dir, 'empty.seed.json');
		writeFileSync(path, JSON.stringify({ messages: [] }));

		expect(() => loadConversationSeed(path)).toThrow(/Invalid conversation seed .*empty\.seed/);
	});

	it('rejects a missing file with a readable error', () => {
		expect(() => loadConversationSeed(join(dir, 'nope.seed.json'))).toThrow(
			/Failed to read conversation seed/,
		);
	});
});

describe('seedFromProse', () => {
	it('converts turns to llm text messages with ascending past timestamps', () => {
		const seed = seedFromProse([
			{ role: 'user', text: 'Digest to #cosmic-otter-alerts please' },
			{ role: 'assistant', text: 'Done — daily at 9am.' },
		]);

		expect(seed.workflows).toEqual([]);
		expect(seed.messages).toHaveLength(2);
		const [first, second] = seed.messages;
		expect(first).toMatchObject({
			type: 'llm',
			role: 'user',
			content: [{ type: 'text', text: 'Digest to #cosmic-otter-alerts please' }],
		});
		expect(first.id).not.toBe(second.id);

		const t0 = new Date(String(first.createdAt)).getTime();
		const t1 = new Date(String(second.createdAt)).getTime();
		expect(t1).toBeGreaterThan(t0);
		expect(t1).toBeLessThan(Date.now());
	});
});

describe('remapSeedWorkflowIds', () => {
	it('rewrites the workflow id and every reference to it across the seed', () => {
		const remapped = remapSeedWorkflowIds(makeSeed());

		const newId = remapped.workflows[0].id;
		expect(newId).not.toBe(WF_ID);
		expect(newId).toMatch(/^[0-9A-Za-z]{16}$/);

		const serialized = JSON.stringify(remapped);
		expect(serialized).not.toContain(WF_ID);
		// Tool-call input, output and canvas URL all moved to the fresh id.
		expect(serialized).toContain(`/workflow/${newId}`);
	});

	it('returns the seed untouched when there are no workflows', () => {
		const seed = seedFromProse([{ role: 'user', text: 'hi' }]);
		expect(remapSeedWorkflowIds(seed)).toBe(seed);
	});

	it('generates distinct ids per call so parallel iterations never collide', () => {
		const a = remapSeedWorkflowIds(makeSeed()).workflows[0].id;
		const b = remapSeedWorkflowIds(makeSeed()).workflows[0].id;
		expect(a).not.toBe(b);
	});

	it('refuses to remap a dangerously short workflow id', () => {
		const seed = makeSeed();
		seed.workflows[0].id = 'abc';
		expect(() => remapSeedWorkflowIds(seed)).toThrow(/too short to remap/);
	});
});

describe('transcriptPrefixFromSeed', () => {
	it('renders user text, assistant narration and tool calls as seeded turns', () => {
		const turns = transcriptPrefixFromSeed(makeSeed().messages);

		expect(turns).toHaveLength(1);
		expect(turns[0].seeded).toBe(true);
		expect(turns[0].userMessage).toBe('Send a daily digest to #cosmic-otter-alerts');
		expect(turns[0].steps).toEqual([
			{ kind: 'agent-text', text: 'Built it.' },
			{
				kind: 'tool-call',
				toolName: 'build-workflow',
				args: { workflowId: WF_ID },
				result: { success: true, workflowId: WF_ID, url: `/workflow/${WF_ID}` },
			},
		]);
	});

	it('renders a seeded ask-user block as an ask-user step with the chosen answers', () => {
		const turns = transcriptPrefixFromSeed([
			{
				id: 'a1',
				type: 'llm',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'ask-user',
						state: 'resolved',
						input: {
							introMessage: 'A couple of questions',
							questions: [{ id: 'q1', question: 'Which channel?', options: ['#growth', '#ops'] }],
						},
						// Resume block carries the user's answers in its output.
						output: {
							answered: true,
							answers: [{ questionId: 'q1', selectedOptions: ['#growth'], skipped: false }],
						},
					},
				],
				createdAt: '2026-01-01T00:00:00Z',
			},
		]);
		expect(turns[0].steps).toEqual([
			{
				kind: 'ask-user',
				questions: [{ id: 'q1', question: 'Which channel?', options: ['#growth', '#ops'] }],
				answers: [
					{ questionId: 'q1', selectedOptions: ['#growth'], customText: undefined, skipped: false },
				],
			},
		]);
	});

	it('renders a seeded setup-card block as a setup-card step from output.payload.setupRequests', () => {
		const turns = transcriptPrefixFromSeed([
			{
				id: 'a1',
				type: 'llm',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'workflows[setup]',
						state: 'resolved',
						input: { action: 'setup', workflowId: 'wf1' },
						output: {
							payload: {
								requestId: 'req1',
								setupRequests: [{ node: { name: 'Slack' }, credentialType: 'slackApi' }],
							},
						},
					},
				],
				createdAt: '2026-01-01T00:00:00Z',
			},
		]);
		expect(turns[0].steps).toEqual([
			{
				kind: 'setup-card',
				requests: [{ nodeName: 'Slack', credentialType: 'slackApi', params: undefined }],
				outcome: 'pending',
			},
		]);
	});

	it('renders a seeded confirmation block (not ask-user/setup) as a confirmation step', () => {
		const turns = transcriptPrefixFromSeed([
			{
				id: 'a1',
				type: 'llm',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'workflows',
						state: 'resolved',
						// Resume block re-states the request in input, decision in output.
						input: { resumeReason: 'resource-decision', message: 'Which credential?' },
						output: { approved: false, feedback: 'use the prod one' },
					},
				],
				createdAt: '2026-01-01T00:00:00Z',
			},
		]);
		expect(turns[0].steps).toEqual([
			{
				kind: 'confirmation',
				toolName: 'workflows',
				resumeReason: 'resource-decision',
				approved: false,
				message: 'Which credential?',
				feedback: 'use the prod one',
			},
		]);
	});

	it('renders a seeded setup outcome (completedNodes/skippedNodes) as a setup-wizard step', () => {
		const turns = transcriptPrefixFromSeed([
			{
				id: 'a1',
				type: 'llm',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'workflows[setup]',
						state: 'resolved',
						input: { action: 'setup', workflowId: 'wf1' },
						output: {
							success: true,
							completedNodes: [{ nodeName: 'Schedule', parametersSet: ['rule'] }],
							skippedNodes: [{ nodeName: 'Slack', credentialType: 'slackApi' }],
						},
					},
				],
				createdAt: '2026-01-01T00:00:00Z',
			},
		]);
		expect(turns[0].steps).toEqual([
			{
				kind: 'setup-wizard',
				completedNodes: [{ nodeName: 'Schedule', parametersSet: ['rule'] }],
				skippedNodes: [{ nodeName: 'Slack', credentialType: 'slackApi' }],
				reason: undefined,
			},
		]);
	});

	it('renders a seeded create-tasks block as a plan step', () => {
		const turns = transcriptPrefixFromSeed([
			{
				id: 'a1',
				type: 'llm',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'create-tasks',
						state: 'resolved',
						input: { tasks: [{ title: 'Add trigger', description: 'schedule' }] },
						output: {},
					},
				],
				createdAt: '2026-01-01T00:00:00Z',
			},
		]);
		expect(turns[0].steps).toEqual([
			{ kind: 'plan', tasks: [{ title: 'Add trigger', description: 'schedule' }] },
		]);
	});

	it('skips custom messages and tolerates a history starting with an assistant turn', () => {
		const turns = transcriptPrefixFromSeed([
			{ id: 'c1', type: 'custom', data: { widget: 'card' }, createdAt: '2026-01-01T00:00:00Z' },
			{
				id: 'a1',
				type: 'llm',
				role: 'assistant',
				content: [{ type: 'text', text: 'Picking up where we left off.' }],
				createdAt: '2026-01-01T00:00:01Z',
			},
		]);

		expect(turns).toHaveLength(1);
		expect(turns[0].userMessage).toBeUndefined();
		expect(turns[0].steps).toEqual([{ kind: 'agent-text', text: 'Picking up where we left off.' }]);
	});
});
