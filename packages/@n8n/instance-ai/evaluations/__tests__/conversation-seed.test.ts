import {
	ConversationSeedSchema,
	expandSeedMessageShorthand,
	remapSeedWorkflowIds,
	SEED_WORKFLOW_NAME_RE,
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
		dataTables: [],
	};
}

describe('ConversationSeedSchema message envelope', () => {
	const message = (over: Record<string, unknown> = {}) => ({
		id: 'm1',
		role: 'user',
		type: 'llm',
		createdAt: '2026-01-01T00:00:00.000Z',
		content: [{ type: 'text', text: 'build it' }],
		...over,
	});
	const parse = (...messages: Array<Record<string, unknown>>) =>
		ConversationSeedSchema.safeParse({ messages });
	const errorOf = (result: ReturnType<typeof parse>) =>
		result.success ? '' : JSON.stringify(result.error.issues);

	it('accepts a well-formed message', () => {
		expect(parse(message()).success).toBe(true);
	});

	for (const field of ['id', 'role', 'type', 'createdAt', 'content'] as const) {
		it(`rejects a message missing ${field}`, () => {
			const broken = message();
			delete broken[field];
			const result = parse(broken);
			expect(result.success).toBe(false);
			expect(errorOf(result)).toContain(field);
		});
	}

	it('rejects a role the transcript builder would silently drop', () => {
		// The typo'd-role case: stored verbatim, then skipped by
		// transcriptPrefixFromSeed, so the case grades a transcript the agent never saw.
		const result = parse(message({ role: 'assistent' }));
		expect(result.success).toBe(false);
		expect(errorOf(result)).toContain('role');
	});

	it('rejects a createdAt that is not a real timestamp', () => {
		// Ordering before the live turn depends on this parsing.
		const result = parse(message({ createdAt: 'yesterday' }));
		expect(result.success).toBe(false);
		expect(errorOf(result)).toContain('createdAt');
	});

	it('rejects content that is not an array of blocks', () => {
		expect(parse(message({ content: 'build it' })).success).toBe(false);
		expect(parse(message({ content: [{ text: 'no type' }] })).success).toBe(false);
	});

	it('accepts an unknown block type — block shapes are the message store’s contract', () => {
		expect(parse(message({ content: [{ type: 'some-future-block', payload: {} }] })).success).toBe(
			true,
		);
	});

	it('accepts a custom message with no role and non-array content (stored, never rendered)', () => {
		const result = parse(
			{ id: 'c1', type: 'custom', data: { widget: 'card' }, createdAt: '2026-01-01T00:00:00Z' },
			message(),
		);
		expect(result.success).toBe(true);
	});

	it('preserves unknown keys on messages and blocks rather than stripping them', () => {
		// The load-bearing one: z.object strips unknown keys by default, which would
		// silently gut toolCallId/input/output from every tool call before restore.
		const result = ConversationSeedSchema.safeParse({
			messages: [
				message({
					messageGroupId: 'mg-1',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'tc-1',
							toolName: 'build-workflow',
							state: 'resolved',
							input: { name: 'Digest' },
							output: { success: true, workflowId: 'AbCdEf1234567890' },
						},
					],
				}),
			],
		});
		expect(result.success).toBe(true);
		if (!result.success) return;
		const [only] = result.data.messages;
		expect(only.messageGroupId).toBe('mg-1');
		expect(only.content?.[0]).toMatchObject({
			toolCallId: 'tc-1',
			toolName: 'build-workflow',
			state: 'resolved',
			input: { name: 'Digest' },
			output: { success: true, workflowId: 'AbCdEf1234567890' },
		});
	});

	it('accepts what the shorthand expansion produces', () => {
		// The case schema expands shorthand BEFORE this schema validates it, so an
		// expansion that stopped satisfying the envelope would fail every seed.
		const messages = expandSeedMessageShorthand([
			{ role: 'user', text: 'hi' },
			{ role: 'assistant', text: 'hello' },
		]);
		expect(ConversationSeedSchema.safeParse({ messages }).success).toBe(true);
	});

	it('still requires at least one message', () => {
		expect(ConversationSeedSchema.safeParse({ messages: [] }).success).toBe(false);
	});
});

