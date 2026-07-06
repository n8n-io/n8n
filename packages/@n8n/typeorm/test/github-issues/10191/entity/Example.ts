import { Column, Entity, Index, PrimaryGeneratedColumn } from '../../../../src';

@Entity()
@Index(['nonNullable', 'nullable'], {
	unique: true,
	where: '"nullable" IS NOT NULL',
})
export class Example {
	@PrimaryGeneratedColumn('uuid')
	id?: string;

	@Column({ type: 'text' })
	nonNullable: string;

	@Column({ type: 'text', nullable: true })
	nullable: string | null;

	@Column({ type: 'text' })
	value: string;
}
