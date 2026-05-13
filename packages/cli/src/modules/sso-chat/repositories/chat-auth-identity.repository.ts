import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ChatAuthIdentity } from '../entities/chat-auth-identity';

@Service()
export class ChatAuthIdentityRepository extends Repository<ChatAuthIdentity> {
	constructor(dataSource: DataSource) {
		super(ChatAuthIdentity, dataSource.manager);
	}
}
