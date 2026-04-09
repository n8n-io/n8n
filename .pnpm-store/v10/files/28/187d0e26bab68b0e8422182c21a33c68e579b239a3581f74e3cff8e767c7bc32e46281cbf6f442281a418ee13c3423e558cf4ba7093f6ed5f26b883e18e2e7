export class TypeRegistry {
    namespace;
    schemas;
    exceptions;
    static registries = new Map();
    constructor(namespace, schemas = new Map(), exceptions = new Map()) {
        this.namespace = namespace;
        this.schemas = schemas;
        this.exceptions = exceptions;
    }
    static for(namespace) {
        if (!TypeRegistry.registries.has(namespace)) {
            TypeRegistry.registries.set(namespace, new TypeRegistry(namespace));
        }
        return TypeRegistry.registries.get(namespace);
    }
    copyFrom(other) {
        const { schemas, exceptions } = this;
        for (const [k, v] of other.schemas) {
            if (!schemas.has(k)) {
                schemas.set(k, v);
            }
        }
        for (const [k, v] of other.exceptions) {
            if (!exceptions.has(k)) {
                exceptions.set(k, v);
            }
        }
    }
    register(shapeId, schema) {
        const qualifiedName = this.normalizeShapeId(shapeId);
        for (const r of [this, TypeRegistry.for(qualifiedName.split("#")[0])]) {
            r.schemas.set(qualifiedName, schema);
        }
    }
    getSchema(shapeId) {
        const id = this.normalizeShapeId(shapeId);
        if (!this.schemas.has(id)) {
            throw new Error(`@smithy/core/schema - schema not found for ${id}`);
        }
        return this.schemas.get(id);
    }
    registerError(es, ctor) {
        const $error = es;
        const ns = $error[1];
        for (const r of [this, TypeRegistry.for(ns)]) {
            r.schemas.set(ns + "#" + $error[2], $error);
            r.exceptions.set($error, ctor);
        }
    }
    getErrorCtor(es) {
        const $error = es;
        if (this.exceptions.has($error)) {
            return this.exceptions.get($error);
        }
        const registry = TypeRegistry.for($error[1]);
        return registry.exceptions.get($error);
    }
    getBaseException() {
        for (const exceptionKey of this.exceptions.keys()) {
            if (Array.isArray(exceptionKey)) {
                const [, ns, name] = exceptionKey;
                const id = ns + "#" + name;
                if (id.startsWith("smithy.ts.sdk.synthetic.") && id.endsWith("ServiceException")) {
                    return exceptionKey;
                }
            }
        }
        return undefined;
    }
    find(predicate) {
        return [...this.schemas.values()].find(predicate);
    }
    clear() {
        this.schemas.clear();
        this.exceptions.clear();
    }
    normalizeShapeId(shapeId) {
        if (shapeId.includes("#")) {
            return shapeId;
        }
        return this.namespace + "#" + shapeId;
    }
}
