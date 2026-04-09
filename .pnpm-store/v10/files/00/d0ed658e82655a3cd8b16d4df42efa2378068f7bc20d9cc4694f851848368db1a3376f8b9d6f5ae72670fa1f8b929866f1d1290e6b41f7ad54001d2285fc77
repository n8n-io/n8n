export declare function wait(time: number): Promise<unknown>;
export declare const greekLetterNames: string[];
export declare function isHex(str: string): boolean;
/** Prevent infinite loops */
export declare function canary(error?: Error): () => void;
/**
 * A wrapper for throwing things in an expression context.
 * You will likely want to remove this if you can just use `throw` in expressions.
 * @see https://github.com/tc39/proposal-throw-expressions
 */
export declare function _throw(e: unknown): never;
interface MemoizeMetadata extends DecoratorMetadata {
    memoized?: Record<PropertyKey, any>;
}
/**
 * Decorator for memoizing the result of a getter.
 */
export declare function memoize<T, This>(get: () => T, context: ClassGetterDecoratorContext<This, T> & {
    metadata?: MemoizeMetadata;
}): (this: This) => T;
export {};
