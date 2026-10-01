import { Column, Entity } from '../../../../src';

@Entity({ name: 'first' })
export default class Testing {
	@Column('int', {
		nullable: false,
		primary: true,
		unique: true,
	})
	public id!: number;
}
