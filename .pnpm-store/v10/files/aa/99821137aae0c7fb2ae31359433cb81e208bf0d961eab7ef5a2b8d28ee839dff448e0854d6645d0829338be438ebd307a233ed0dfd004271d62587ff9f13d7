import { ErrorLike } from "./types";
/**
 * The Property Descriptor of a lazily-computed `stack` property.
 */
interface LazyStack {
    configurable: true;
    /**
     * Lazily computes the error's stack trace.
     */
    get(): string | undefined;
}
/**
 * Is the property lazily computed?
 */
export declare function isLazyStack(stackProp: PropertyDescriptor | undefined): stackProp is LazyStack;
/**
 * Is the stack property writable?
 */
export declare function isWritableStack(stackProp: PropertyDescriptor | undefined): boolean;
/**
 * Appends the original `Error.stack` property to the new Error's stack.
 */
export declare function joinStacks(newError: ErrorLike, originalError?: ErrorLike): string | undefined;
/**
 * Calls `joinStacks` lazily, when the `Error.stack` property is accessed.
 */
export declare function lazyJoinStacks(lazyStack: LazyStack, newError: ErrorLike, originalError?: ErrorLike): void;
export {};
