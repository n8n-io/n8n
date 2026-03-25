import { ObjectLiteral } from "../common/ObjectLiteral";
import { QueryRunner } from "../query-runner/QueryRunner";
import { DataSource } from "../data-source/DataSource";
import { QueryBuilderCteOptions } from "./QueryBuilderCte";
import { QueryExpressionMap } from "./QueryExpressionMap";
import { SelectQueryBuilder } from "./SelectQueryBuilder";
import { UpdateQueryBuilder } from "./UpdateQueryBuilder";
import { DeleteQueryBuilder } from "./DeleteQueryBuilder";
import { SoftDeleteQueryBuilder } from "./SoftDeleteQueryBuilder";
import { InsertQueryBuilder } from "./InsertQueryBuilder";
import { RelationQueryBuilder } from "./RelationQueryBuilder";
import { EntityTarget } from "../common/EntityTarget";
import { Alias } from "./Alias";
import { Brackets } from "./Brackets";
import { QueryDeepPartialEntity } from "./QueryPartialEntity";
import { EntityMetadata } from "../metadata/EntityMetadata";
import { ColumnMetadata } from "../metadata/ColumnMetadata";
import { WhereClause, WhereClauseCondition } from "./WhereClause";
import { NotBrackets } from "./NotBrackets";
import { ReturningType } from "../driver/Driver";
/**
 * Allows to build complex sql queries in a fashion way and execute those queries.
 */
