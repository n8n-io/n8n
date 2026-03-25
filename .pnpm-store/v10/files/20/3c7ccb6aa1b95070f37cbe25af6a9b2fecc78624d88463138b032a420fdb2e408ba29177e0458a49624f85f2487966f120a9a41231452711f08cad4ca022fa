import { DataSource, SelectQueryBuilder } from "..";
import { OrderByCondition } from "../find-options/OrderByCondition";
import { TableType } from "../metadata/types/TableTypes";
/**
 * Arguments for TableMetadata class, helps to construct an TableMetadata object.
 */
export interface TableMetadataArgs {
    /**
     * Class to which table is applied.
     * Function target is a table defined in the class.
     * String target is a table defined in a json schema.
     */
    target: Function | string;
    /**
     * Table's name. If name is not set then table's name will be generated from target's name.
     */
    name?: string;
    /**
     * Table type. Tables can be abstract, closure, junction, embedded, etc.
     */
    type: TableType;
    /**
     * Specifies a default order by used for queries from this table when no explicit order by is specified.
     */
    orderBy?: OrderByCondition | ((object: any) => OrderByCondition | any);
    /**
     * Table's database engine type (like "InnoDB", "MyISAM", etc).
     */
    engine?: string;
    /**
     * Database name. Used in MySql and Sql Server.
     */
    database?: string;
    /**
     * Schema name. Used in Postgres and Sql Server.
     */
    schema?: string;
    /**
     * Indicates if schema synchronization is enabled or disabled for this entity.
     * If it will be set to false then schema sync will and migrations ignore this entity.
     * By default schema synchronization is enabled for all entities.
     */
    synchronize?: boolean;
    /**
     * View expression.
     */
    expression?: string | ((connection: DataSource) => SelectQueryBuilder<any>);
    /**
     * View dependencies.
     */
    dependsOn?: Set<Function | string>;
    /**
     * Indicates if view is materialized
     */
    materialized?: boolean;
    /**
     * If set to 'true' this option disables Sqlite's default behaviour of secretly creating
     * an integer primary key column named 'rowid' on table creation.
     */
    withoutRowid?: boolean;
    /**
     * Table comment. Not supported by all database types.
     */
    comment?: string;
}
