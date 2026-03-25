'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const EqualityTraitSymbol = Symbol('Equality');

/**
 * @typedef {{ [EqualityTraitSymbol]:(other:EqualityTrait)=>boolean }} EqualityTrait
 */

/**
 *
 * Utility function to compare any two objects.
 *
 * Note that it is expected that the first parameter is more specific than the latter one.
 *
 * @example js
 *     class X { [traits.EqualityTraitSymbol] (other) { return other === this }  }
 *     class X2 { [traits.EqualityTraitSymbol] (other) { return other === this }, x2 () { return 2 }  }
 *     // this is fine
 *     traits.equals(new X2(), new X())
 *     // this is not, because the left type is less specific than the right one
 *     traits.equals(new X(), new X2())
 *
 * @template {EqualityTrait} T
 * @param {NoInfer<T>} a
 * @param {T} b
 * @return {boolean}
 */
const equals = (a, b) => a === b || !!a?.[EqualityTraitSymbol]?.(b) || false;

exports.EqualityTraitSymbol = EqualityTraitSymbol;
exports.equals = equals;
//# sourceMappingURL=equality.cjs.map
