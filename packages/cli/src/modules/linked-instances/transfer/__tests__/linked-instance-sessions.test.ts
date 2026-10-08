import { BadRequestError, NotFoundError } from '@n8n/errors';

import { CLOUD, expectRejection, user } from '../../__tests__/linked-instances.test-helpers';
import { LINK_NOT_FOUND_MESSAGE } from '../../linked-instances.service';
import { RemoteInstanceError } from '../../remote/remote-instance.errors';
import { TRANSFER_MESSAGES } from '../transfer-errors';
import { OPS, transferSetup } from './transfer.test-helpers';

async function sessionSetup() {
	const context = transferSetup();
	const alice = user();
	const link = await context.link(alice);
	const stored = await context.sessions.findLink(alice, link.id);
	return { ...context, alice, link, stored };
}

describe('LinkedInstanceSessions', () => {
	it('finds only the links of the user', async () => {
		const { sessions, alice, link } = await sessionSetup();

		expect((await sessions.findLink(alice, link.id)).summary).toMatchObject({
			id: link.id,
			name: 'Cloud',
			defaultRemoteProject: OPS,
		});
		await expectRejection(
			sessions.findLink(user(), link.id),
			NotFoundError,
			LINK_NOT_FOUND_MESSAGE,
		);
		await expectRejection(
			sessions.findLink(alice, 'not-a-uuid'),
			NotFoundError,
			LINK_NOT_FOUND_MESSAGE,
		);
	});

	it('connects with the stored token, probes, runs the work and closes the client', async () => {
		const { sessions, stored, link, client, clientFactory } = await sessionSetup();

		const result = await sessions.withSession(stored, 'push', async (session) => {
			expect(session.link).toEqual(stored.summary);
			expect([...session.toolNames]).toContain('import_workflow_package');
			expect(await session.callTool('list_credentials', { limit: 1 })).toEqual({
				data: [],
				count: 0,
			});
			return 'done';
		});

		expect(result).toBe('done');
		expect(clientFactory.create).toHaveBeenCalledWith({ origin: CLOUD, token: link.token });
		expect(client.callTool).toHaveBeenCalledWith('list_credentials', { limit: 1 });
		expect(client.probe).toHaveBeenCalledTimes(1);
		expect(client.close).toHaveBeenCalledTimes(1);
	});

	it('throws the reason of a failed probe and does not run the work', async () => {
		const { sessions, stored, client } = await sessionSetup();
		client.probe.mockResolvedValue({ ok: false, reason: 'unauthorised' });
		const work = vi.fn();

		const error = await sessions.withSession(stored, 'push', work).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(RemoteInstanceError);
		expect(error).toHaveProperty('reason', 'unauthorised');
		expect(work).not.toHaveBeenCalled();
		expect(client.close).toHaveBeenCalledTimes(1);
	});

	it('refuses an instance without the tool of the direction', async () => {
		const { sessions, stored, client } = await sessionSetup();
		client.probe.mockResolvedValue({ ok: true, toolNames: ['import_workflow_package'] });

		await expectRejection(
			sessions.withSession(stored, 'pull', vi.fn()),
			BadRequestError,
			TRANSFER_MESSAGES.cannotSend('Cloud'),
		);
		expect(client.close).toHaveBeenCalledTimes(1);
	});

	it('closes the client when the work fails', async () => {
		const { sessions, stored, client } = await sessionSetup();
		const failure = new Error('failed');

		await expect(
			sessions.withSession(stored, 'push', async () => {
				throw failure;
			}),
		).rejects.toBe(failure);
		expect(client.close).toHaveBeenCalledTimes(1);
	});

	it('cleans remote text: removes the token, folds lines and cuts it', async () => {
		const { sessions, stored, link } = await sessionSetup();

		await sessions.withSession(stored, 'push', async ({ clean }) => {
			expect(clean(`Token ${link.token} refused`)).toBe('Token [REDACTED] refused');
			expect(clean('One\nTwo\u0000Three‮')).toBe('One Two Three');
			expect(clean('   ')).toBe('');
			expect(clean('x'.repeat(600))).toHaveLength(500);
			expect(clean('x'.repeat(300), 255)).toHaveLength(255);
			expect(clean('short', 255)).toBe('short');
		});
	});

	it.each(['\u200B', '\u202E', '\u2066', '\uFEFF', '\u00AD'])(
		'removes a token that the instance splits with %j',
		async (mark) => {
			const { sessions, stored, link } = await sessionSetup();
			const split = `${link.token.slice(0, 6)}${mark}${link.token.slice(6)}`;

			await sessions.withSession(stored, 'push', async ({ clean }) => {
				expect(clean(`Token ${split} refused`)).toBe('Token [REDACTED] refused');
				expect(clean(`${split}${split}`, 255)).toBe('[REDACTED][REDACTED]');
			});
		},
	);

	it('cleans the text of a tool error before the work sees it', async () => {
		const { sessions, stored, link, client } = await sessionSetup();
		const split = `${link.token.slice(0, 6)}\u200B${link.token.slice(6)}`;
		client.callTool.mockRejectedValue(
			new RemoteInstanceError('tool-error', `Refused:\r\n${split}\u202E is\u2028invalid`),
		);

		const error = await sessions
			.withSession(stored, 'push', async (session) => await session.callTool('x', {}))
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(RemoteInstanceError);
		expect(error).toMatchObject({
			reason: 'tool-error',
			message: 'Refused: [REDACTED] is invalid',
		});
	});

	it('gives a tool error without visible text the default message', async () => {
		const { sessions, stored, client } = await sessionSetup();
		client.callTool.mockRejectedValue(new RemoteInstanceError('tool-error', '\u200B\u202E'));

		const error = await sessions
			.withSession(stored, 'push', async (session) => await session.callTool('x', {}))
			.catch((e: unknown) => e);

		expect(error).toMatchObject({
			reason: 'tool-error',
			message: 'The tool on the linked instance failed.',
		});
	});

	it('passes every other error of a tool call on as it is', async () => {
		const { sessions, stored, client } = await sessionSetup();
		const timeout = new RemoteInstanceError('timeout');
		const bug = new Error('bug\nwith a line');

		for (const failure of [timeout, bug]) {
			client.callTool.mockRejectedValueOnce(failure);
			await expect(
				sessions.withSession(stored, 'push', async (session) => await session.callTool('x', {})),
			).rejects.toBe(failure);
		}
	});
});
