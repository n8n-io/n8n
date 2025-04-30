import { DateTimeColumn } from '@n8n/db';
import { Entity, PrimaryColumn } from '@n8n/typeorm';

@Entity()
export class InvalidAuthToken {
	@PrimaryColumn()
	token: string;

	@DateTimeColumn()
	expiresAt: Date;
}
