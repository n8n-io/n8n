import {
	Entity,
	PrimaryGeneratedColumn,
	TableInheritance,
	Tree,
	TreeParent,
} from '../../../../src';
import type { NnaryOperator } from './NnaryOperator';

@Entity()
@TableInheritance({ pattern: 'STI', column: { type: 'varchar' } })
@Tree('closure-table')
export class OperatorTreeEntry {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@TreeParent()
	parent?: NnaryOperator;
}
