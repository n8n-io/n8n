/**
 * Used to create Error subclasses until the community moves away from ES5.
 *
 * This is because compiling from TypeScript down to ES5 has issues with subclassing Errors
 * as well as other built-in types: https://github.com/Microsoft/TypeScript/issues/12123
 *
 * @param createImpl A factory function to create the actual constructor implementation. The returned
 * function should be a named function that calls `_super` internally.
 */
export declare function createErrorClass<T>(createImpl: (_super: any) => any): T;
//# sourceMappingURL=createErrorClass.d.ts.map