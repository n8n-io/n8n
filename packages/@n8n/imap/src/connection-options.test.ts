import { toImapFlowOptions, type ImapConnectionOptions } from './connection-options';

const CREDENTIALS: ImapConnectionOptions = {
	host: 'imap.test.com',
	port: 993,
	secure: true,
	user: 'user',
	password: 'password',
};

describe('toImapFlowOptions', () => {
	it('carries the credentials over', () => {
		expect(toImapFlowOptions(CREDENTIALS)).toMatchObject({
			host: 'imap.test.com',
			port: 993,
			secure: true,
			auth: { user: 'user', pass: 'password' },
		});
	});

	it('trims a host a user pasted with whitespace', () => {
		expect(toImapFlowOptions({ ...CREDENTIALS, host: '  imap.test.com \n' })).toMatchObject({
			host: 'imap.test.com',
			tls: { servername: 'imap.test.com' },
		});
	});

	// Without these a wedged connection is never detected, which is the whole point of the driver's
	// socket timeout — so they are defaults here rather than something a caller has to remember.
	it('watches for inactivity by default', () => {
		const { maxIdleTime, socketTimeout } = toImapFlowOptions(CREDENTIALS);

		expect(maxIdleTime).toBeGreaterThan(0);
		expect(socketTimeout).toBeGreaterThan(0);
	});

	it('lets a caller tune the timeouts', () => {
		expect(
			toImapFlowOptions({ ...CREDENTIALS, maxIdleTime: 1_000, socketTimeout: 2_000 }),
		).toMatchObject({ maxIdleTime: 1_000, socketTimeout: 2_000 });
	});

	it('never upgrades a plain connection in place', () => {
		expect(toImapFlowOptions({ ...CREDENTIALS, secure: false })).toMatchObject({
			secure: false,
			doSTARTTLS: false,
		});
	});

	it('names the server for TLS so the certificate can be checked against it', () => {
		expect(toImapFlowOptions(CREDENTIALS).tls).toEqual({ servername: 'imap.test.com' });
	});

	it.each(['127.0.0.1', '::1'])(
		'does not name %s as the server, since node rejects an IP',
		(host) => {
			expect(toImapFlowOptions({ ...CREDENTIALS, host }).tls).toBeUndefined();
		},
	);

	it('leaves TLS options off a plain connection', () => {
		expect(toImapFlowOptions({ ...CREDENTIALS, secure: false }).tls).toBeUndefined();
	});

	it('accepts an unauthorized certificate only when asked to', () => {
		expect(toImapFlowOptions({ ...CREDENTIALS, allowUnauthorizedCerts: true }).tls).toMatchObject({
			rejectUnauthorized: false,
		});
	});
});
