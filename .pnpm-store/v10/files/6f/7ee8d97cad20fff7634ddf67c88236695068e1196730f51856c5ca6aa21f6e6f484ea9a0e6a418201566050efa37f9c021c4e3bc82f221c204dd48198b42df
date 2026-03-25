/**
 * If the Object prototype is frozen, the "toString" property is non-writable. This means that any objects which inherit this property
 * cannot have the property changed using a "=" assignment operator. If using strict mode, attempting that will cause an error. If not using
 * strict mode, attempting that will be silently ignored.
 *
 * If the Object prototype is frozen, inherited non-writable properties can still be shadowed using one of two mechanisms:
 *
 *  1. ES6 class methods: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#methods
 *  2. Using the `Object.defineProperty()` static method:
 *     https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
 *
 * However, this project uses Babel to transpile ES6 classes, and transforms ES6 class methods to use the assignment operator instead:
 * https://babeljs.io/docs/babel-plugin-transform-class-properties#options
 *
 * Therefore, the most compatible way to shadow the prototype's "toString" property is to define a new "toString" property on this object.
 */
export declare function setToString(object: object, toStringFn: () => string): void;
