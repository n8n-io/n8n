import { WithStringId } from '@n8n/db';
import { Column, Entity } from '@n8n/typeorm';

@Entity()
export class Variables extends WithStringId {
	@Column('text')
	key: string;

	@Column('text', { default: 'string' })
	type: string;

	@Column('text')
	value: string;
}
