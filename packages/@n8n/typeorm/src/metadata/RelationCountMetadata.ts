import { RelationCountMetadataArgs } from '../metadata-args/RelationCountMetadataArgs';
import { EntityMetadata } from './EntityMetadata';
import { RelationMetadata } from './RelationMetadata';
import { SelectQueryBuilder } from '../query-builder/SelectQueryBuilder';
import { TypeORMError } from '../error';

/**
 * Contains all information about entity's relation count.
 */
export class RelationCountMetadata {
	// ---------------------------------------------------------------------
	// Public Properties
	// ---------------------------------------------------------------------

	/**
	 * Entity metadata where this column metadata is.
	 */
	entityMetadata: EntityMetadata;

	/**
	 * Relation which needs to be counted.
	 */
	relation: RelationMetadata;

	/**
	 * Relation name which need to count.
	 */
	relationNameOrFactory: string | ((object: any) => any);

	/**
	 * Target class to which metadata is applied.
	 */
	target: Function | string;

	/**
	 * Target's property name to which this metadata is applied.
	 */
	propertyName: string;

	/**
	 * Alias of the joined (destination) table.
	 */
	alias?: string;

	/**
	 * Extra condition applied to "ON" section of join.
	 */
	queryBuilderFactory?: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>;

	// ---------------------------------------------------------------------
	// Constructor
	// ---------------------------------------------------------------------

	constructor(options: {
		entityMetadata: EntityMetadata;
		args: RelationCountMetadataArgs;
	}) {
		this.entityMetadata = options.entityMetadata;
		this.target = options.args.target;
		this.propertyName = options.args.propertyName;
		this.relationNameOrFactory = options.args.relation;
		this.alias = options.args.alias;
		this.queryBuilderFactory = options.args.queryBuilderFactory;
	}

	// ---------------------------------------------------------------------
	// Public Builder Methods
	// ---------------------------------------------------------------------

	/**
	 * Builds some depend relation count metadata properties.
	 * This builder method should be used only after entity metadata, its properties map and all relations are build.
	 */
	build() {
		const propertyPath =
			typeof this.relationNameOrFactory === 'function'
				? this.relationNameOrFactory(this.entityMetadata.propertiesMap)
				: this.relationNameOrFactory;
		const relation = this.entityMetadata.findRelationWithPropertyPath(propertyPath);
		if (!relation)
			throw new TypeORMError(
				`Cannot find relation ${propertyPath}. Wrong relation specified for @RelationCount decorator.`,
			);

		this.relation = relation;
	}
}
