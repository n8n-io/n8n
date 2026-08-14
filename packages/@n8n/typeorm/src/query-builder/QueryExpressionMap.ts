import { Alias } from './Alias';
import { ObjectLiteral } from '../common/ObjectLiteral';
import { OrderByCondition } from '../find-options/OrderByCondition';
import { JoinAttribute } from './JoinAttribute';
import { QueryBuilder } from './QueryBuilder';
import { QueryBuilderCteOptions } from './QueryBuilderCte';
import { RelationIdAttribute } from './relation-id/RelationIdAttribute';
import { RelationCountAttribute } from './relation-count/RelationCountAttribute';
import { DataSource } from '../data-source/DataSource';
import { EntityMetadata } from '../metadata/EntityMetadata';
import { SelectQuery } from './SelectQuery';
import { ColumnMetadata } from '../metadata/ColumnMetadata';
import { RelationMetadata } from '../metadata/RelationMetadata';
import { SelectQueryBuilderOption } from './SelectQueryBuilderOption';
import { TypeORMError } from '../error';
import { WhereClause } from './WhereClause';
import { UpsertType } from '../driver/types/UpsertType';

/**
 * Contains all properties of the QueryBuilder that needs to be build a final query.
 */
export class QueryExpressionMap {
	// -------------------------------------------------------------------------
	// Public Properties
	// -------------------------------------------------------------------------

	/**
	 * Strategy to load relations.
	 */
	relationLoadStrategy: 'join' | 'query' = 'join';

	/**
	 * Indicates if QueryBuilder used to select entities and not a raw results.
	 */
	queryEntity: boolean = false;

	/**
	 * Main alias is a main selection object selected by QueryBuilder.
	 */
	mainAlias?: Alias;

	/**
	 * All aliases (including main alias) used in the query.
	 */
	aliases: Alias[] = [];

	/**
	 * Represents query type. QueryBuilder is able to build SELECT, UPDATE and DELETE queries.
	 */
	queryType: 'select' | 'update' | 'delete' | 'insert' | 'relation' | 'soft-delete' | 'restore' =
		'select';

	/**
	 * Data needs to be SELECT-ed.
	 */
	selects: SelectQuery[] = [];

	/**
	 * Max execution time in millisecond.
	 */
	maxExecutionTime: number = 0;

	/**
	 * Whether SELECT is DISTINCT.
	 */
	selectDistinct: boolean = false;

	/**
	 * SELECT DISTINCT ON query (postgres).
	 */
	selectDistinctOn: string[] = [];

	/**
	 * FROM-s to be selected.
	 */
	// froms: { target: string, alias: string }[] = [];

	/**
	 * If update query was used, it needs "update set" - properties which will be updated by this query.
	 * If insert query was used, it needs "insert set" - values that needs to be inserted.
	 */
	valuesSet?: ObjectLiteral | ObjectLiteral[];

	/**
	 * Optional returning (or output) clause for insert, update or delete queries.
	 */
	returning: string | string[];

	/**
	 * Extra returning columns to be added to the returning statement if driver supports it.
	 */
	extraReturningColumns: ColumnMetadata[] = [];

	/**
	 * Optional on conflict statement used in insertion query in postgres.
	 */
	onConflict: string = '';

	/**
	 * Optional on ignore statement used in insertion query in databases.
	 */
	onIgnore: boolean = false;

	/**
	 * Optional on update statement used in insertion query in databases.
	 */
	onUpdate: {
		conflict?: string | string[];
		columns?: string[];
		overwrite?: string[];
		skipUpdateIfNoValuesChanged?: boolean;
		indexPredicate?: string;
		upsertType?: UpsertType;
	};

	/**
	 * JOIN queries.
	 */
	joinAttributes: JoinAttribute[] = [];

	/**
	 * RelationId queries.
	 */
	relationIdAttributes: RelationIdAttribute[] = [];

	/**
	 * Relation count queries.
	 */
	relationCountAttributes: RelationCountAttribute[] = [];

	/**
	 * WHERE queries.
	 */
	wheres: WhereClause[] = [];

