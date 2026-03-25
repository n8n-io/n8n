import { NamingStrategyInterface } from "./NamingStrategyInterface";
import { Table } from "../schema-builder/table/Table";
/**
 * Naming strategy that is used by default.
 */
export declare class DefaultNamingStrategy implements NamingStrategyInterface {
    protected getTableName(tableOrName: Table | string): string;
    /**
     * Normalizes table name.
     *
     * @param targetName Name of the target entity that can be used to generate a table name.
     * @param userSpecifiedName For example if user specified a table name in a decorator, e.g. @Entity("name")
     */
    tableName(targetName: string, userSpecifiedName: string | undefined): string;
    /**
     * Creates a table name for a junction table of a closure table.
     *
     * @param originalClosureTableName Name of the closure table which owns this junction table.
     */
    closureJunctionTableName(originalClosureTableName: string): string;
    columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string;
    relationName(propertyName: string): string;
    primaryKeyName(tableOrName: Table | string, columnNames: string[]): string;
    uniqueConstraintName(tableOrName: Table | string, columnNames: string[]): string;
    relationConstraintName(tableOrName: Table | string, columnNames: string[], where?: string): string;
    defaultConstraintName(tableOrName: Table | string, columnName: string): string;
    foreignKeyName(tableOrName: Table | string, columnNames: string[], _referencedTablePath?: string, _referencedColumnNames?: string[]): string;
    indexName(tableOrName: Table | string, columnNames: string[], where?: string): string;
    checkConstraintName(tableOrName: Table | string, expression: string, isEnum?: boolean): string;
    exclusionConstraintName(tableOrName: Table | string, expression: string): string;
    joinColumnName(relationName: string, referencedColumnName: string): string;
    joinTableName(firstTableName: string, secondTableName: string, firstPropertyName: string, secondPropertyName: string): string;
    joinTableColumnDuplicationPrefix(columnName: string, index: number): string;
    joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string;
    joinTableInverseColumnName(tableName: string, propertyName: string, columnName?: string): string;
    /**
     * Adds globally set prefix to the table name.
     * This method is executed no matter if prefix was set or not.
     * Table name is either user's given table name, either name generated from entity target.
     * Note that table name comes here already normalized by #tableName method.
     */
    prefixTableName(prefix: string, tableName: string): string;
    nestedSetColumnNames: {
        left: string;
        right: string;
    };
    materializedPathColumnName: string;
}
