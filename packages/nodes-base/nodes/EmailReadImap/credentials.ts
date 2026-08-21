import type { ImapConnectionOptions } from '@n8n/imap';

import type { ICredentialsDataImap } from '@credentials/Imap.credentials';

/** v1 governs certificate validation through its own node option, which overrides the credential. */
export function toImapCredentials(
	credentials: ICredentialsDataImap,
	allowUnauthorizedCerts?: boolean,
): ImapConnectionOptions {
	return {
		host: credentials.host,
		port: credentials.port,
		secure: credentials.secure,
		user: credentials.user,
		password: credentials.password,
		allowUnauthorizedCerts: allowUnauthorizedCerts ?? credentials.allowUnauthorizedCerts,
	};
}