	/**
	 * HAVING queries.
	 */
	havings: { type: 'simple' | 'and' | 'or'; condition: string }[] = [];

	/**
	 * ORDER BY queries.
	 */
	orderBys: OrderByCondition = {};

	/**
	 * GROUP BY queries.
	 */
	groupBys: string[] = [];

	/**
	 * LIMIT query.
	 */
	limit?: number;

	/**
	 * OFFSET query.
	 */
	offset?: number;

	/**
	 * Number of rows to skip of result using pagination.
	 */
	skip?: number;

	/**
	 * Number of rows to take using pagination.
	 */
	take?: number;

	/**
	 * Use certain index for the query.
	 *
	 * SELECT * FROM table_name USE INDEX (col1_index, col2_index) WHERE col1=1 AND col2=2 AND col3=3;
	 */
	useIndex?: string;

	/**
	 * Locking mode.
	 */
	lockMode?:
		| 'optimistic'
		| 'pessimistic_read'
		| 'pessimistic_write'
		| 'dirty_read'
		/*
            "pessimistic_partial_write" and "pessimistic_write_or_fail" are deprecated and
            will be removed in a future version.

            Use onLocked instead.
         */
		| 'pessimistic_partial_write'
		| 'pessimistic_write_or_fail'
		| 'for_no_key_update'
		| 'for_key_share';

	/**
	 * Current version of the entity, used for locking.
	 */
	lockVersion?: number | Date;

	/**
	 * Tables to be specified in the "FOR UPDATE OF" clause, referred by their alias
	 */
	lockTables?: string[];

	/**
	 * Modify behavior when encountering locked rows. NOWAIT or SKIP LOCKED
	 */
	onLocked?: 'nowait' | 'skip_locked';

	/**
	 * Indicates if soft-deleted rows should be included in entity result.
	 * By default the soft-deleted rows are not included.
	 */
	withDeleted: boolean = false;

	/**
	 * Parameters used to be escaped in final query.
	 */
	parameters: ObjectLiteral = {};

	/**
	 * Indicates if alias, table names and column names will be escaped by driver, or not.
	 *
	 * todo: rename to isQuotingDisabled, also think if it should be named "escaping"
	 */
	disableEscaping: boolean = true;

	/**
	 * Indicates if virtual columns should be included in entity result.
	 *
	 * todo: what to do with it? is it properly used? what about persistence?
	 */
	enableRelationIdValues: boolean = false;

	/**
	 * Extra where condition appended to the end of original where conditions with AND keyword.
	 * Original condition will be wrapped into brackets.
	 */
	extraAppendedAndWhereCondition: string = '';

	/**
	 * Indicates if query builder creates a subquery.
	 */
	subQuery: boolean = false;

	/**
	 * Indicates if property names are prefixed with alias names during property replacement.
	 * By default this is enabled, however we need this because aliases are not supported in UPDATE and DELETE queries,
	 * but user can use them in WHERE expressions.
	 */
	aliasNamePrefixingEnabled: boolean = true;

	/**
	 * Indicates if query result cache is enabled or not.
	 * It is undefined by default to avoid overriding the `alwaysEnabled` config
	 */
	cache?: boolean;

	/**
	 * Time in milliseconds in which cache will expire.
	 * If not set then global caching time will be used.
	 */
	cacheDuration: number;

	/**
	 * Cache id.
	 * Used to identifier your cache queries.
	 */
	cacheId: string;

	/**
	 * Options that define QueryBuilder behaviour.
	 */
	options: SelectQueryBuilderOption[] = [];

	/**
	 * Property path of relation to work with.
	 * Used in relational query builder.
	 */
	relationPropertyPath: string;

	/**
	 * Entity (target) which relations will be updated.
	 */
	of: any | any[];

	/**
	 * List of columns where data should be inserted.
	 * Used in INSERT query.
	 */
	insertColumns: string[] = [];

	/**
	 * Used if user wants to update or delete a specific entities.
	 */
	whereEntities: ObjectLiteral[] = [];

