/**
 * The Gmail library node in the converter: the messages that the node writes (send, reply,
 * draft) link to the library, with the index of the item and the reply rule of the version.
 */
import { decodeModule } from '../../compiler/decode.ts';
import { compile } from '../../compiler/index.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
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

function converted(parameters: Record<string, unknown>, typeVersion: number): string {
	const out = convertWorkflow(workflow(parameters, typeVersion));
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

	it('links a read without "simplify", with a host form that gets the answers of the node', () => {
		for (const operation of ['get', 'getAll']) {
			const source = converted(
				{ resource: 'message', operation, messageId: 'm1', simple: false, options: {} },
				2.1,
			);
			expect(source).toContain('simple: false');
			expect(source).toContain('const mailReplay: Json = { list: [], bytes: 0, full: false };');
			expect(source).toContain('replay: mailReplay,');
			expect(source).toContain('fileLimitInHost(error)');
			expect(source).toContain("host: 'fallback'");
			expect(source).toContain('replay: mailReplay.list,');
		}
	});

	describe('a read without "simplify" that ends in the host', () => {
		const raw = (lines: string[]) =>
			Buffer.from(lines.join('\r\n'), 'utf8')
				.toString('base64')
				.replaceAll('+', '-')
				.replaceAll('/', '_');
		const head = ['From: a@x.io', 'To: b@x.io', 'Subject: Hello'];
		const answer = (id: string, contentType: string, size = 0) => ({
			status: 200,
			headers: { 'content-type': 'application/json; charset=UTF-8' },
			body: {
				id,
				threadId: `t-${id}`,
				labelIds: ['INBOX'],
				raw: raw([...head, `Content-Type: ${contentType}`, '', `Text${'x'.repeat(size)}`, '']),
			},
		});
		const PLAIN = 'text/plain; charset=utf-8';
		// The library node does not read this charset: the v1 node parses the message.
		const OTHER = 'text/plain; charset=koi8-r';
		const FROM_HOST = [
			{ id: 'm1', host: true },
			{ id: 'm2', host: true },
		];

		async function run(answers: unknown[]) {
			const flow = workflow(
				{ resource: 'message', operation: 'get', messageId: '={{ $json.id }}', simple: false },
				2.2,
			);
			flow.nodes.splice(1, 0, {
				name: 'Split',
				type: 'n8n-nodes-base.splitOut',
				typeVersion: 1,
				position: [100, 0],
				parameters: { fieldToSplitOut: 'body.list' },
			} as never);
			Object.assign(flow.connections, {
				Hook: { main: [[{ node: 'Split', type: 'main', index: 0 }]] },
				Split: { main: [[{ node: 'Mail', type: 'main', index: 0 }]] },
			});
			const out = convertWorkflow(flow);
			expect(out.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
			const compiled = compile(out.source);
			expect(compiled.diagnostics).toEqual([]);
			const fixture = {
				trigger: { body: { list: [{ id: 'm1' }, { id: 'm2' }] }, headers: {}, query: {} },
				now: 0,
				seed: 1,
				effects: { Mail: answers, 'Mail (fallback host)': [FROM_HOST] },
			};
			const reference = await runReference(out.source, fixture);
			const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), fixture);
			expect(JSON.stringify(bytecode)).toBe(JSON.stringify(reference));
			const host = reference.effects.find((effect) => effect.step === 'Mail (fallback host)');
			return {
				status: reference.status,
				result: reference.result as Record<string, unknown>,
				requests: reference.effects.filter((effect) => effect.kind === 'http').length,
				hostArgs: host?.args as { replay?: unknown[] } | undefined,
			};
		}

		it('parses the messages itself when it reads them as v1 does', async () => {
			const out = await run([answer('m1', PLAIN), answer('m2', PLAIN)]);
			expect(out.status).toBe('ok');
			expect(out.requests).toBe(2);
			expect(out.hostArgs).toBeUndefined();
			expect(out.result.Mail).toMatchObject([{ id: 'm1' }, { id: 'm2' }]);
		});

		it('gives the host the answers of all its requests, in order', async () => {
			const answers = [answer('m1', PLAIN), answer('m2', OTHER)];
			const out = await run(answers);
			expect(out.status).toBe('ok');
			// The library node sent two requests. The host gets both answers, so the v1 node sends none.
			expect(out.requests).toBe(2);
			expect(out.result.Mail).toEqual(FROM_HOST);
			const url = 'https://www.googleapis.com/gmail/v1/users/me/messages/';
			expect(out.hostArgs?.replay).toEqual([
				{ method: 'GET', url: `${url}m1`, qs: { format: 'raw' }, response: answers[0] },
				{ method: 'GET', url: `${url}m2`, qs: { format: 'raw' }, response: answers[1] },
			]);
		});

		it('gives the host no answers when they are larger than the limit of the list', async () => {
			const out = await run([answer('m1', PLAIN, 7 * 1024 * 1024), answer('m2', OTHER)]);
			expect(out.status).toBe('ok');
			expect(out.result.Mail).toEqual(FROM_HOST);
			expect(out.hostArgs?.replay).toEqual([]);
		});
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
