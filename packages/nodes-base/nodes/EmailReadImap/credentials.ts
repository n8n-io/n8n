import type { ImapConnectionOptions } from '@n8n/imap';

import type { ICredentialsDataImap } from '@credentials/Imap.credentials';

/** v1 has no `allowUnauthorizedCerts` on the credential and takes it from a node option instead. */
export function toImapCredentials(
	credentials: ICredentialsDataImap,
	allowUnauthorizedCerts = false,
): ImapConnectionOptions {
	return {
		host: credentials.host,
		port: credentials.port,
		secure: credentials.secure,
		user: credentials.user,
		password: credentials.password,
		allowUnauthorizedCerts: credentials.allowUnauthorizedCerts || allowUnauthorizedCerts,
	};
}
