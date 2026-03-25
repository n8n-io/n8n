import { isObject, isObjectLike } from "./is.mjs";
import { THE_CONSTRUCTOR_PROPERTY_VALUE_IS_NOT_AN_OBJECT } from "./messages.mjs";
import { NativeTypeError, ReflectGetPrototypeOf, ReflectHas, SymbolFor } from "./primordials.mjs";

export const brand = SymbolFor("__Float16Array__");

/**
 * @param {unknown} target
 * @throws {TypeError}
 * @returns {boolean}
 */
export function hasFloat16ArrayBrand(target) {
  if (!isObjectLike(target)) {
    return false;
  }

  const prototype = ReflectGetPrototypeOf(target);
  if (!isObjectLike(prototype)) {
    return false;
  }

  const constructor = prototype.constructor;
  if (constructor === undefined) {
    return false;
  }
  if (!isObject(constructor)) {
    throw NativeTypeError(THE_CONSTRUCTOR_PROPERTY_VALUE_IS_NOT_AN_OBJECT);
  }

  return ReflectHas(constructor, brand);
}
