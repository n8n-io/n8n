import {
	buildDailyInboxDigestWorkflow,
	DEFAULT_DIGEST_OPTIONS,
	type DigestNodeNames,
} from './dailyInboxDigest';

const NAMES: DigestNodeNames = {
	trigger: 'Every day at 8:00 AM',
	read: 'Get unread emails',
	build: 'Group by priority',
	send: 'Email me the digest',
};

const build = (overrides: Partial<typeof DEFAULT_DIGEST_OPTIONS> = {}) =>
	buildDailyInboxDigestWorkflow(
		{
			...DEFAULT_DIGEST_OPTIONS,
			recipientEmail: 'me@example.com',
			...overrides,
		},
		NAMES,
	);

const nodeTypes = (workflow: ReturnType<typeof build>) =>
	workflow.nodes?.map((node) => node.type) ?? [];

describe('buildDailyInboxDigestWorkflow', () => {
	it('chains the schedule, the mailbox, the digest and the delivery', () => {
		const workflow = build();

		expect(workflow.nodes?.map((node) => node.name)).toEqual([
			'Every day at 8:00 AM',
			'Get unread emails',
			'Group by priority',
			'Email me the digest',
		]);
		expect(workflow.connections).toEqual({
			'Every day at 8:00 AM': { main: [[{ node: 'Get unread emails', type: 'main', index: 0 }]] },
			'Get unread emails': { main: [[{ node: 'Group by priority', type: 'main', index: 0 }]] },
			'Group by priority': { main: [[{ node: 'Email me the digest', type: 'main', index: 0 }]] },
		});
	});

	it('runs every day at the chosen time by default', () => {
		const trigger = build({ hour: 18, minute: 30 }).nodes?.[0];

		expect(trigger?.parameters).toEqual({
			rule: { interval: [{ field: 'days', triggerAtHour: 18, triggerAtMinute: 30 }] },
		});
	});

	it('runs Monday to Friday for weekdays only', () => {
		const trigger = build({ weekdaysOnly: true }).nodes?.[0];

		expect(trigger?.parameters).toEqual({
			rule: {
				interval: [
					{ field: 'weeks', triggerAtDay: [1, 2, 3, 4, 5], triggerAtHour: 8, triggerAtMinute: 0 },
				],
			},
		});
	});

	it.each([
		{
			provider: 'gmail' as const,
			types: [
				'n8n-nodes-base.scheduleTrigger',
				'n8n-nodes-base.gmail',
				'n8n-nodes-base.set',
				'n8n-nodes-base.gmail',
			],
		},
		{
			provider: 'outlook' as const,
			types: [
				'n8n-nodes-base.scheduleTrigger',
				'n8n-nodes-base.microsoftOutlook',
				'n8n-nodes-base.set',
				'n8n-nodes-base.microsoftOutlook',
			],
		},
	])('reads and sends the digest with $provider', ({ provider, types }) => {
		expect(nodeTypes(build({ provider }))).toEqual(types);
	});

	it('sends an email digest to the recipient', () => {
		const send = build().nodes?.at(-1);

		expect(send?.parameters).toMatchObject({ operation: 'send', sendTo: 'me@example.com' });
	});

	it('keeps the connections in step with renamed nodes', () => {
		const workflow = buildDailyInboxDigestWorkflow(DEFAULT_DIGEST_OPTIONS, {
			trigger: 'Weekdays at 6:00 PM',
			read: 'Read',
			build: 'Build',
			send: 'Send',
		});

		expect(Object.keys(workflow.connections ?? {})).toEqual([
			'Weekdays at 6:00 PM',
			'Read',
			'Build',
		]);
	});

	it('sets the parameters that node subtitles show, because the canvas fills no defaults', () => {
		const [, read, digest] = build().nodes ?? [];

		expect(read?.parameters).toMatchObject({ resource: 'message', operation: 'getAll' });
		expect(digest?.parameters).toMatchObject({ mode: 'manual' });
	});

	describe('with a connected mailbox', () => {
		const mailboxCredential = { id: 'cred-1', name: 'Gmail account' };

		it('gives the nodes that use the mailbox its credential', () => {
			const [, read, , send] = build({ mailboxCredential }).nodes ?? [];

			expect(read?.credentials).toEqual({ gmailOAuth2: mailboxCredential });
			expect(send?.credentials).toEqual({ gmailOAuth2: mailboxCredential });
		});

		it('uses the credential type of the chosen provider', () => {
			const [, read] = build({ provider: 'outlook', mailboxCredential }).nodes ?? [];

			expect(read?.credentials).toEqual({ microsoftOutlookOAuth2Api: mailboxCredential });
		});

		it('sets no credential before the mailbox is connected', () => {
			const nodes = build().nodes ?? [];

			expect(nodes.every((node) => node.credentials === undefined)).toBe(true);
		});
	});

	it('gives every node a distinct id', () => {
		const ids = build().nodes?.map((node) => node.id) ?? [];

		expect(new Set(ids).size).toBe(ids.length);
	});
});
