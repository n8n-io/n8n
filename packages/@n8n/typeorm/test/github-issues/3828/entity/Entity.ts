import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

enum MyEntityEnum {
	Something = 'SOMETHING',
	SomethingElse = 'SOMETHING_ELSE',
}

@Entity({ name: 'MyEntity' })
export class MyEntity {
	@PrimaryGeneratedColumn('uuid')
	id: number;

	@Column('enum', { enum: MyEntityEnum })
	myColumn: MyEntityEnum;
}
