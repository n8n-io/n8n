import { Column, Entity, PrimaryColumn } from 'typeorm';
import { generateNanoId } from '../utils/generators';

@Entity()
export class Variables {
	@PrimaryColumn('varchar', { default: () => generateNanoId })
	id: string;

	@Column('text')
	key: string;

	@Column('text', { default: 'string' })
	type: string;

	@Column('text')
	value: string;
}
