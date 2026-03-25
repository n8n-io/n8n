import { ClassTransformer } from './ClassTransformer';
export { ClassTransformer } from './ClassTransformer';
export * from './decorators';
export * from './interfaces';
export * from './enums';
const classTransformer = new ClassTransformer();
export function classToPlain(object, options) {
    return classTransformer.instanceToPlain(object, options);
}
export function instanceToPlain(object, options) {
    return classTransformer.instanceToPlain(object, options);
}
export function classToPlainFromExist(object, plainObject, options) {
    return classTransformer.classToPlainFromExist(object, plainObject, options);
}
export function plainToClass(cls, plain, options) {
    return classTransformer.plainToInstance(cls, plain, options);
}
export function plainToInstance(cls, plain, options) {
    return classTransformer.plainToInstance(cls, plain, options);
}
export function plainToClassFromExist(clsObject, plain, options) {
    return classTransformer.plainToClassFromExist(clsObject, plain, options);
}
export function instanceToInstance(object, options) {
    return classTransformer.instanceToInstance(object, options);
}
export function classToClassFromExist(object, fromObject, options) {
    return classTransformer.classToClassFromExist(object, fromObject, options);
}
export function serialize(object, options) {
    return classTransformer.serialize(object, options);
}
/**
 * Deserializes given JSON string to a object of the given class.
 *
 * @deprecated This function is being removed. Please use the following instead:
 * ```
 * instanceToClass(cls, JSON.parse(json), options)
 * ```
 */
export function deserialize(cls, json, options) {
    return classTransformer.deserialize(cls, json, options);
}
/**
 * Deserializes given JSON string to an array of objects of the given class.
 *
 * @deprecated This function is being removed. Please use the following instead:
 * ```
 * JSON.parse(json).map(value => instanceToClass(cls, value, options))
 * ```
 *
 */
export function deserializeArray(cls, json, options) {
    return classTransformer.deserializeArray(cls, json, options);
}
//# sourceMappingURL=index.js.map