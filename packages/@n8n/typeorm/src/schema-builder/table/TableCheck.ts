import { TableCheckOptions } from '../options/TableCheckOptions';
import { CheckMetadata } from '../../metadata/CheckMetadata';

/**
 * Database's table check constraint stored in this class.
 */
export class TableCheck {
	readonly '@instanceof' = Symbol.for('TableCheck');

	// -------------------------------------------------------------------------
	// Public Properties
	// -------------------------------------------------------------------------

	/**
	 * Constraint name.
	 */
	name?: string;

	/**
	 * Column that contains this constraint.
	 */
	columnNames?: string[] = [];

	/**
	 * Check expression.
	 */
	expression?: string;

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(options: TableCheckOptions) {
		this.name = options.name;
		this.columnNames = options.columnNames;
		this.expression = options.expression;
	}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Creates a new copy of this constraint with exactly same properties.
	 */
	clone(): TableCheck {
		return new TableCheck(<TableCheckOptions>{
			name: this.name,
			columnNames: this.columnNames ? [...this.columnNames] : [],
			expression: this.expression,
		});
	}

	// -------------------------------------------------------------------------
	// Static Methods
	// -------------------------------------------------------------------------

	/**
	 * Creates checks from the check metadata object.
	 */
	static create(checkMetadata: CheckMetadata): TableCheck {
		return new TableCheck(<TableCheckOptions>{
			name: checkMetadata.name,
			expression: checkMetadata.expression,
		});
	}
}
