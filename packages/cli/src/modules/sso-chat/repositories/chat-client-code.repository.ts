import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { ChatClientCode } from '../entities/chat-client-code';

@Service()
export class ChatClientCodeRepository extends Repository<ChatClientCode> {
	constructor(dataSource: DataSource) {
		super(ChatClientCode, dataSource.manager);
	}
}
