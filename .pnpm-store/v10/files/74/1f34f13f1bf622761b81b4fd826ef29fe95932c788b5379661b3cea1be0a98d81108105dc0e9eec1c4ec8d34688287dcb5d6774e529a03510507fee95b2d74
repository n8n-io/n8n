import { Schema as ISchema, StaticErrorSchema } from "@smithy/types";
import { ErrorSchema } from "./schemas/ErrorSchema";
/**
 * A way to look up schema by their ShapeId values.
 *
 * @public
 */
export declare class TypeRegistry {
    readonly namespace: string;
    private schemas;
    private exceptions;
    static readonly registries: Map<string, TypeRegistry>;
    private constructor();
    /**
     * @param namespace - specifier.
     * @returns the schema for that namespace, creating it if necessary.
     */
    static for(namespace: string): TypeRegistry;
    /**
     * Adds the given schema to a type registry with the same namespace.
     *
     * @param shapeId - to be registered.
     * @param schema - to be registered.
     */
    register(shapeId: string, schema: ISchema): void;
    /**
     * @param shapeId - query.
     * @returns the schema.
     */
    getSchema(shapeId: string): ISchema;
    /**
     * Associates an error schema with its constructor.
     */
    registerError(es: ErrorSchema | StaticErrorSchema, ctor: any): void;
    /**
     * @param es - query.
     * @returns Error constructor that extends the service's base exception.
     */
    getErrorCtor(es: ErrorSchema | StaticErrorSchema): any;
    /**
     * The smithy-typescript code generator generates a synthetic (i.e. unmodeled) base exception,
     * because generated SDKs before the introduction of schemas have the notion of a ServiceBaseException, which
     * is unique per service/model.
     *
     * This is generated under a unique prefix that is combined with the service namespace, and this
     * method is used to retrieve it.
     *
     * The base exception synthetic schema is used when an error is returned by a service, but we cannot
     * determine what existing schema to use to deserialize it.
     *
     * @returns the synthetic base exception of the service namespace associated with this registry instance.
     */
    getBaseException(): StaticErrorSchema | undefined;
    /**
     * @param predicate - criterion.
     * @returns a schema in this registry matching the predicate.
     */
    find(predicate: (schema: ISchema) => boolean): ISchema | undefined;
    /**
     * Unloads the current TypeRegistry.
     */
    clear(): void;
    private normalizeShapeId;
}
