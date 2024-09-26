import { Column, Entity } from '@n8n/typeorm';

import { WithStringId } from './abstract-entity';

@Entity('variable')
export class Variables extends WithStringId {
	@Column('text')
	key: string;

	@Column('text', { default: 'string' })
	type: string;

	@Column('text')
	value: string;
}
