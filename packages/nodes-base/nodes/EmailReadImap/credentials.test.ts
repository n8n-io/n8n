import type { ICredentialsDataImap } from '@credentials/Imap.credentials';

import { toImapCredentials } from './credentials';

describe('toImapCredentials', () => {
	const credentials = (allowUnauthorizedCerts: boolean): ICredentialsDataImap => ({
		host: 'imap.test.com',
		port: 993,
		user: 'user',
		password: 'password',
		secure: true,
		allowUnauthorizedCerts,
	});

	it('maps the credential fields to connection options', () => {
		expect(toImapCredentials(credentials(false))).toEqual({
			host: 'imap.test.com',
			port: 993,
			user: 'user',
			password: 'password',
			secure: true,
			allowUnauthorizedCerts: false,
		});
	});

	it.each([true, false])(
		'uses the credential flag (%s) when no override is given',
		(allowUnauthorizedCerts) => {
			expect(toImapCredentials(credentials(allowUnauthorizedCerts))).toHaveProperty(
				'allowUnauthorizedCerts',
				allowUnauthorizedCerts,
			);
		},
	);

	it('lets an override of false win over a credential flag of true', () => {
		expect(toImapCredentials(credentials(true), false)).toHaveProperty(
			'allowUnauthorizedCerts',
			false,
		);
	});

	it('lets an override of true win over a credential flag of false', () => {
		expect(toImapCredentials(credentials(false), true)).toHaveProperty(
			'allowUnauthorizedCerts',
			true,
		);
	});
});
