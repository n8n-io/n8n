export = StackUtils;

declare class StackUtils {
    static nodeInternals(): RegExp[];
    constructor(options?: StackUtils.Options);
    clean(stack: string | string[]): string;
    capture(limit?: number, startStackFunction?: Function): StackUtils.CallSite[];
    capture(startStackFunction: Function): StackUtils.CallSite[];
    captureString(limit?: number, startStackFunction?: Function): string;
    captureString(startStackFunction: Function): string;
    at(startStackFunction?: Function): StackUtils.CallSiteLike;
    parseLine(line: string): StackUtils.StackLineData | null;
}

declare namespace StackUtils {
    interface Options {
        internals?: RegExp[] | undefined;
        ignoredPackages?: string[] | undefined;
        cwd?: string | undefined;
        wrapCallSite?(callSite: CallSite): CallSite;
    }

    interface CallSite {
        getThis(): object | undefined;
        getTypeName(): string;
        getFunction(): Function | undefined;
        getFunctionName(): string;
        getMethodName(): string | null;
        getFileName(): string | undefined;
        getLineNumber(): number;
        getColumnNumber(): number;
        getEvalOrigin(): CallSite | string;
        isToplevel(): boolean;
        isEval(): boolean;
        isNative(): boolean;
        isConstructor(): boolean;
    }

    interface CallSiteLike extends StackData {
        type?: string | undefined;
    }

    interface StackLineData extends StackData {
        evalLine?: number | undefined;
        evalColumn?: number | undefined;
        evalFile?: string | undefined;
    }

    interface StackData {
        line?: number | undefined;
        column?: number | undefined;
        file?: string | undefined;
        constructor?: boolean | undefined;
        evalOrigin?: string | undefined;
        native?: boolean | undefined;
        function?: string | undefined;
        method?: string | undefined;
    }
}