	/**
	 * Indicates if entity must be updated after insertion / updation.
	 * This may produce extra query or use RETURNING / OUTPUT statement (depend on database).
	 */
	updateEntity: boolean = true;

	/**
	 * Indicates if listeners and subscribers must be called before and after query execution.
	 */
	callListeners: boolean = true;

	/**
	 * Indicates if query must be wrapped into transaction.
	 */
	useTransaction: boolean = false;

	/**
	 * Indicates if query should be time travel query
	 * https://www.cockroachlabs.com/docs/stable/as-of-system-time.html
	 */
	timeTravel?: boolean | string;

	/**
	 * Extra parameters.
	 *
	 * @deprecated Use standard parameters instead
	 */
	nativeParameters: ObjectLiteral = {};

	/**
	 * Query Comment to include extra information for debugging or other purposes.
	 */
	comment?: string;

	/**
	 * Items from an entity that have been locally generated & are recorded here for later use.
	 * Examples include the UUID generation when the database does not natively support it.
	 * These are included in the entity index order.
	 */
	locallyGenerated: { [key: number]: ObjectLiteral } = {};

	commonTableExpressions: {
		queryBuilder: QueryBuilder<any> | string;
		alias: string;
		options: QueryBuilderCteOptions;
	}[] = [];

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(protected connection: DataSource) {
		if (connection.options.relationLoadStrategy) {
			this.relationLoadStrategy = connection.options.relationLoadStrategy;
		}

		this.timeTravel = false;
	}

	// -------------------------------------------------------------------------
	// Accessors
	// -------------------------------------------------------------------------

	/**
	 * Get all ORDER BY queries - if order by is specified by user then it uses them,
	 * otherwise it uses default entity order by if it was set.
	 */
	get allOrderBys() {
		if (
			!Object.keys(this.orderBys).length &&
			this.mainAlias!.hasMetadata &&
			this.options.indexOf('disable-global-order') === -1
		) {
			const entityOrderBy = this.mainAlias!.metadata.orderBy || {};
			return Object.keys(entityOrderBy).reduce((orderBy, key) => {
				orderBy[this.mainAlias!.name + '.' + key] = entityOrderBy[key];
				return orderBy;
			}, {} as OrderByCondition);
		}

		return this.orderBys;
	}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Creates a main alias and adds it to the current expression map.
	 */
	setMainAlias(alias: Alias): Alias {
		// if main alias is already set then remove it from the array
		// if (this.mainAlias)
		//     this.aliases.splice(this.aliases.indexOf(this.mainAlias));

		// set new main alias
		this.mainAlias = alias;

		return alias;
	}

	/**
	 * Creates a new alias and adds it to the current expression map.
	 */
	createAlias(options: {
		type: 'from' | 'select' | 'join' | 'other';
		name?: string;
		target?: Function | string;
		tablePath?: string;
		subQuery?: string;
		metadata?: EntityMetadata;
	}): Alias {
		let aliasName = options.name;
		if (!aliasName && options.tablePath) aliasName = options.tablePath;
		if (!aliasName && typeof options.target === 'function') aliasName = options.target.name;
		if (!aliasName && typeof options.target === 'string') aliasName = options.target;

		const alias = new Alias();
		alias.type = options.type;
		if (aliasName) alias.name = aliasName;
		if (options.metadata) alias.metadata = options.metadata;
		if (options.target && !alias.hasMetadata)
			alias.metadata = this.connection.getMetadata(options.target);
		if (options.tablePath) alias.tablePath = options.tablePath;
		if (options.subQuery) alias.subQuery = options.subQuery;

		this.aliases.push(alias);
		return alias;
	}

	/**
	 * Finds alias with the given name.
	 * If alias was not found it throw an exception.
	 */
	findAliasByName(aliasName: string): Alias {
		const alias = this.aliases.find((alias) => alias.name === aliasName);
		if (!alias)
			throw new TypeORMError(`"${aliasName}" alias was not found. Maybe you forgot to join it?`);

		return alias;
	}

