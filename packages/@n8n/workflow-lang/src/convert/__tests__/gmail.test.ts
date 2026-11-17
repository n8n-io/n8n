/**
 * The Gmail library node in the converter: the messages that the node writes (send, reply,
 * draft) link to the library, with the index of the item and the reply rule of the version.
 */
import { compile } from '../../compiler/index.ts';
import { convertWorkflow } from '../index.ts';

function workflow(parameters: Record<string, unknown>, typeVersion: number) {
	return {
		name: 'Gmail',
		nodes: [
			{
				name: 'Hook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'p' },
			},
			{
				name: 'Mail',
				type: 'n8n-nodes-base.gmail',
				typeVersion,
				position: [200, 0],
				parameters,
				credentials: { gmailOAuth2: { id: 'c1', name: 'Gmail' } },
			},
		],
		connections: { Hook: { main: [[{ node: 'Mail', type: 'main', index: 0 }]] } },
	};
}

const reply = {
	resource: 'message',
	operation: 'reply',
	messageId: '={{ $json.body.id }}',
	emailType: 'text',
	message: 'Thanks',
	options: {},
};

function converted(
	parameters: Record<string, unknown>,
	typeVersion: number,
	repeatRequestsInHost = false,
): string {
	const out = convertWorkflow(workflow(parameters, typeVersion), { repeatRequestsInHost });
	expect(out.ok).toBe(true);
	expect(compile(out.source).diagnostics).toEqual([]);
	return out.source;
}

describe('Gmail library node in the converter', () => {
	it('links a reply, with the reply rule of version 2.2', () => {
		const source = converted(reply, 2.2);
		expect(source).not.toContain("host: 'fallback'");
		expect(source).toContain('replyToHeader: true');
		expect(source).toContain('itemIndex');
	});

	it('links a reply of version 2.1 without the reply rule', () => {
		const source = converted(reply, 2.1);
		expect(source).not.toContain("host: 'fallback'");
		expect(source).not.toContain('replyToHeader');
	});

	it('links a reply to a thread and a draft', () => {
		expect(
			converted(
				{ ...reply, resource: 'thread', threadId: 't1', options: { ccList: 'c@x.io' } },
				2.1,
			),
		).not.toContain("host: 'fallback'");
		expect(
			converted(
				{
					resource: 'draft',
					operation: 'create',
					subject: 'Hello',
					message: '={{ $json.body.text }}',
					options: { sendTo: 'a@x.io', threadId: 't1' },
				},
				2.1,
			),
		).not.toContain("host: 'fallback'");
	});

	it('runs a draft with attachments in the host', () => {
		const attachments = { attachmentsUi: { attachmentsBinary: [{ property: 'data' }] } };
		expect(
			converted(
				{ resource: 'draft', operation: 'create', subject: 's', options: attachments },
				2.1,
			),
		).toContain("host: 'fallback'");
	});

	it('runs a read without "simplify" in the host, so that no request goes out twice', () => {
		for (const operation of ['get', 'getAll']) {
			const source = converted(
				{ resource: 'message', operation, messageId: 'm1', simple: false, options: {} },
				2.1,
			);
			expect(source).toContain("host: 'fallback'");
			expect(source).not.toContain('fileLimitInHost(error)');
		}
	});

	it('links a read without "simplify" when the caller accepts repeated requests', () => {
		for (const operation of ['get', 'getAll']) {
			const source = converted(
				{ resource: 'message', operation, messageId: 'm1', simple: false, options: {} },
				2.1,
				true,
			);
			expect(source).toContain('simple: false');
			expect(source).toContain('fileLimitInHost(error)');
			expect(source).toContain("host: 'fallback'");
		}
	});

	it('links a read with "simplify" without a host form', () => {
		const source = converted(
			{ resource: 'message', operation: 'get', messageId: 'm1', simple: true, options: {} },
			2.1,
		);
		expect(source).not.toContain("host: 'fallback'");
	});

	it('runs a read that downloads attachments in the host', () => {
		const source = converted(
			{
				resource: 'message',
				operation: 'get',
				messageId: 'm1',
				simple: false,
				options: { downloadAttachments: true },
			},
			2.1,
		);
		expect(source).toContain("host: 'fallback'");
		expect(source).not.toContain('fileLimitInHost(error)');
	});
});
