import { Column, Entity } from 'typeorm';
import { WithStringId } from './AbstractEntity';

@Entity()
export class Variables extends WithStringId {
	@Column('text')
	key: string;

	@Column('text', { default: 'string' })
	type: string;

	@Column('text')
	value: string;
}
