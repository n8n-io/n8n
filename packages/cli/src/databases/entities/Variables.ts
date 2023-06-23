import { BeforeInsert, Column, Entity, PrimaryColumn } from 'typeorm';
import { generateNanoId } from '../utils/generators';

@Entity()
export class Variables {
	@BeforeInsert()
	nanoId() {
		if (!this.id) {
			this.id = generateNanoId();
		}
	}

	@PrimaryColumn('varchar')
	id: string;

	@Column('text')
	key: string;

	@Column('text', { default: 'string' })
	type: string;

	@Column('text')
	value: string;
}
