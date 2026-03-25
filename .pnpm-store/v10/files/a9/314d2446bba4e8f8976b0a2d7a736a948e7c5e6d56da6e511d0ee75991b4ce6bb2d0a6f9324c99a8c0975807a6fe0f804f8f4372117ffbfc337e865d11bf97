/**
 * Provides a version-independent implementation of the JavaScript `instanceof` operator.
 *
 * @remarks
 * The JavaScript `instanceof` operator normally only identifies objects from a particular library instance.
 * For example, suppose the NPM package `example-lib` has two published versions 1.2.0 and 1.3.0, and
 * it exports a class called `A`.  Suppose some code consumes version `1.3.0` of the library, but it receives
 * an object that was constructed using version `1.2.0`.  In this situation `a instanceof A` will return `false`,
 * even though `a` is an instance of `A`.  The reason is that there are two prototypes for `A`; one for each
 * version.
 *
 * The `TypeUuid` facility provides a way to make `a instanceof A` return true for both prototypes of `A`,
 * by instead using a universally unique identifier (UUID) to detect object instances.
 *
 * You can use `Symbol.hasInstance` to enable the system `instanceof` operator to recognize type UUID equivalence:
 * ```ts
 * const uuidWidget: string = '9c340ef0-d29f-4e2e-a09f-42bacc59024b';
 * class Widget {
 *   public static [Symbol.hasInstance](instance: object): boolean {
 *     return TypeUuid.isInstanceOf(instance, uuidWidget);
 *   }
 * }
 * ```
 * // Example usage:
 * ```ts
 * import { Widget as Widget1 } from 'v1-of-library';
 * import { Widget as Widget2 } from 'v2-of-library';
 * const widget = new Widget2();
 * console.log(widget instanceof Widget1); // prints true
 * ```
 *
 * @public
 */
export declare class TypeUuid {
    private static _uuidRegExp;
    /**
     * Registers a JavaScript class as having a type identified by the specified UUID.
     * @privateRemarks
     * We cannot use a construct signature for `targetClass` because it may be an abstract class.
     */
    static registerClass(targetClass: any, typeUuid: string): void;
    /**
     * Returns true if the `targetObject` is an instance of a JavaScript class that was previously
     * registered using the specified `typeUuid`.  Base classes are also considered.
     */
    static isInstanceOf(targetObject: unknown, typeUuid: string): boolean;
}
//# sourceMappingURL=TypeUuid.d.ts.map