describe('expandSeedMessageShorthand', () => {
	it('converts shorthand turns to llm text messages with ascending past timestamps', () => {
		const messages = expandSeedMessageShorthand([
			{ role: 'user', text: 'Digest to #cosmic-otter-alerts please' },
			{ role: 'assistant', text: 'Done — daily at 9am.' },
		]);

		expect(messages).toHaveLength(2);
		const [first, second] = messages as Array<Record<string, unknown>>;
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

	it('passes a full envelope through untouched', () => {
		const envelope = {
			id: 'm1',
			type: 'llm',
			role: 'assistant' as const,
			createdAt: '2026-06-29T09:00:00.000Z',
			content: [{ type: 'text', text: 'authored' }],
		};
		expect(expandSeedMessageShorthand([envelope])[0]).toBe(envelope);
	});

	it('leaves a near-miss shorthand alone so the envelope schema reports it', () => {
		// Expanding these would produce a message the transcript builder silently
		// drops; passing them through means the envelope schema rejects them loudly.
		const nearMisses = [
			{ role: 'user', text: 42 },
			{ role: 'system', text: 'hi' },
			{ role: 'user', text: 'hi', extra: true },
			{ role: 'user' },
		];
		expect(expandSeedMessageShorthand(nearMisses)).toEqual(nearMisses);
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
		const seed: ConversationSeed = {
			messages: [
				{
					id: 'm1',
					type: 'llm',
					role: 'user',
					createdAt: '2026-06-29T09:00:00.000Z',
					content: [{ type: 'text', text: 'hi' }],
				},
			],
			workflows: [],
			dataTables: [],
		};
		expect(remapSeedWorkflowIds(seed)).toBe(seed);
	});

	it('uniquifies the workflow NAME too, and follows it through the messages', () => {
		// A leftover copy sharing the name is a candidate the agent can ground on
		// instead. The seeded history has to move with the rename, or the agent's own
		// record of what it built stops matching the instance.
		const seed = makeSeed();
		seed.messages.push({
			id: 'm-name',
			type: 'llm',
			role: 'user',
			createdAt: '2026-06-29T09:00:02.000Z',
			content: [{ type: 'text', text: 'The Wait node in workflow Digest failed' }],
		});
		seed.workflows[0].name = 'Digest';

		const remapped = remapSeedWorkflowIds(seed);
		const newName = remapped.workflows[0].name;

		expect(newName).toMatch(/^Digest \[seed [0-9a-f]{8}\]$/);
		expect(SEED_WORKFLOW_NAME_RE.exec(newName)?.[1]).toBe('Digest');
		const mention = remapped.messages.find((m) => m.id === 'm-name');
		expect(JSON.stringify(mention)).toContain(`workflow ${newName} failed`);
	});

	it('does NOT rewrite opaque tool payloads — only prose and workflowName fields', () => {
		// A message's tool blocks carry recorded SDK source, expressions and arbitrary
		// results. A short workflow name like `Order` would otherwise rewrite a NODE
		// called `Order` inside that source, handing the agent prior context that
		// describes an artifact which never existed — the same integrity break the
		// `workflows[].nodes` exclusion prevents, one level in.
		const seed = makeSeed();
		seed.workflows[0].name = 'Order';
		seed.messages.push({
			id: 'm-tool',
			type: 'llm',
			role: 'assistant',
			createdAt: '2026-06-29T09:00:03.000Z',
			content: [
				{ type: 'text', text: 'Rebuilt Order for you' },
				{
					type: 'tool-call',
					toolCallId: 'tc-src',
					toolName: 'workspace_write',
					state: 'resolved',
					input: { path: 'wf.ts', source: "const n = wf.node('Order'); // Order stays" },
					output: { workflowName: 'Order', note: 'wrote Order to disk' },
				},
			],
		});

		const remapped = remapSeedWorkflowIds(seed);
		const newName = remapped.workflows[0].name;
		const block = (remapped.messages.find((m) => m.id === 'm-tool')?.content ?? []) as Array<
			Record<string, unknown>
		>;

		// Prose follows the rename...
		expect(block[0].text).toBe(`Rebuilt ${newName} for you`);
		// ...a field that explicitly holds a workflow name follows it...
		expect((block[1].output as Record<string, unknown>).workflowName).toBe(newName);
		// ...and the recorded source is untouched, node reference and all.
		expect((block[1].input as Record<string, unknown>).source).toBe(
			"const n = wf.node('Order'); // Order stays",
		);
		// A free-text payload field is not a workflow-name field either.
		expect((block[1].output as Record<string, unknown>).note).toBe('wrote Order to disk');
	});

	it('does NOT rename a node that happens to share the workflow name', () => {
		// A blanket replace would rewrite the node too, silently altering the restored
		// graph — the "structural skeleton unchanged" guard a seeded case relies on.
		const seed = makeSeed();
		seed.workflows[0].name = 'Digest';
		seed.workflows[0].nodes = [{ name: 'Digest', type: 'n8n-nodes-base.set' }];

		const remapped = remapSeedWorkflowIds(seed);

		expect(remapped.workflows[0].name).not.toBe('Digest');
		expect(remapped.workflows[0].nodes).toEqual([{ name: 'Digest', type: 'n8n-nodes-base.set' }]);
	});

	it('refuses a seed declaring two workflows with the same name', () => {
		// The rename would point every mention at the first one; and the agent could
		// not have told them apart either, so the seed is ambiguous as authored.
		const seed = makeSeed();
		seed.workflows.push({ ...seed.workflows[0], id: 'ZzZzZz9876543210' });

		expect(() => remapSeedWorkflowIds(seed)).toThrow(/two workflows named/);
	});

	// Renaming one workflow at a time would feed each rewrite into the next pass:
	// "Order" is rewritten first, so every "Order Sync" mention becomes
	// "Order [seed …] Sync" and no later pass matches it — the history would point
	// at a name that was never restored.
	it('renames overlapping workflow names without corrupting either mention', () => {
		const seed = makeSeed();
		seed.workflows[0].name = 'Order';
		seed.workflows.push({
			id: 'YyYyYy1234567890',
			name: 'Order Sync',
			nodes: [],
			connections: {},
		});
		seed.messages.push({
			id: 'm-names',
			type: 'llm',
			role: 'user',
			createdAt: '2026-06-29T09:00:03.000Z',
			content: [{ type: 'text', text: 'Order Sync feeds Order downstream' }],
		});

		const remapped = remapSeedWorkflowIds(seed);
		const [orderName, syncName] = remapped.workflows.map((w) => w.name);
		const mention = remapped.messages.find((m) => m.id === 'm-names');

		expect(orderName).toMatch(/^Order \[seed [0-9a-f]{8}\]$/);
		expect(syncName).toMatch(/^Order Sync \[seed [0-9a-f]{8}\]$/);
		// Each mention resolves to exactly one restored name.
		expect(JSON.stringify(mention)).toContain(`${syncName} feeds ${orderName} downstream`);
	});

	it('generates a distinct NAME per call, so two iterations never share one', () => {
		expect(remapSeedWorkflowIds(makeSeed()).workflows[0].name).not.toBe(
			remapSeedWorkflowIds(makeSeed()).workflows[0].name,
		);
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
