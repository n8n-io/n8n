import { DataSource, Driver, EntityMetadata, SelectQueryBuilder, TableIndex } from '../..';
import { ViewOptions } from '../options/ViewOptions';

/**
 * View in the database represented in this class.
 */
export class View {
	readonly '@instanceof' = Symbol.for('View');

	// -------------------------------------------------------------------------
	// Public Properties
	// -------------------------------------------------------------------------

	/**
	 * Database name that this view resides in if it applies.
	 */
	database?: string;

	/**
	 * Schema name that this view resides in if it applies.
	 */
	schema?: string;

	/**
	 * View name
	 */
	name: string;

	/**
	 * Indicates if view is materialized.
	 */
	materialized: boolean;

	/**
	 * View Indices
	 */
	indices: TableIndex[];

	/**
	 * View definition.
	 */
	expression: string | ((connection: DataSource) => SelectQueryBuilder<any>);

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(options?: ViewOptions) {
		this.indices = [];
		if (options) {
			this.database = options.database;
			this.schema = options.schema;
			this.name = options.name;
			this.expression = options.expression;
			this.materialized = !!options.materialized;
		}
	}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Clones this table to a new table with all properties cloned.
	 */
	clone(): View {
		return new View(<ViewOptions>{
			database: this.database,
			schema: this.schema,
			name: this.name,
			expression: this.expression,
			materialized: this.materialized,
		});
	}

	/**
	 * Add index
	 */
	addIndex(index: TableIndex): void {
		this.indices.push(index);
	}

	/**
	 * Remove index
	 */
	removeIndex(viewIndex: TableIndex): void {
		const index = this.indices.find((index) => index.name === viewIndex.name);
		if (index) {
			this.indices.splice(this.indices.indexOf(index), 1);
		}
	}

	// -------------------------------------------------------------------------
	// Static Methods
	// -------------------------------------------------------------------------

	/**
	 * Creates view from a given entity metadata.
	 */
	static create(entityMetadata: EntityMetadata, driver: Driver): View {
		const options: ViewOptions = {
			database: entityMetadata.database,
			schema: entityMetadata.schema,
			name: driver.buildTableName(
				entityMetadata.tableName,
				entityMetadata.schema,
				entityMetadata.database,
			),
			expression: entityMetadata.expression!,
			materialized: entityMetadata.tableMetadataArgs.materialized,
		};

		return new View(options);
	}
}
