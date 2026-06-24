import { RelationMetadata } from '../../metadata/RelationMetadata';
import { QueryBuilderUtils } from '../QueryBuilderUtils';
import { EntityMetadata } from '../../metadata/EntityMetadata';
import { QueryExpressionMap } from '../QueryExpressionMap';
import { SelectQueryBuilder } from '../SelectQueryBuilder';
import { ObjectUtils } from '../../util/ObjectUtils';
import { TypeORMError } from '../../error/TypeORMError';

/**
 * Stores all join relation id attributes which will be used to build a JOIN query.
 */
export class RelationIdAttribute {
	// -------------------------------------------------------------------------
	// Public Properties
	// -------------------------------------------------------------------------

	/**
	 * Alias of the joined (destination) table.
	 */
	alias?: string;

	/**
	 * Name of relation.
	 */
	relationName: string;

	/**
	 * Property + alias of the object where to joined data should be mapped.
	 */
	mapToProperty: string;

	/**
	 * Extra condition applied to "ON" section of join.
	 */
	queryBuilderFactory?: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>;

	/**
	 * Indicates if relation id should NOT be loaded as id map.
	 */
	disableMixedMap = false;

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(
		private queryExpressionMap: QueryExpressionMap,
		relationIdAttribute?: Partial<RelationIdAttribute>,
	) {
		ObjectUtils.assign(this, relationIdAttribute || {});
	}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	get joinInverseSideMetadata(): EntityMetadata {
		return this.relation.inverseEntityMetadata;
	}

	/**
	 * Alias of the parent of this join.
	 * For example, if we join ("post.category", "categoryAlias") then "post" is a parent alias.
	 * This value is extracted from entityOrProperty value.
	 * This is available when join was made using "post.category" syntax.
	 */
	get parentAlias(): string {
		if (!QueryBuilderUtils.isAliasProperty(this.relationName))
			throw new TypeORMError(`Given value must be a string representation of alias property`);

		return this.relationName.substr(0, this.relationName.indexOf('.'));
	}

	/**
	 * Relation property name of the parent.
	 * This is used to understand what is joined.
	 * For example, if we join ("post.category", "categoryAlias") then "category" is a relation property.
	 * This value is extracted from entityOrProperty value.
	 * This is available when join was made using "post.category" syntax.
	 */
	get relationPropertyPath(): string {
		if (!QueryBuilderUtils.isAliasProperty(this.relationName))
			throw new TypeORMError(`Given value must be a string representation of alias property`);

		return this.relationName.substr(this.relationName.indexOf('.') + 1);
	}

	/**
	 * Relation of the parent.
	 * This is used to understand what is joined.
	 * This is available when join was made using "post.category" syntax.
	 */
	get relation(): RelationMetadata {
		if (!QueryBuilderUtils.isAliasProperty(this.relationName))
			throw new TypeORMError(`Given value must be a string representation of alias property`);

		const relationOwnerSelection = this.queryExpressionMap.findAliasByName(this.parentAlias!);
		const relation = relationOwnerSelection.metadata.findRelationWithPropertyPath(
			this.relationPropertyPath!,
		);
		if (!relation)
			throw new TypeORMError(
				`Relation with property path ${this.relationPropertyPath} in entity was not found.`,
			);
		return relation;
	}

	/**
	 * Generates alias of junction table, whose ids we get.
	 */
	get junctionAlias(): string {
		const [parentAlias, relationProperty] = this.relationName.split('.');
		return parentAlias + '_' + relationProperty + '_rid';
	}

	/**
	 * Metadata of the joined entity.
	 * If extra condition without entity was joined, then it will return undefined.
	 */
	get junctionMetadata(): EntityMetadata {
		return this.relation.junctionEntityMetadata!;
	}

	get mapToPropertyParentAlias(): string {
		return this.mapToProperty.substr(0, this.mapToProperty.indexOf('.'));
	}

	get mapToPropertyPropertyPath(): string {
		return this.mapToProperty.substr(this.mapToProperty.indexOf('.') + 1);
	}
}
