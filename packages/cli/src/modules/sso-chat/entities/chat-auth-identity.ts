import { ChatProviderType } from '@/services/chat-authentication-proxy.service';
import { WithTimestamps } from '@n8n/db';
import { Column, Entity, PrimaryColumn, Unique } from '@n8n/typeorm';

@Entity()
@Unique(['providerId', 'providerType'])
export class ChatAuthIdentity extends WithTimestamps {
	@Column()
	userId: string;

	@PrimaryColumn({ length: 255 })
	providerId: string;

	@PrimaryColumn({ type: 'varchar' })
	providerType: ChatProviderType;
}