export declare abstract class QueryBuilder<Entity extends ObjectLiteral> {
    readonly "@instanceof": symbol;
    /**
     * Connection on which QueryBuilder was created.
     */
    readonly connection: DataSource;
    /**
     * Contains all properties of the QueryBuilder that needs to be build a final query.
     */
    readonly expressionMap: QueryExpressionMap;
    /**
     * Query runner used to execute query builder query.
     */
    protected queryRunner?: QueryRunner;
    /**
     * If QueryBuilder was created in a subquery mode then its parent QueryBuilder (who created subquery) will be stored here.
     */
    protected parentQueryBuilder: QueryBuilder<any>;
    /**
     * Memo to help keep place of current parameter index for `createParameter`
     */
    private parameterIndex;
    /**
     * Contains all registered query builder classes.
     */
    private static queryBuilderRegistry;
    /**
     * QueryBuilder can be initialized from given Connection and QueryRunner objects or from given other QueryBuilder.
     */
    constructor(queryBuilder: QueryBuilder<any>);
    /**
     * QueryBuilder can be initialized from given Connection and QueryRunner objects or from given other QueryBuilder.
     */
    constructor(connection: DataSource, queryRunner?: QueryRunner);
    static registerQueryBuilderClass(name: string, factory: any): void;
    /**
     * Gets generated SQL query without parameters being replaced.
     */
    abstract getQuery(): string;
    /**
     * Gets the main alias string used in this query builder.
     */
    get alias(): string;
    /**
     * Creates SELECT query.
     * Replaces all previous selections if they exist.
     */
    select(): SelectQueryBuilder<Entity>;
    /**
     * Creates SELECT query and selects given data.
     * Replaces all previous selections if they exist.
     */
    select(selection: string, selectionAliasName?: string): SelectQueryBuilder<Entity>;
    /**
     * Creates SELECT query and selects given data.
     * Replaces all previous selections if they exist.
     */
    select(selection: string[]): SelectQueryBuilder<Entity>;
    /**
     * Creates INSERT query.
     */
    insert(): InsertQueryBuilder<Entity>;
    /**
     * Creates UPDATE query and applies given update values.
     */
    update(): UpdateQueryBuilder<Entity>;
    /**
     * Creates UPDATE query and applies given update values.
     */
    update(updateSet: QueryDeepPartialEntity<Entity>): UpdateQueryBuilder<Entity>;
    /**
     * Creates UPDATE query for the given entity and applies given update values.
     */
    update<Entity extends ObjectLiteral>(entity: EntityTarget<Entity>, updateSet?: QueryDeepPartialEntity<Entity>): UpdateQueryBuilder<Entity>;
    /**
     * Creates UPDATE query for the given table name and applies given update values.
     */
    update(tableName: string, updateSet?: QueryDeepPartialEntity<Entity>): UpdateQueryBuilder<Entity>;
    /**
     * Creates DELETE query.
     */
    delete(): DeleteQueryBuilder<Entity>;
    softDelete(): SoftDeleteQueryBuilder<any>;
    restore(): SoftDeleteQueryBuilder<any>;
    /**
     * Sets entity's relation with which this query builder gonna work.
     */
    relation(propertyPath: string): RelationQueryBuilder<Entity>;
    /**
     * Sets entity's relation with which this query builder gonna work.
     */
    relation<T extends ObjectLiteral>(entityTarget: EntityTarget<T>, propertyPath: string): RelationQueryBuilder<T>;
    /**
     * Checks if given relation exists in the entity.
     * Returns true if relation exists, false otherwise.
     *
     * todo: move this method to manager? or create a shortcut?
     */
    hasRelation<T>(target: EntityTarget<T>, relation: string): boolean;
    /**
     * Checks if given relations exist in the entity.
     * Returns true if relation exists, false otherwise.
     *
     * todo: move this method to manager? or create a shortcut?
     */
    hasRelation<T>(target: EntityTarget<T>, relation: string[]): boolean;
    /**
     * Check the existence of a parameter for this query builder.
     */
    hasParameter(key: string): boolean;
    /**
     * Sets parameter name and its value.
     *
     * The key for this parameter may contain numbers, letters, underscores, or periods.
     */
    setParameter(key: string, value: any): this;
    /**
     * Adds all parameters from the given object.
     */
    setParameters(parameters: ObjectLiteral): this;
    protected createParameter(value: any): string;
    /**
     * Adds native parameters from the given object.
     *
     * @deprecated Use `setParameters` instead
     */
    setNativeParameters(parameters: ObjectLiteral): this;
    /**
     * Gets all parameters.
     */
    getParameters(): ObjectLiteral;
    /**
     * Prints sql to stdout using console.log.
     */
    printSql(): this;
    /**
     * Gets generated sql that will be executed.
     * Parameters in the query are escaped for the currently used driver.
     */
    getSql(): string;
    /**
     * Gets query to be executed with all parameters used in it.
     */
    getQueryAndParameters(): [string, any[]];
    /**
     * Executes sql generated by query builder and returns raw database results.
     */
    execute(): Promise<any>;
    /**
     * Creates a completely new query builder.
     * Uses same query runner as current QueryBuilder.
     */
    createQueryBuilder(queryRunner?: QueryRunner): this;
    /**
     * Clones query builder as it is.
     * Note: it uses new query runner, if you want query builder that uses exactly same query runner,
     * you can create query builder using its constructor, for example new SelectQueryBuilder(queryBuilder)
     * where queryBuilder is cloned QueryBuilder.
     */
    clone(): this;
    /**
     * Includes a Query comment in the query builder.  This is helpful for debugging purposes,
     * such as finding a specific query in the database server's logs, or for categorization using
     * an APM product.
     */
    comment(comment: string): this;
    /**
     * Disables escaping.
     */
    disableEscaping(): this;
    /**
     * Escapes table name, column name or alias name using current database's escaping character.
     */
    escape(name: string): string;
    /**
     * Sets or overrides query builder's QueryRunner.
     */
    setQueryRunner(queryRunner: QueryRunner): this;
    /**
     * Indicates if listeners and subscribers must be called before and after query execution.
     * Enabled by default.
     */
    callListeners(enabled: boolean): this;
    /**
     * If set to true the query will be wrapped into a transaction.
     */
    useTransaction(enabled: boolean): this;
    /**
     * Adds CTE to query
     */
    addCommonTableExpression(queryBuilder: QueryBuilder<any> | string, alias: string, options?: QueryBuilderCteOptions): this;
    /**
     * Gets escaped table name with schema name if SqlServer driver used with custom
     * schema name, otherwise returns escaped table name.
     */
    protected getTableName(tablePath: string): string;
    /**
     * Gets name of the table where insert should be performed.
     */
    protected getMainTableName(): string;
    /**
     * Specifies FROM which entity's table select/update/delete will be executed.
     * Also sets a main string alias of the selection data.
     */
    protected createFromAlias(entityTarget: EntityTarget<any> | ((qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>), aliasName?: string): Alias;
    /**
     * @deprecated this way of replace property names is too slow.
     *  Instead, we'll replace property names at the end - once query is build.
     */
    protected replacePropertyNames(statement: string): string;
    /**
     * Replaces all entity's propertyName to name in the given SQL string.
     */
    protected replacePropertyNamesForTheWholeQuery(statement: string): string;
    protected createComment(): string;
    /**
     * Time travel queries for CockroachDB
     */
    protected createTimeTravelQuery(): string;
    /**
     * Creates "WHERE" expression.
     */
    protected createWhereExpression(): string;
    /**
     * Creates "RETURNING" / "OUTPUT" expression.
     */
    protected createReturningExpression(returningType: ReturningType): string;
    /**
     * If returning / output cause is set to array of column names,
     * then this method will return all column metadatas of those column names.
     */
    protected getReturningColumns(): ColumnMetadata[];
    protected createWhereClausesExpression(clauses: WhereClause[]): string;
    /**
     * Computes given where argument - transforms to a where string all forms it can take.
     */
    protected createWhereConditionExpression(condition: WhereClauseCondition, alwaysWrap?: boolean): string;
    protected createCteExpression(): string;
    /**
     * Creates "WHERE" condition for an in-ids condition.
     */
    protected getWhereInIdsCondition(ids: any | any[]): ObjectLiteral | Brackets;
    protected getExistsCondition(subQuery: any): [string, any[]];
    private findColumnsForPropertyPath;
    /**
     * Creates a property paths for a given ObjectLiteral.
     */
    protected createPropertyPath(metadata: EntityMetadata, entity: ObjectLiteral, prefix?: string): string[];
    protected getPredicates(where: ObjectLiteral): Generator<any[], void, unknown>;
    protected getWherePredicateCondition(aliasPath: string, parameterValue: any): WhereClauseCondition;
    protected getWhereCondition(where: string | ((qb: this) => string) | Brackets | NotBrackets | ObjectLiteral | ObjectLiteral[]): WhereClauseCondition;
    /**
     * Creates a query builder used to execute sql queries inside this query builder.
     */
    protected obtainQueryRunner(): QueryRunner;
    protected hasCommonTableExpressions(): boolean;
}
