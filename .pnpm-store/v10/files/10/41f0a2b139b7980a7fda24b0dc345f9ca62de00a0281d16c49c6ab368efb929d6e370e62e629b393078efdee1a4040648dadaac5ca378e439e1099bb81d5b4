import { Annotation } from "../internal";
import type { ClassMethodDecorator } from "../types/decorator_fills";
export declare const FLOW = "flow";
export declare function FlowCancellationError(): void;
export declare namespace FlowCancellationError {
    var prototype: any;
}
export declare function isFlowCancellationError(error: Error): boolean;
export type CancellablePromise<T> = Promise<T> & {
    cancel(): void;
};
interface Flow extends Annotation, PropertyDecorator, ClassMethodDecorator {
    <R, Args extends any[]>(generator: (...args: Args) => Generator<any, R, any> | AsyncGenerator<any, R, any>): (...args: Args) => CancellablePromise<R>;
    bound: Annotation & PropertyDecorator & ClassMethodDecorator;
}
export declare const flow: Flow;
export declare function flowResult<T>(result: T): T extends Generator<any, infer R, any> ? CancellablePromise<R> : T extends CancellablePromise<any> ? T : never;
export declare function isFlow(fn: any): boolean;
export {};
