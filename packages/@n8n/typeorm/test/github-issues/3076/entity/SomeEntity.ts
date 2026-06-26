import { Column, PrimaryGeneratedColumn } from '../../../../src';
import { Entity } from '../../../../src';

export enum CreationMechanism {
	SOURCE_A = 'SOURCE_A',
	SOURCE_B = 'SOURCE_B',
	SOURCE_C = 'SOURCE_C',
	SOURCE_D = 'SOURCE_D',
}

@Entity({ name: 'some_entity', schema: 'some_schema' })
export class SomeEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		type: 'enum',
		enumName: 'creation_mechanism_enum',
		enum: CreationMechanism,
		default: CreationMechanism.SOURCE_A,
	})
	creationMechanism: CreationMechanism;

	@Column({ nullable: false, default: () => 'now()' })
	createdAt: Date;
}
