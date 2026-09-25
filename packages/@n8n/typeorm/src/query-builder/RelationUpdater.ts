import { QueryBuilder } from './QueryBuilder';
import { ObjectLiteral } from '../common/ObjectLiteral';
import { QueryExpressionMap } from './QueryExpressionMap';
import { TypeORMError } from '../error';
import { ObjectUtils } from '../util/ObjectUtils';

/**
 * Allows to work with entity relations and perform specific operations with those relations.
 *
 * todo: add transactions everywhere
 */
export class RelationUpdater {
	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(
		protected queryBuilder: QueryBuilder<any>,
		protected expressionMap: QueryExpressionMap,
	) {}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Performs set or add operation on a relation.
	 */
	async update(value: any | any[]): Promise<void> {
		const relation = this.expressionMap.relationMetadata;

		if (relation.isManyToOne || relation.isOneToOneOwner) {
			const updateSet = relation.joinColumns.reduce((updateSet, joinColumn) => {
				const relationValue = ObjectUtils.isObject(value)
					? joinColumn.referencedColumn!.getEntityValue(value)
					: value;
				joinColumn.setEntityValue(updateSet, relationValue);
				return updateSet;
			}, {} as any);

			if (
				!this.expressionMap.of ||
				(Array.isArray(this.expressionMap.of) && !this.expressionMap.of.length)
			)
				return;

			await this.queryBuilder
				.createQueryBuilder()
				.update(relation.entityMetadata.target)
				.set(updateSet)
				.whereInIds(this.expressionMap.of)
				.execute();
		} else if ((relation.isOneToOneNotOwner || relation.isOneToMany) && value === null) {
			// we handle null a bit different way

			const updateSet: ObjectLiteral = {};
			relation.inverseRelation!.joinColumns.forEach((column) => {
				updateSet[column.propertyName] = null;
			});

			const ofs = Array.isArray(this.expressionMap.of)
				? this.expressionMap.of
				: [this.expressionMap.of];
			const parameters: ObjectLiteral = {};
			const conditions: string[] = [];
			ofs.forEach((of, ofIndex) => {
				relation.inverseRelation!.joinColumns.map((column, columnIndex) => {
					const parameterName = 'joinColumn_' + ofIndex + '_' + columnIndex;
					parameters[parameterName] = ObjectUtils.isObject(of)
						? column.referencedColumn!.getEntityValue(of)
						: of;
					conditions.push(`${column.propertyPath} = :${parameterName}`);
				});
			});
			const condition = conditions.map((str) => '(' + str + ')').join(' OR ');
			if (!condition) return;

			await this.queryBuilder
				.createQueryBuilder()
				.update(relation.inverseEntityMetadata.target)
				.set(updateSet)
				.where(condition)
				.setParameters(parameters)
				.execute();
		} else if (relation.isOneToOneNotOwner || relation.isOneToMany) {
			if (Array.isArray(this.expressionMap.of))
				throw new TypeORMError(
					`You cannot update relations of multiple entities with the same related object. Provide a single entity into .of method.`,
				);

			const of = this.expressionMap.of;
			const updateSet = relation.inverseRelation!.joinColumns.reduce((updateSet, joinColumn) => {
				const relationValue = ObjectUtils.isObject(of)
					? joinColumn.referencedColumn!.getEntityValue(of)
					: of;
				joinColumn.setEntityValue(updateSet, relationValue);
				return updateSet;
			}, {} as any);

			if (!value || (Array.isArray(value) && !value.length)) return;

			await this.queryBuilder
				.createQueryBuilder()
				.update(relation.inverseEntityMetadata.target)
				.set(updateSet)
				.whereInIds(value)
				.execute();
		} else {
			// many to many
			const junctionMetadata = relation.junctionEntityMetadata!;
			const ofs = Array.isArray(this.expressionMap.of)
				? this.expressionMap.of
				: [this.expressionMap.of];
			const values = Array.isArray(value) ? value : [value];
			const firstColumnValues = relation.isManyToManyOwner ? ofs : values;
			const secondColumnValues = relation.isManyToManyOwner ? values : ofs;

			const bulkInserted: ObjectLiteral[] = [];
			firstColumnValues.forEach((firstColumnVal) => {
				secondColumnValues.forEach((secondColumnVal) => {
					const inserted: ObjectLiteral = {};
					junctionMetadata.ownerColumns.forEach((column) => {
						inserted[column.databaseName] = ObjectUtils.isObject(firstColumnVal)
							? column.referencedColumn!.getEntityValue(firstColumnVal)
							: firstColumnVal;
					});
					junctionMetadata.inverseColumns.forEach((column) => {
						inserted[column.databaseName] = ObjectUtils.isObject(secondColumnVal)
							? column.referencedColumn!.getEntityValue(secondColumnVal)
							: secondColumnVal;
					});
					bulkInserted.push(inserted);
				});
			});

			if (!bulkInserted.length) return;

			await this.queryBuilder
				.createQueryBuilder()
				.insert()
				.into(junctionMetadata.tableName)
				.values(bulkInserted)
				.execute();
		}
	}
}
