import { Column, Entity, PrimaryColumn } from '../../../../src';

@Entity()
export class FamilyMember {
	@PrimaryColumn()
	name: string;

	@Column({
		default: 'PERSON',
	})
	type: string;
}

@Entity()
export class Dog extends FamilyMember {
	@PrimaryColumn()
	name: string;

	@Column({
		default: 'PET',
	})
	type: string;
}
