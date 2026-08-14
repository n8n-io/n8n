import { Column, Entity, PrimaryGeneratedColumn, TableInheritance } from '../../../../src';

@Entity('content')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export class Content {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;
}
