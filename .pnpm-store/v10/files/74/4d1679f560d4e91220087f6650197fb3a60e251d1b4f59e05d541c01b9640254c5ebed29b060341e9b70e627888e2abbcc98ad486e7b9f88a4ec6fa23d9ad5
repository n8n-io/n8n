import { Alias } from "./Alias";
import { ObjectLiteral } from "../common/ObjectLiteral";
import { OrderByCondition } from "../find-options/OrderByCondition";
import { JoinAttribute } from "./JoinAttribute";
import { QueryBuilder } from "./QueryBuilder";
import { QueryBuilderCteOptions } from "./QueryBuilderCte";
import { RelationIdAttribute } from "./relation-id/RelationIdAttribute";
import { RelationCountAttribute } from "./relation-count/RelationCountAttribute";
import { DataSource } from "../data-source/DataSource";
import { EntityMetadata } from "../metadata/EntityMetadata";
import { SelectQuery } from "./SelectQuery";
import { ColumnMetadata } from "../metadata/ColumnMetadata";
import { RelationMetadata } from "../metadata/RelationMetadata";
import { SelectQueryBuilderOption } from "./SelectQueryBuilderOption";
import { WhereClause } from "./WhereClause";
import { UpsertType } from "../driver/types/UpsertType";
/**
 * Contains all properties of the QueryBuilder that needs to be build a final query.
 */
export declare class QueryExpressionMap {
    protected connection: DataSource;
    /**
     * Strategy to load relations.
     */
    relationLoadStrategy: "join" | "query";
    /**
     * Indicates if QueryBuilder used to select entities and not a raw results.
     */
    queryEntity: boolean;
    /**
     * Main alias is a main selection object selected by QueryBuilder.
     */
    mainAlias?: Alias;
    /**
     * All aliases (including main alias) used in the query.
     */
    aliases: Alias[];
    /**
     * Represents query type. QueryBuilder is able to build SELECT, UPDATE and DELETE queries.
     */
    queryType: "select" | "update" | "delete" | "insert" | "relation" | "soft-delete" | "restore";
    /**
     * Data needs to be SELECT-ed.
     */
    selects: SelectQuery[];
    /**
     * Max execution time in millisecond.
     */
    maxExecutionTime: number;
    /**
     * Whether SELECT is DISTINCT.
     */
    selectDistinct: boolean;
    /**
     * SELECT DISTINCT ON query (postgres).
     */
    selectDistinctOn: string[];
    /**
     * FROM-s to be selected.
     */
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
    extraReturningColumns: ColumnMetadata[];
    /**
     * Optional on conflict statement used in insertion query in postgres.
     */
    onConflict: string;
    /**
     * Optional on ignore statement used in insertion query in databases.
     */
    onIgnore: boolean;
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
    joinAttributes: JoinAttribute[];
    /**
     * RelationId queries.
     */
    relationIdAttributes: RelationIdAttribute[];
    /**
     * Relation count queries.
     */
    relationCountAttributes: RelationCountAttribute[];
    /**
     * WHERE queries.
     */
    wheres: WhereClause[];
    /**
     * HAVING queries.
     */
    havings: {
        type: "simple" | "and" | "or";
        condition: string;
    }[];
    /**
     * ORDER BY queries.
     */
    orderBys: OrderByCondition;
    /**
     * GROUP BY queries.
     */
    groupBys: string[];
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
    lockMode?: "optimistic" | "pessimistic_read" | "pessimistic_write" | "dirty_read" | "pessimistic_partial_write" | "pessimistic_write_or_fail" | "for_no_key_update" | "for_key_share";
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
    onLocked?: "nowait" | "skip_locked";
    /**
     * Indicates if soft-deleted rows should be included in entity result.
     * By default the soft-deleted rows are not included.
     */
    withDeleted: boolean;
    /**
     * Parameters used to be escaped in final query.
     */
    parameters: ObjectLiteral;
    /**
     * Indicates if alias, table names and column names will be escaped by driver, or not.
     *
     * todo: rename to isQuotingDisabled, also think if it should be named "escaping"
     */
    disableEscaping: boolean;
    /**
     * Indicates if virtual columns should be included in entity result.
     *
     * todo: what to do with it? is it properly used? what about persistence?
     */
    enableRelationIdValues: boolean;
    /**
     * Extra where condition appended to the end of original where conditions with AND keyword.
     * Original condition will be wrapped into brackets.
     */
    extraAppendedAndWhereCondition: string;
    /**
     * Indicates if query builder creates a subquery.
     */
    subQuery: boolean;
    /**
     * Indicates if property names are prefixed with alias names during property replacement.
     * By default this is enabled, however we need this because aliases are not supported in UPDATE and DELETE queries,
     * but user can use them in WHERE expressions.
     */
    aliasNamePrefixingEnabled: boolean;
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
    options: SelectQueryBuilderOption[];
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
    insertColumns: string[];
    /**
     * Used if user wants to update or delete a specific entities.
     */
    whereEntities: ObjectLiteral[];
    /**
     * Indicates if entity must be updated after insertion / updation.
     * This may produce extra query or use RETURNING / OUTPUT statement (depend on database).
     */
    updateEntity: boolean;
    /**
     * Indicates if listeners and subscribers must be called before and after query execution.
     */
    callListeners: boolean;
    /**
     * Indicates if query must be wrapped into transaction.
     */
    useTransaction: boolean;
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
    nativeParameters: ObjectLiteral;
    /**
     * Query Comment to include extra information for debugging or other purposes.
     */
    comment?: string;
    /**
     * Items from an entity that have been locally generated & are recorded here for later use.
     * Examples include the UUID generation when the database does not natively support it.
     * These are included in the entity index order.
     */
    locallyGenerated: {
        [key: number]: ObjectLiteral;
    };
    commonTableExpressions: {
        queryBuilder: QueryBuilder<any> | string;
        alias: string;
        options: QueryBuilderCteOptions;
    }[];
    constructor(connection: DataSource);
    /**
     * Get all ORDER BY queries - if order by is specified by user then it uses them,
     * otherwise it uses default entity order by if it was set.
     */
    get allOrderBys(): OrderByCondition;
    /**
     * Creates a main alias and adds it to the current expression map.
     */
    setMainAlias(alias: Alias): Alias;
    /**
     * Creates a new alias and adds it to the current expression map.
     */
    createAlias(options: {
        type: "from" | "select" | "join" | "other";
        name?: string;
        target?: Function | string;
        tablePath?: string;
        subQuery?: string;
        metadata?: EntityMetadata;
    }): Alias;
    /**
     * Finds alias with the given name.
     * If alias was not found it throw an exception.
     */
    findAliasByName(aliasName: string): Alias;
    findColumnByAliasExpression(aliasExpression: string): ColumnMetadata | undefined;
    /**
     * Gets relation metadata of the relation this query builder works with.
     *
     * todo: add proper exceptions
     */
    get relationMetadata(): RelationMetadata;
    /**
     * Copies all properties of the current QueryExpressionMap into a new one.
     * Useful when QueryBuilder needs to create a copy of itself.
     */
    clone(): QueryExpressionMap;
}
