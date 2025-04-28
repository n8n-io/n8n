import { datetimeColumnType } from '@n8n/db';
import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

@Entity()
export class InvalidAuthToken {
	@PrimaryColumn()
	token: string;

	@Column(datetimeColumnType)
	expiresAt: Date;
}
