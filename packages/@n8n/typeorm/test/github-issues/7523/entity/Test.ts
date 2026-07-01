import { Column, Entity, PrimaryGeneratedColumn } from '../../../../src';

enum FooEnum {
	FOO,
	BAR,
}

class ParentEntity {
	@PrimaryGeneratedColumn()
	ud: number;

	@Column({
		type: 'enum',
		enum: FooEnum,
		enumName: 'foo_enum',
	})
	foo: FooEnum;
}

@Entity()
export class ChildEntity1 extends ParentEntity {}

@Entity()
export class ChildEntity2 extends ParentEntity {}
