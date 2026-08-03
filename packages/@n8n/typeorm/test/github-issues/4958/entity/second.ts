import { Column, Entity } from '../../../../src';

@Entity({ name: 'second' })
export default class Testing {
	@Column('int', {
		nullable: false,
		primary: true,
		unique: true,
	})
	public notId!: number;
}
