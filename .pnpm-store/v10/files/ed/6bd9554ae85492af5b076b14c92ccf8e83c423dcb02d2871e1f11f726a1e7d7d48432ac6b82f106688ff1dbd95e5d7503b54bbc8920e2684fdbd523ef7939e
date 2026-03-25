/**
 * Describes all entity view's options.
 */
import { DataSource, SelectQueryBuilder } from "../..";
export interface ViewEntityOptions {
    /**
     * View name.
     * If not specified then naming strategy will generate view name from class name.
     */
    name?: string;
    /**
     * View expression.
     */
    expression?: string | ((connection: DataSource) => SelectQueryBuilder<any>);
    /**
     * Database name. Used in Mysql and Sql Server.
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
     * Indicates if view should be materialized view.
     * It's supported by Postgres and Oracle.
     */
    materialized?: boolean;
    /**
     * View dependencies. In case the view depends on another view it can be listed here
     * to ensure correct order of view migrations.
     */
    dependsOn?: (Function | string)[];
}
