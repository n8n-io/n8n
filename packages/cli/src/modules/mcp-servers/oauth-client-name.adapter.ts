import { OAuthClientNamePort } from '@n8n/backend-module-mcp-servers';
import { Service } from '@n8n/di';

import { OAuthClientRepository } from '@/modules/oauth-server/database/repositories/oauth-client.repository';

/** Reads the name that an AI client gave in its OAuth registration, for example "Claude Code". */
@Service()
export class OAuthClientNameAdapter extends OAuthClientNamePort {
	constructor(private readonly clients: OAuthClientRepository) {
		super();
	}

	async getName(clientId: string): Promise<string | undefined> {
		const client = await this.clients.findById(clientId, {});
		return client?.name;
	}
}
