import { DateTimeColumn } from '@n8n/db';
import { Entity, PrimaryColumn } from '@n8n/typeorm';

@Entity('token_exchange_jti')
export class TokenExchangeJti {
	@PrimaryColumn({ type: 'varchar', length: 255 })
	jti: string;

	@DateTimeColumn()
	expiresAt: Date;

	@DateTimeColumn()
	createdAt: Date;
}
