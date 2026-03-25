import type { SchemaTraits, TraitsSchema } from "@smithy/types";
/**
 * Abstract base for class-based Schema except NormalizedSchema.
 *
 * @internal
 * @deprecated use StaticSchema
 */
export declare abstract class Schema implements TraitsSchema {
    name: string;
    namespace: string;
    traits: SchemaTraits;
    protected abstract readonly symbol: symbol;
    static assign<T extends Schema>(instance: T, values: Omit<T, "getName" | "symbol">): T;
    static [Symbol.hasInstance](lhs: unknown): boolean;
    getName(): string;
}
