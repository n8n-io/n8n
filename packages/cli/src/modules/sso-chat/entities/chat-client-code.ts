import { ChatProviderType } from '@/services/chat-authentication-proxy.service';
import { WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

@Entity()
export class ChatClientCode extends WithTimestamps {
	@Column()
	expiresAt: Date;

	@Column()
	codeHash: string;

	@PrimaryColumn({ length: 255 })
	providerId: string;

	@PrimaryColumn({ type: 'varchar' })
	providerType: ChatProviderType;
}
