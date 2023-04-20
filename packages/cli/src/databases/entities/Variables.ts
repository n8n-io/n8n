import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Variables {
	@PrimaryGeneratedColumn()
	id: number;

	@Column('text')
	key: string;

	@Column('text', { default: 'string' })
	type: string;

	@Column('text')
	value: string;
}
