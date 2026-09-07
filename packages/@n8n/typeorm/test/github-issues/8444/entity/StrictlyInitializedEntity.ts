import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
export class StrictlyInitializedEntity {
	@PrimaryGeneratedColumn()
	id?: number;

	@Column()
	readonly someColumn: string;

	constructor(someColumn: string) {
		if (someColumn === undefined) {
			throw new Error('someColumn cannot be undefined.');
		}

		this.someColumn = someColumn;
	}
}
