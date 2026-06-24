import { QueryBuilder } from './QueryBuilder';
import { ObjectLiteral } from '../common/ObjectLiteral';
import { QueryExpressionMap } from './QueryExpressionMap';
import { ObjectUtils } from '../util/ObjectUtils';

/**
 * Allows to work with entity relations and perform specific operations with those relations.
 *
 * todo: add transactions everywhere
 */
export class RelationRemover {
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
	 * Performs remove operation on a relation.
	 */
	async remove(value: any | any[]): Promise<void> {
		const relation = this.expressionMap.relationMetadata;

		if (relation.isOneToMany) {
			// if (this.expressionMap.of instanceof Array)
			//     throw new TypeORMError(`You cannot update relations of multiple entities with the same related object. Provide a single entity into .of method.`);

			// DELETE FROM post WHERE post.categoryId = of AND post.id = id
			const ofs = Array.isArray(this.expressionMap.of)
				? this.expressionMap.of
				: [this.expressionMap.of];
			const values = Array.isArray(value) ? value : [value];

			const updateSet: ObjectLiteral = {};
			relation.inverseRelation!.joinColumns.forEach((column) => {
				updateSet[column.propertyName] = null;
			});

			const parameters: ObjectLiteral = {};
			const conditions: string[] = [];
			ofs.forEach((of, ofIndex) => {
				conditions.push(
					...values.map((value, valueIndex) => {
						return [
							...relation.inverseRelation!.joinColumns.map((column, columnIndex) => {
								const parameterName =
									'joinColumn_' + ofIndex + '_' + valueIndex + '_' + columnIndex;
								parameters[parameterName] = ObjectUtils.isObject(of)
									? column.referencedColumn!.getEntityValue(of)
									: of;
								return `${column.propertyPath} = :${parameterName}`;
							}),
							...relation.inverseRelation!.entityMetadata.primaryColumns.map(
								(column, columnIndex) => {
									const parameterName =
										'primaryColumn_' + valueIndex + '_' + valueIndex + '_' + columnIndex;
									parameters[parameterName] = ObjectUtils.isObject(value)
										? column.getEntityValue(value)
										: value;
									return `${column.propertyPath} = :${parameterName}`;
								},
							),
						].join(' AND ');
					}),
				);
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
		} else {
			// many to many

			const junctionMetadata = relation.junctionEntityMetadata!;
			const ofs = Array.isArray(this.expressionMap.of)
				? this.expressionMap.of
				: [this.expressionMap.of];
			const values = Array.isArray(value) ? value : [value];
			const firstColumnValues = relation.isManyToManyOwner ? ofs : values;
			const secondColumnValues = relation.isManyToManyOwner ? values : ofs;

			const parameters: ObjectLiteral = {};
			const conditions: string[] = [];
			firstColumnValues.forEach((firstColumnVal, firstColumnValIndex) => {
				conditions.push(
					...secondColumnValues.map((secondColumnVal, secondColumnValIndex) => {
						return [
							...junctionMetadata.ownerColumns.map((column, columnIndex) => {
								const parameterName =
									'firstValue_' +
									firstColumnValIndex +
									'_' +
									secondColumnValIndex +
									'_' +
									columnIndex;
								parameters[parameterName] = ObjectUtils.isObject(firstColumnVal)
									? column.referencedColumn!.getEntityValue(firstColumnVal)
									: firstColumnVal;
								return `${column.databaseName} = :${parameterName}`;
							}),
							...junctionMetadata.inverseColumns.map((column, columnIndex) => {
								const parameterName =
									'secondValue_' +
									firstColumnValIndex +
									'_' +
									secondColumnValIndex +
									'_' +
									columnIndex;
								parameters[parameterName] = ObjectUtils.isObject(secondColumnVal)
									? column.referencedColumn!.getEntityValue(secondColumnVal)
									: secondColumnVal;
								return `${column.databaseName} = :${parameterName}`;
							}),
						].join(' AND ');
					}),
				);
			});
			const condition = conditions.map((str) => '(' + str + ')').join(' OR ');

			await this.queryBuilder
				.createQueryBuilder()
				.delete()
				.from(junctionMetadata.tableName)
				.where(condition)
				.setParameters(parameters)
				.execute();
		}
	}
}