	findColumnByAliasExpression(aliasExpression: string): ColumnMetadata | undefined {
		const [aliasName, propertyPath] = aliasExpression.split('.');
		const alias = this.findAliasByName(aliasName);
		return alias.metadata.findColumnWithPropertyName(propertyPath);
	}

	/**
	 * Gets relation metadata of the relation this query builder works with.
	 *
	 * todo: add proper exceptions
	 */
	get relationMetadata(): RelationMetadata {
		if (!this.mainAlias) throw new TypeORMError(`Entity to work with is not specified!`); // todo: better message

		const relationMetadata = this.mainAlias.metadata.findRelationWithPropertyPath(
			this.relationPropertyPath,
		);
		if (!relationMetadata)
			throw new TypeORMError(
				`Relation ${this.relationPropertyPath} was not found in entity ${this.mainAlias.name}`,
			); // todo: better message

		return relationMetadata;
	}

	/**
	 * Copies all properties of the current QueryExpressionMap into a new one.
	 * Useful when QueryBuilder needs to create a copy of itself.
	 */
	clone(): QueryExpressionMap {
		const map = new QueryExpressionMap(this.connection);
		map.queryType = this.queryType;
		map.selects = this.selects.map((select) => select);
		map.maxExecutionTime = this.maxExecutionTime;
		map.selectDistinct = this.selectDistinct;
		map.selectDistinctOn = this.selectDistinctOn;
		this.aliases.forEach((alias) => map.aliases.push(new Alias(alias)));
		map.relationLoadStrategy = this.relationLoadStrategy;
		map.mainAlias = this.mainAlias;
		map.valuesSet = this.valuesSet;
		map.returning = this.returning;
		map.onConflict = this.onConflict;
		map.onIgnore = this.onIgnore;
		map.onUpdate = this.onUpdate;
		map.joinAttributes = this.joinAttributes.map(
			(join) => new JoinAttribute(this.connection, this, join),
		);
		map.relationIdAttributes = this.relationIdAttributes.map(
			(relationId) => new RelationIdAttribute(this, relationId),
		);
		map.relationCountAttributes = this.relationCountAttributes.map(
			(relationCount) => new RelationCountAttribute(this, relationCount),
		);
		map.wheres = this.wheres.map((where) => ({ ...where }));
		map.havings = this.havings.map((having) => ({ ...having }));
		map.orderBys = Object.assign({}, this.orderBys);
		map.groupBys = this.groupBys.map((groupBy) => groupBy);
		map.limit = this.limit;
		map.offset = this.offset;
		map.skip = this.skip;
		map.take = this.take;
		map.lockMode = this.lockMode;
		map.onLocked = this.onLocked;
		map.lockVersion = this.lockVersion;
		map.lockTables = this.lockTables;
		map.withDeleted = this.withDeleted;
		map.parameters = Object.assign({}, this.parameters);
		map.disableEscaping = this.disableEscaping;
		map.enableRelationIdValues = this.enableRelationIdValues;
		map.extraAppendedAndWhereCondition = this.extraAppendedAndWhereCondition;
		map.subQuery = this.subQuery;
		map.aliasNamePrefixingEnabled = this.aliasNamePrefixingEnabled;
		map.cache = this.cache;
		map.cacheId = this.cacheId;
		map.cacheDuration = this.cacheDuration;
		map.relationPropertyPath = this.relationPropertyPath;
		map.of = this.of;
		map.insertColumns = this.insertColumns;
		map.whereEntities = this.whereEntities;
		map.updateEntity = this.updateEntity;
		map.callListeners = this.callListeners;
		map.useTransaction = this.useTransaction;
		map.timeTravel = this.timeTravel;
		map.nativeParameters = Object.assign({}, this.nativeParameters);
		map.comment = this.comment;
		map.commonTableExpressions = this.commonTableExpressions.map((cteOptions) => ({
			alias: cteOptions.alias,
			queryBuilder:
				typeof cteOptions.queryBuilder === 'string'
					? cteOptions.queryBuilder
					: cteOptions.queryBuilder.clone(),
			options: cteOptions.options,
		}));
		return map;
	}
}
