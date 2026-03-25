import { Table } from "../schema-builder/table/Table";
import { View } from "../schema-builder/view/View";
/**
 * Naming strategy defines how auto-generated names for such things like table name, or table column gonna be
 * generated.
 */
export interface NamingStrategyInterface {
    /**
     * Naming strategy name.
     */
    name?: string;
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
    /**
     * Gets the table's column name from the given property name.
     */
    columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]): string;
    /**
     * Gets the table's relation name from the given property name.
     */
    relationName(propertyName: string): string;
    /**
     * Gets the table's primary key name from the given table name and column names.
     */
    primaryKeyName(tableOrName: Table | string, columnNames: string[]): string;
    /**
     * Gets the table's unique constraint name from the given table name and column names.
     */
    uniqueConstraintName(tableOrName: Table | string, columnNames: string[]): string;
    /**
     * Gets the relation constraint (UNIQUE or UNIQUE INDEX) name from the given table name, column names
     * and WHERE condition, if UNIQUE INDEX used.
     */
    relationConstraintName(tableOrName: Table | string, columnNames: string[], where?: string): string;
    /**
     * Gets the table's default constraint name from the given table name and column name.
     */
    defaultConstraintName(tableOrName: Table | string, columnName: string): string;
    /**
     * Gets the name of the foreign key.
     */
    foreignKeyName(tableOrName: Table | string, columnNames: string[], referencedTablePath?: string, referencedColumnNames?: string[]): string;
    /**
     * Gets the name of the index - simple and compose index.
     */
    indexName(tableOrName: Table | View | string, columns: string[], where?: string): string;
    /**
     * Gets the name of the check constraint.
     *
     * "isEnum" parameter is used to indicate if this check constraint used
     * to handle "simple-enum" type for databases that are not supporting "enum"
     * type out of the box. If "true", constraint is ignored during CHECK constraints
     * synchronization.
     */
    checkConstraintName(tableOrName: Table | string, expression: string, isEnum?: boolean): string;
    /**
     * Gets the name of the exclusion constraint.
     */
    exclusionConstraintName(tableOrName: Table | string, expression: string): string;
    /**
     * Gets the name of the join column used in the one-to-one and many-to-one relations.
     */
    joinColumnName(relationName: string, referencedColumnName: string): string;
    /**
     * Gets the name of the join table used in the many-to-many relations.
     */
    joinTableName(firstTableName: string, secondTableName: string, firstPropertyName: string, secondPropertyName: string): string;
    /**
     * Columns in join tables can have duplicate names in case of self-referencing.
     * This method provide a resolution for such column names.
     */
    joinTableColumnDuplicationPrefix(columnName: string, index: number): string;
    /**
     * Gets the name of the column used for columns in the junction tables.
     *
     * The reverse?:boolean parameter denotes if the joinTableColumnName is called for the junctionColumn (false)
     * or the inverseJunctionColumns (true)
     */
    joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string;
    /**
     * Gets the name of the column used for columns in the junction tables from the invers side of the relationship.
     */
    joinTableInverseColumnName(tableName: string, propertyName: string, columnName?: string): string;
    /**
     * Adds globally set prefix to the table name.
     * This method is executed no matter if prefix was set or not.
     * Table name is either user's given table name, either name generated from entity target.
     * Note that table name comes here already normalized by #tableName method.
     */
    prefixTableName(prefix: string, tableName: string): string;
    /**
     * Column names for nested sets.
     */
    nestedSetColumnNames: {
        left: string;
        right: string;
    };
    /**
     * Column name for materialized paths.
     */
    materializedPathColumnName: string;
}
