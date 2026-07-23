import { TableExclusionOptions } from '../options/TableExclusionOptions';
import { ExclusionMetadata } from '../../metadata/ExclusionMetadata';

/**
 * Database's table exclusion constraint stored in this class.
 */
export class TableExclusion {
	readonly '@instanceof' = Symbol.for('TableExclusion');

	// -------------------------------------------------------------------------
	// Public Properties
	// -------------------------------------------------------------------------

	/**
	 * Constraint name.
	 */
	name?: string;

	/**
	 * Exclusion expression.
	 */
	expression?: string;

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(options: TableExclusionOptions) {
		this.name = options.name;
		this.expression = options.expression;
	}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Creates a new copy of this constraint with exactly same properties.
	 */
	clone(): TableExclusion {
		return new TableExclusion(<TableExclusionOptions>{
			name: this.name,
			expression: this.expression,
		});
	}

	// -------------------------------------------------------------------------
	// Static Methods
	// -------------------------------------------------------------------------

	/**
	 * Creates exclusions from the exclusion metadata object.
	 */
	static create(exclusionMetadata: ExclusionMetadata): TableExclusion {
		return new TableExclusion(<TableExclusionOptions>{
			name: exclusionMetadata.name,
			expression: exclusionMetadata.expression,
		});
	}
}
