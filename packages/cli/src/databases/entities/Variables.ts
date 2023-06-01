import { BeforeInsert, Column, Entity, PrimaryColumn } from 'typeorm';
import { generateNanoId } from '../utils/generators';

@Entity()
export class Variables {
	constructor(data?: Partial<Variables>) {
		Object.assign(this, data);
		if (!this.id) {
			this.id = generateNanoId();
		}
	}

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
