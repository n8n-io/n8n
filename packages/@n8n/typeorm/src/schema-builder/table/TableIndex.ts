import { IndexMetadata } from '../../metadata/IndexMetadata';
import { TableIndexOptions } from '../options/TableIndexOptions';

/**
 * Database's table index stored in this class.
 */
export class TableIndex {
	readonly '@instanceof' = Symbol.for('TableIndex');

	// -------------------------------------------------------------------------
	// Public Properties
	// -------------------------------------------------------------------------

	/**
	 * Index name.
	 */
	name?: string;

	/**
	 * Columns included in this index.
	 */
	columnNames: string[] = [];

	/**
	 * Indicates if this index is unique.
	 */
	isUnique: boolean;

	/**
	 * The SPATIAL modifier indexes the entire column and does not allow indexed columns to contain NULL values.
	 * Works only in MySQL.
	 */
	isSpatial: boolean;

	/**
	 * Create the index using the CONCURRENTLY modifier
	 * Works only in postgres.
	 */
	isConcurrent: boolean;

	/**
	 * The FULLTEXT modifier indexes the entire column and does not allow prefixing.
	 * Works only in MySQL.
	 */
	isFulltext: boolean;

	/**
	 * NULL_FILTERED indexes are particularly useful for indexing sparse columns, where most rows contain a NULL value.
	 * In these cases, the NULL_FILTERED index can be considerably smaller and more efficient to maintain than
	 * a normal index that includes NULL values.
	 *
	 * Works only in Spanner.
	 */
	isNullFiltered: boolean;

	/**
	 * Fulltext parser.
	 * Works only in MySQL.
	 */
	parser?: string;

	/**
	 * Index filter condition.
	 */
	where: string;

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(options: TableIndexOptions) {
		this.name = options.name;
		this.columnNames = options.columnNames;
		this.isUnique = !!options.isUnique;
		this.isSpatial = !!options.isSpatial;
		this.isConcurrent = !!options.isConcurrent;
		this.isFulltext = !!options.isFulltext;
		this.isNullFiltered = !!options.isNullFiltered;
		this.parser = options.parser;
		this.where = options.where ? options.where : '';
	}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Creates a new copy of this index with exactly same properties.
	 */
	clone(): TableIndex {
		return new TableIndex(<TableIndexOptions>{
			name: this.name,
			columnNames: [...this.columnNames],
			isUnique: this.isUnique,
			isSpatial: this.isSpatial,
			isConcurrent: this.isConcurrent,
			isFulltext: this.isFulltext,
			isNullFiltered: this.isNullFiltered,
			parser: this.parser,
			where: this.where,
		});
	}

	// -------------------------------------------------------------------------
	// Static Methods
	// -------------------------------------------------------------------------

	/**
	 * Creates index from the index metadata object.
	 */
	static create(indexMetadata: IndexMetadata): TableIndex {
		return new TableIndex(<TableIndexOptions>{
			name: indexMetadata.name,
			columnNames: indexMetadata.columns.map((column) => column.databaseName),
			isUnique: indexMetadata.isUnique,
			isSpatial: indexMetadata.isSpatial,
			isConcurrent: indexMetadata.isConcurrent,
			isFulltext: indexMetadata.isFulltext,
			isNullFiltered: indexMetadata.isNullFiltered,
			parser: indexMetadata.parser,
			where: indexMetadata.where,
		});
	}
}
