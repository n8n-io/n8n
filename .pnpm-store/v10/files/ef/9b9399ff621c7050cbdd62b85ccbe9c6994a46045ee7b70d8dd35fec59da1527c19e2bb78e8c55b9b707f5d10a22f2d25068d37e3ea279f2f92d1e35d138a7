import type { $MemberSchema, $Schema, $SchemaRef, NormalizedSchema as INormalizedSchema, SchemaRef, SchemaTraitsObject, StaticSchema } from "@smithy/types";
/**
 * Wraps both class instances, numeric sentinel values, and member schema pairs.
 * Presents a consistent interface for interacting with polymorphic schema representations.
 *
 * @public
 */
export declare class NormalizedSchema implements INormalizedSchema {
    readonly ref: $SchemaRef;
    private readonly memberName?;
    static readonly symbol: unique symbol;
    protected readonly symbol: symbol;
    private readonly name;
    private readonly schema;
    private readonly _isMemberSchema;
    private readonly traits;
    private readonly memberTraits;
    private normalizedTraits?;
    /**
     * @param ref - a polymorphic SchemaRef to be dereferenced/normalized.
     * @param memberName - optional memberName if this NormalizedSchema should be considered a member schema.
     */
    private constructor();
    static [Symbol.hasInstance](lhs: unknown): lhs is NormalizedSchema;
    /**
     * Static constructor that attempts to avoid wrapping a NormalizedSchema within another.
     */
    static of(ref: SchemaRef | $SchemaRef): NormalizedSchema;
    /**
     * @returns the underlying non-normalized schema.
     */
    getSchema(): Exclude<$Schema, $MemberSchema | INormalizedSchema>;
    /**
     * @param withNamespace - qualifies the name.
     * @returns e.g. `MyShape` or `com.namespace#MyShape`.
     */
    getName(withNamespace?: boolean): string | undefined;
    /**
     * @returns the member name if the schema is a member schema.
     */
    getMemberName(): string;
    isMemberSchema(): boolean;
    /**
     * boolean methods on this class help control flow in shape serialization and deserialization.
     */
    isListSchema(): boolean;
    isMapSchema(): boolean;
    isStructSchema(): boolean;
    isBlobSchema(): boolean;
    isTimestampSchema(): boolean;
    isUnitSchema(): boolean;
    isDocumentSchema(): boolean;
    isStringSchema(): boolean;
    isBooleanSchema(): boolean;
    isNumericSchema(): boolean;
    isBigIntegerSchema(): boolean;
    isBigDecimalSchema(): boolean;
    isStreaming(): boolean;
    /**
     * This is a shortcut to avoid calling `getMergedTraits().idempotencyToken` on every string.
     * @returns whether the schema has the idempotencyToken trait.
     */
    isIdempotencyToken(): boolean;
    /**
     * @returns own traits merged with member traits, where member traits of the same trait key take priority.
     * This method is cached.
     */
    getMergedTraits(): SchemaTraitsObject;
    /**
     * @returns only the member traits. If the schema is not a member, this returns empty.
     */
    getMemberTraits(): SchemaTraitsObject;
    /**
     * @returns only the traits inherent to the shape or member target shape if this schema is a member.
     * If there are any member traits they are excluded.
     */
    getOwnTraits(): SchemaTraitsObject;
    /**
     * @returns the map's key's schema. Returns a dummy Document schema if this schema is a Document.
     *
     * @throws Error if the schema is not a Map or Document.
     */
    getKeySchema(): NormalizedSchema;
    /**
     * @returns the schema of the map's value or list's member.
     * Returns a dummy Document schema if this schema is a Document.
     *
     * @throws Error if the schema is not a Map, List, nor Document.
     */
    getValueSchema(): NormalizedSchema;
    /**
     * @returns the NormalizedSchema for the given member name. The returned instance will return true for `isMemberSchema()`
     * and will have the member name given.
     * @param memberName - which member to retrieve and wrap.
     *
     * @throws Error if member does not exist or the schema is neither a document nor structure.
     * Note that errors are assumed to be structures and unions are considered structures for these purposes.
     */
    getMemberSchema(memberName: string): NormalizedSchema;
    /**
     * This can be used for checking the members as a hashmap.
     * Prefer the structIterator method for iteration.
     *
     * This does NOT return list and map members, it is only for structures.
     *
     * @deprecated use (checked) structIterator instead.
     *
     * @returns a map of member names to member schemas (normalized).
     */
    getMemberSchemas(): Record<string, NormalizedSchema>;
    /**
     * @returns member name of event stream or empty string indicating none exists or this
     * isn't a structure schema.
     */
    getEventStreamMember(): string;
    /**
     * Allows iteration over members of a structure schema.
     * Each yield is a pair of the member name and member schema.
     *
     * This avoids the overhead of calling Object.entries(ns.getMemberSchemas()).
     */
    structIterator(): Generator<[string, NormalizedSchema], undefined, undefined>;
}
/**
 * @internal
 */
export declare const isStaticSchema: (sc: SchemaRef) => sc is StaticSchema;
