import { Entity, PrimaryGeneratedColumn, TableInheritance } from '../../../../src/index';

@Entity()
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class Log {
	@PrimaryGeneratedColumn('increment')
	id: number;
}
