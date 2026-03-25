import { BaseStore } from "@langchain/core/stores";
import { FieldPaths, FunctionReference, GenericActionCtx, GenericDataModel, NamedTableInfo, TableNamesInDataModel, VectorIndexNames } from "convex/server";
import { Value } from "convex/values";

//#region src/storage/convex.d.ts

/**
 * Type that defines the config required to initialize the
 * ConvexKVStore class. It includes the table name,
 * index name, field name.
 */
type ConvexKVStoreConfig<DataModel extends GenericDataModel, TableName extends TableNamesInDataModel<DataModel>, IndexName extends VectorIndexNames<NamedTableInfo<DataModel, TableName>>, KeyFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, ValueFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, UpsertMutation extends FunctionReference<"mutation", "internal", {
  table: string;
  document: object;
}>, LookupQuery extends FunctionReference<"query", "internal", {
  table: string;
  index: string;
  keyField: string;
  key: string;
}, object[]>, DeleteManyMutation extends FunctionReference<"mutation", "internal", {
  table: string;
  index: string;
  keyField: string;
  key: string;
}>> = {
  readonly ctx: GenericActionCtx<DataModel>;
  /**
   * Defaults to "cache"
   */
  readonly table?: TableName;
  /**
   * Defaults to "byKey"
   */
  readonly index?: IndexName;
  /**
   * Defaults to "key"
   */
  readonly keyField?: KeyFieldName;
  /**
   * Defaults to "value"
   */
  readonly valueField?: ValueFieldName;
  /**
   * Defaults to `internal.langchain.db.upsert`
   */
  readonly upsert?: UpsertMutation;
  /**
   * Defaults to `internal.langchain.db.lookup`
   */
  readonly lookup?: LookupQuery;
  /**
   * Defaults to `internal.langchain.db.deleteMany`
   */
  readonly deleteMany?: DeleteManyMutation;
};
/**
 * Class that extends the BaseStore class to interact with a Convex
 * database. It provides methods for getting, setting, and deleting key value pairs,
 * as well as yielding keys from the database.
 */
declare class ConvexKVStore<T extends Value, DataModel extends GenericDataModel, TableName extends TableNamesInDataModel<DataModel>, IndexName extends VectorIndexNames<NamedTableInfo<DataModel, TableName>>, KeyFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, ValueFieldName extends FieldPaths<NamedTableInfo<DataModel, TableName>>, UpsertMutation extends FunctionReference<"mutation", "internal", {
  table: string;
  document: object;
}>, LookupQuery extends FunctionReference<"query", "internal", {
  table: string;
  index: string;
  keyField: string;
  key: string;
}, object[]>, DeleteManyMutation extends FunctionReference<"mutation", "internal", {
  table: string;
  index: string;
  keyField: string;
  key: string;
}>> extends BaseStore<string, T> {
  lc_namespace: string[];
  private readonly ctx;
  private readonly table;
  private readonly index;
  private readonly keyField;
  private readonly valueField;
  private readonly upsert;
  private readonly lookup;
  private readonly deleteMany;
  constructor(config: ConvexKVStoreConfig<DataModel, TableName, IndexName, KeyFieldName, ValueFieldName, UpsertMutation, LookupQuery, DeleteManyMutation>);
  /**
   * Gets multiple keys from the Convex database.
   * @param keys Array of keys to be retrieved.
   * @returns An array of retrieved values.
   */
  mget(keys: string[]): Promise<(T | undefined)[]>;
  /**
   * Sets multiple keys in the Convex database.
   * @param keyValuePairs Array of key-value pairs to be set.
   * @returns Promise that resolves when all keys have been set.
   */
  mset(keyValuePairs: [string, T][]): Promise<void>;
  /**
   * Deletes multiple keys from the Convex database.
   * @param keys Array of keys to be deleted.
   * @returns Promise that resolves when all keys have been deleted.
   */
  mdelete(keys: string[]): Promise<void>;
  /**
   * Yields keys from the Convex database.
   * @param prefix Optional prefix to filter the keys.
   * @returns An AsyncGenerator that yields keys from the Convex database.
   */
  yieldKeys(_prefix?: string): AsyncGenerator<string>;
}
//#endregion
export { ConvexKVStore, ConvexKVStoreConfig };
//# sourceMappingURL=convex.d.cts.map