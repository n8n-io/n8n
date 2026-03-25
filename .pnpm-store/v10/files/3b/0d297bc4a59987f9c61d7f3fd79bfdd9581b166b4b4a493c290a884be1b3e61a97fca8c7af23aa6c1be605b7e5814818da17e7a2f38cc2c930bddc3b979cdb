import { ReducedZodChannel, SchemaMeta, SchemaMetaRegistry } from "./meta.cjs";
import * as core from "zod/v4/core";
import { $ZodRegistry, $ZodType, $replace } from "zod/v4/core";

//#region src/graph/zod/zod-registry.d.ts

/**
 * A Zod v4-compatible meta registry that extends the base registry.
 *
 * This registry allows you to associate and retrieve metadata for Zod schemas,
 * leveraging the base registry for storage. It is compatible with Zod v4 and
 * interoperates with the base registry to ensure consistent metadata management
 * across different Zod versions.
 *
 * @template Meta - The type of metadata associated with each schema.
 * @template Schema - The Zod schema type.
 */
declare class LanggraphZodMetaRegistry<Meta extends SchemaMeta = SchemaMeta, Schema extends $ZodType = $ZodType> extends $ZodRegistry<Meta & {
  [key: string]: unknown;
}, Schema> {
  protected parent: SchemaMetaRegistry;
  /**
   * Creates a new LanggraphZodMetaRegistry instance.
   *
   * @param parent - The base SchemaMetaRegistry to use for metadata storage.
   */
  constructor(parent: SchemaMetaRegistry);
  add<S extends Schema>(schema: S, ..._meta: undefined extends Meta & {
    [key: string]: unknown;
  } ? [$replace<Meta & {
    [key: string]: unknown;
  }, S>?] : [$replace<Meta & {
    [key: string]: unknown;
  }, S>]): this;
}
// Augment the zod/v4 module nudging the `register` method
// to use the user provided input schema if specified.
declare module "zod/v4" {
  interface ZodType<out Output = unknown, out Input = unknown, out Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<Output, Input>> extends core.$ZodType<Output, Input, Internals> {
    register<R extends LanggraphZodMetaRegistry, TOutput = core.output<this>, TInput = core.input<this>, TInternals extends core.$ZodTypeInternals<TOutput, TInput> = core.$ZodTypeInternals<TOutput, TInput>>(registry: R, meta: SchemaMeta<TOutput, TInput>): ReducedZodChannel<this, ZodType<TOutput, TInput, TInternals>>;
  }
}
declare module "zod/v4-mini" {
  interface ZodMiniType<out Output = unknown, out Input = unknown, out Internals extends core.$ZodTypeInternals<Output, Input> = core.$ZodTypeInternals<Output, Input>> extends core.$ZodType<Output, Input, Internals> {
    register<R extends LanggraphZodMetaRegistry, TOutput = core.output<this>, TInput = core.input<this>, TInternals extends core.$ZodTypeInternals<TOutput, TInput> = core.$ZodTypeInternals<TOutput, TInput>>(registry: R, meta: SchemaMeta<TOutput, TInput>): ReducedZodChannel<this, ZodMiniType<TOutput, TInput, TInternals>>;
  }
}
declare const registry: LanggraphZodMetaRegistry<SchemaMeta<any, any>, $ZodType<unknown, unknown, core.$ZodTypeInternals<unknown, unknown>>>;
//#endregion
export { LanggraphZodMetaRegistry, registry };
//# sourceMappingURL=zod-registry.d.cts.map