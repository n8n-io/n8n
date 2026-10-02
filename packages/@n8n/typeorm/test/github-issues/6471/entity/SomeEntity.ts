import { Column, Unique, PrimaryGeneratedColumn } from '../../../../src';
import { Entity } from '../../../../src';

export enum CreationMechanism {
	SOURCE_A = 'SOURCE_A',
	SOURCE_B = 'SOURCE_B',
	SOURCE_C = 'SOURCE_C',
	SOURCE_D = 'SOURCE_D',
}

@Entity({ name: 'some_entity' })
@Unique(['field1', 'field2'])
export class SomeEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	field1: string;

	@Column()
	field2: string;

	@Column({
		type: 'enum',
		enumName: 'creation_mechanism_enum',
		enum: CreationMechanism,
	})
	creationMechanism: CreationMechanism;

	@Column({ nullable: false, default: () => 'now()' })
	createdAt: Date;
}
