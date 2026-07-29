import { EntityMetadata } from './EntityMetadata';
import { NamingStrategyInterface } from '../naming-strategy/NamingStrategyInterface';
import { CheckMetadataArgs } from '../metadata-args/CheckMetadataArgs';

/**
 * Check metadata contains all information about table's check constraints.
 */
export class CheckMetadata {
	// ---------------------------------------------------------------------
	// Public Properties
	// ---------------------------------------------------------------------

	/**
	 * Entity metadata of the class to which this check constraint is applied.
	 */
	entityMetadata: EntityMetadata;

	/**
	 * Target class to which metadata is applied.
	 */
	target?: Function | string;

	/**
	 * Check expression.
	 */
	expression: string;

	/**
	 * User specified check constraint name.
	 */
	givenName?: string;

	/**
	 * Final check constraint name.
	 * If check constraint name was given by a user then it stores normalized (by naming strategy) givenName.
	 * If check constraint name was not given then its generated.
	 */
	name: string;

	// ---------------------------------------------------------------------
	// Constructor
	// ---------------------------------------------------------------------

	constructor(options: {
		entityMetadata: EntityMetadata;
		args?: CheckMetadataArgs;
	}) {
		this.entityMetadata = options.entityMetadata;

		if (options.args) {
			this.target = options.args.target;
			this.expression = options.args.expression;
			this.givenName = options.args.name;
		}
	}

	// ---------------------------------------------------------------------
	// Public Build Methods
	// ---------------------------------------------------------------------

	/**
	 * Builds some depend check constraint properties.
	 * Must be called after all entity metadata's properties map, columns and relations are built.
	 */
	build(namingStrategy: NamingStrategyInterface): this {
		this.name = this.givenName
			? this.givenName
			: namingStrategy.checkConstraintName(this.entityMetadata.tableName, this.expression);
		return this;
	}
}
