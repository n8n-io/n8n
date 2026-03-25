declare namespace getAsyncFunction {
    type AsyncFunction<T = unknown> = (...args: any[]) => Promise<T>;

    interface AsyncFunctionConstructor extends FunctionConstructor {
        new <T>(...args: string[]): AsyncFunction<T>;
        <T>(...args: string[]): AsyncFunction<T>;
        readonly prototype: AsyncFunction;
    }
}

declare function getAsyncFunction(): getAsyncFunction.AsyncFunctionConstructor | false;

export = getAsyncFunction;