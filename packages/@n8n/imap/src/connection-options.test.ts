import { AUTH_TIMEOUT, toImapOptions, type ImapConnectionOptions } from './connection-options';

const credentials: ImapConnectionOptions = {
	host: 'imap.example.com',
	port: 993,
	secure: true,
	user: 'someone',
	password: 'secret',
};

describe('toImapOptions', () => {
	it('maps the credential onto node-imap options', () => {
		expect(toImapOptions(credentials)).toEqual({
			host: 'imap.example.com',
			port: 993,
			tls: true,
			user: 'someone',
			password: 'secret',
			authTimeout: AUTH_TIMEOUT,
			tlsOptions: { servername: 'imap.example.com' },
		});
	});

	it('trims the host, and names it as the TLS server', () => {
		const options = toImapOptions({ ...credentials, host: '  imap.example.com  ' });

		expect(options.host).toBe('imap.example.com');
		expect(options.tlsOptions).toEqual({ servername: 'imap.example.com' });
	});

	it('carries no TLS options over a plain connection', () => {
		expect(toImapOptions({ ...credentials, secure: false })).not.toHaveProperty('tlsOptions');
	});

	it('accepts an untrusted certificate only when asked to', () => {
		const options = toImapOptions({ ...credentials, allowUnauthorizedCerts: true });

		expect(options.tlsOptions).toEqual({
			rejectUnauthorized: false,
			servername: 'imap.example.com',
		});
	});

	it('honours a caller-supplied auth timeout', () => {
		expect(toImapOptions({ ...credentials, authTimeout: 5_000 }).authTimeout).toBe(5_000);
	});
});
