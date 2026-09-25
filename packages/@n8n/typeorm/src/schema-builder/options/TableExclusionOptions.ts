/**
 * Database's table exclusion constraint options.
 */
export interface TableExclusionOptions {
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
}
