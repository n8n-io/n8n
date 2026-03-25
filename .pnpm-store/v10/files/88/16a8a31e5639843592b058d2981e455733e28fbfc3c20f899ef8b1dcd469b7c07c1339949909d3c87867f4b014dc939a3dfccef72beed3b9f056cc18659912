import { BaseChannel } from "../../channels/base.cjs";
import { InteropZodObject, InteropZodObjectShape, InteropZodType } from "@langchain/core/utils/types";

//#region src/graph/zod/meta.d.ts
declare const META_EXTRAS_DESCRIPTION_PREFIX = "lg:";
/** @internal */
type ReducedZodChannel<T extends InteropZodType, TReducerSchema extends InteropZodType> = T & {
  lg_reducer_schema: TReducerSchema;
};
/** @internal */
type InteropZodToStateDefinition<T extends InteropZodObject, TShape = InteropZodObjectShape<T>> = { [key in keyof TShape]: TShape[key] extends ReducedZodChannel<infer Schema, infer ReducerSchema> ? Schema extends InteropZodType<infer V> ? ReducerSchema extends InteropZodType<infer U> ? BaseChannel<V, U> : never : never : TShape[key] extends InteropZodType<infer V, infer U> ? BaseChannel<V, U> : never };
type UpdateType<T extends InteropZodObject, TShape = InteropZodObjectShape<T>> = { [key in keyof TShape]?: TShape[key] extends ReducedZodChannel<infer Schema, infer ReducerSchema> ? Schema extends InteropZodType<unknown> ? ReducerSchema extends InteropZodType<infer U> ? U : never : never : TShape[key] extends InteropZodType<unknown, infer U> ? U : never };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SchemaMeta<TValue = any, TUpdate = TValue> {
  jsonSchemaExtra?: {
    langgraph_nodes?: string[];
    langgraph_type?: "prompt" | "messages";
    [key: string]: unknown;
  };
  reducer?: {
    schema?: InteropZodType<TUpdate>;
    fn: (a: TValue, b: TUpdate) => TValue;
  };
  default?: () => TValue;
}
/**
 * A registry for storing and managing metadata associated with schemas.
 * This class provides methods to get, extend, remove, and check metadata for a given schema.
 */
declare class SchemaMetaRegistry {
  /**
   * Internal map storing schema metadata.
   * @internal
   */
  _map: WeakMap<InteropZodType, SchemaMeta<any, any>>;
  /**
   * Cache for extended schfemas.
   * @internal
   */
  _extensionCache: Map<string, WeakMap<InteropZodType, InteropZodType>>;
  /**
   * Retrieves the metadata associated with a given schema.
   * @template TValue The value type of the schema.
   * @template TUpdate The update type of the schema (defaults to TValue).
   * @param schema The schema to retrieve metadata for.
   * @returns The associated SchemaMeta, or undefined if not present.
   */
  get<TValue, TUpdate = TValue>(schema: InteropZodType<TValue>): SchemaMeta<TValue, TUpdate> | undefined;
  /**
   * Extends or sets the metadata for a given schema.
   * @template TValue The value type of the schema.
   * @template TUpdate The update type of the schema (defaults to TValue).
   * @param schema The schema to extend metadata for.
   * @param predicate A function that receives the existing metadata (or undefined) and returns the new metadata.
   */
  extend<TValue, TUpdate>(schema: InteropZodType<TValue>, predicate: (meta: SchemaMeta<TValue, TUpdate> | undefined) => SchemaMeta<TValue, TUpdate>): void;
  /**
   * Removes the metadata associated with a given schema.
   * @param schema The schema to remove metadata for.
   * @returns The SchemaMetaRegistry instance (for chaining).
   */
  remove(schema: InteropZodType): this;
  /**
   * Checks if metadata exists for a given schema.
   * @param schema The schema to check.
   * @returns True if metadata exists, false otherwise.
   */
  has(schema: InteropZodType): boolean;
  /**
   * Returns a mapping of channel instances for each property in the schema
   * using the associated metadata in the registry.
   *
   * This is used to create the `channels` object that's passed to the `Graph` constructor.
   *
   * @template T The shape of the schema.
   * @param schema The schema to extract channels from.
   * @returns A mapping from property names to channel instances.
   */
  getChannelsForSchema<T extends InteropZodObject>(schema: T): InteropZodToStateDefinition<T>;
  /**
   * Returns a modified schema that introspectively looks at all keys of the provided
   * object schema, and applies the augmentations based on meta provided with those keys
   * in the registry and the selectors provided in the `effects` parameter.
   *
   * This assumes that the passed in schema is the "root" schema object for a graph where
   * the keys of the schema are the channels of the graph. Because we need to represent
   * the input of a graph in a couple of different ways, the `effects` parameter allows
   * us to apply those augmentations based on pre determined conditions.
   *
   * @param schema The root schema object to extend.
   * @param effects The effects that are being applied.
   * @returns The extended schema.
   */
  getExtendedChannelSchemas<T extends InteropZodObject>(schema: T, effects: {
    /**
     * Augments the shape by using the reducer's schema if it exists
     */
    withReducerSchema?: boolean;
    /**
     * Applies the stringified jsonSchemaExtra as a description to the schema.
     */
    withJsonSchemaExtrasAsDescription?: boolean;
    /**
     * Applies the `.partial()` modifier to the schema.
     */
    asPartial?: boolean;
  }): InteropZodObject;
}
declare const schemaMetaRegistry: SchemaMetaRegistry;
declare function withLangGraph<TValue, TUpdate, TSchema extends InteropZodType<TValue>>(schema: TSchema, meta: SchemaMeta<TValue, TUpdate> & {
  reducer?: undefined;
}): TSchema;
declare function withLangGraph<TValue, TUpdate, TSchema extends InteropZodType<TValue>>(schema: TSchema, meta: SchemaMeta<TValue, TUpdate>): ReducedZodChannel<TSchema, InteropZodType<TUpdate>>;
//#endregion
export { InteropZodToStateDefinition, META_EXTRAS_DESCRIPTION_PREFIX, ReducedZodChannel, SchemaMeta, SchemaMetaRegistry, UpdateType, schemaMetaRegistry, withLangGraph };
//# sourceMappingURL=meta.d.cts.map