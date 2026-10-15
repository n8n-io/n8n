import { ImapSimple } from '../src';
import { FakeImapServer } from './fake-imap-server';

describe('server with a broken IMAP4rev2 mode', () => {
	let server: FakeImapServer;
	let port: number;

	beforeEach(async () => {
		server = new FakeImapServer(false);
		server.brokenRev2Search = true;
		server.exists = 1;
		port = await server.listen();
	});

	afterEach(async () => await server.close());

	it('finds unseen mail', async () => {
		const connection = await ImapSimple.connect({
			host: '127.0.0.1',
			port,
			secure: false,
			user: 'user',
			password: 'password',
		});
		await connection.openBox('INBOX');

		const found = await connection.search({ seen: false }, { uid: true, flags: true });
		connection.end();

		expect(found.map((message) => message.uid)).toEqual([1]);
	});
});
