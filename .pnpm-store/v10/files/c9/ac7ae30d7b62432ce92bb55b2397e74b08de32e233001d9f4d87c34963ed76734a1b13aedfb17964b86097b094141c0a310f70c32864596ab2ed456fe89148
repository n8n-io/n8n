/**
 * Polyfill Symbol.metadata
 * @see https://github.com/microsoft/TypeScript/issues/53461
 */
Symbol.metadata ??= Symbol.for('Symbol.metadata');
Object.assign(Symbol, {
    size: Symbol('uSize'),
    serialize: Symbol('uSerialize'),
    deserialize: Symbol('uDeserialize'),
});
/**
 * Initializes the struct metadata for a class
 * This also handles copying metadata from parent classes
 */
export function initMetadata(context) {
    context.metadata ??= {};
    context.metadata.structInit = [...(context.metadata.structInit ?? [])];
    return context.metadata.structInit;
}
export function isValidMetadata(arg) {
    return arg != null && typeof arg == 'object' && 'struct' in arg;
}
/**
 * Polyfill context.metadata
 * @see https://github.com/microsoft/TypeScript/issues/53461
 * @internal @hidden
 */
export function _polyfill_metadata(target) {
    if (Symbol.metadata in target)
        return;
    Object.defineProperty(target, Symbol.metadata, {
        enumerable: true,
        configurable: true,
        writable: true,
        value: Object.create(null),
    });
}
export function isStatic(arg) {
    return typeof arg == 'function' && Symbol.metadata in arg && isValidMetadata(arg[Symbol.metadata]);
}
export function isInstance(arg) {
    return arg != null && typeof arg == 'object' && isStatic(arg.constructor);
}
export function checkInstance(arg) {
    if (isInstance(arg))
        return;
    throw new TypeError((typeof arg == 'function' ? arg.name : typeof arg == 'object' && arg ? arg.constructor.name : arg)
        + ' is not a struct instance');
}
export function isStruct(arg) {
    return isInstance(arg) || isStatic(arg);
}
export function checkStruct(arg) {
    if (isStruct(arg))
        return;
    throw new TypeError((typeof arg == 'function' ? arg.name : typeof arg == 'object' && arg ? arg.constructor.name : arg)
        + ' is not a struct');
}
export function isCustom(arg) {
    return typeof arg == 'object' && arg != null && Symbol.size in arg;
}
