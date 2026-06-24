import { DeleteQueryBuilder } from './DeleteQueryBuilder';
import { InsertQueryBuilder } from './InsertQueryBuilder';
import { QueryBuilder } from './QueryBuilder';
import { RelationQueryBuilder } from './RelationQueryBuilder';
import { SelectQueryBuilder } from './SelectQueryBuilder';
import { SoftDeleteQueryBuilder } from './SoftDeleteQueryBuilder';
import { UpdateQueryBuilder } from './UpdateQueryBuilder';

export function registerQueryBuilders() {
	QueryBuilder.registerQueryBuilderClass(
		'DeleteQueryBuilder',
		(qb: QueryBuilder<any>) => new DeleteQueryBuilder(qb),
	);
	QueryBuilder.registerQueryBuilderClass(
		'InsertQueryBuilder',
		(qb: QueryBuilder<any>) => new InsertQueryBuilder(qb),
	);
	QueryBuilder.registerQueryBuilderClass(
		'RelationQueryBuilder',
		(qb: QueryBuilder<any>) => new RelationQueryBuilder(qb),
	);
	QueryBuilder.registerQueryBuilderClass(
		'SelectQueryBuilder',
		(qb: QueryBuilder<any>) => new SelectQueryBuilder(qb),
	);
	QueryBuilder.registerQueryBuilderClass(
		'SoftDeleteQueryBuilder',
		(qb: QueryBuilder<any>) => new SoftDeleteQueryBuilder(qb),
	);
	QueryBuilder.registerQueryBuilderClass(
		'UpdateQueryBuilder',
		(qb: QueryBuilder<any>) => new UpdateQueryBuilder(qb),
	);
}
