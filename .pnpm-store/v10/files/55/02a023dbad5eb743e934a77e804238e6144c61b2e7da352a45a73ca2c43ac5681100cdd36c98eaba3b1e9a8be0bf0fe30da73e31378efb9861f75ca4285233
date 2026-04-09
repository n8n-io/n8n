export interface CreateLoggerOptions {
    /**
     * The function used to output
     * @default console.log
     */
    output?: (...args: any[]) => void;
    stringify?: (value: unknown) => string;
    /**
     * Whether to output the class name when logging methods
     * @default true
     */
    className?: boolean;
    /**
     * The separator used to separate the class name and method.
     * Ignored if `className` is `false`
     * @default '#'
     */
    separator?: string;
    /**
     * Whether to log the return value
     * @default false
     */
    returnValue?: boolean;
}
type LoggableDecoratorContext = Exclude<DecoratorContext, ClassFieldDecoratorContext>;
/**
 * Create a function that can be used to decorate classes and non-field members.
 */
export declare function createLogDecorator(options: CreateLoggerOptions): <T extends (...args: any[]) => any>(value: T, context: LoggableDecoratorContext) => T;
/**
 * @internal @hidden
 */
export declare let U_DEBUG: boolean;
/**
 * @internal @hidden
 */
export declare function _setDebug(value: boolean): void;
/**
 * @internal @hidden
 */
export declare function _debugLog(...text: any[]): void;
export {};
