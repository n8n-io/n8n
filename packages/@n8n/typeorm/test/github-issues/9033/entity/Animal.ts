import { Column, Entity, PrimaryGeneratedColumn, TableInheritance } from '../../../../src';

@Entity('animal')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class AnimalEntity {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: 'varchar' })
	name: string;

	@Column({
		name: 'type',
		type: 'varchar',
	})
	type: string;
}
