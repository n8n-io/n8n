import { Column, Entity, PrimaryColumn } from '@n8n/typeorm';

import { datetimeColumnType } from './abstract-entity';

@Entity()
export class InvalidAuthToken {
	@PrimaryColumn()
	token: string;

	@Column(datetimeColumnType)
	expiresAt: Date;
}
