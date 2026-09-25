import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn,
	TableInheritance,
	UpdateDateColumn,
} from '../../../../src';

@Entity()
@TableInheritance({ column: { type: String, name: 'type' } })
export abstract class Base {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column()
	@Index('IX_Base_type')
	type!: string;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;
}
