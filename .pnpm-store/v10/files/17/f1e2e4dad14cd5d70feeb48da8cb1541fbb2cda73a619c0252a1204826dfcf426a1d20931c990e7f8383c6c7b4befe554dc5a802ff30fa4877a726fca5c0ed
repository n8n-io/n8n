import { IReactionDisposer, Lambda, GenericAbortSignal } from "../internal";
export interface IWhenOptions {
    name?: string;
    timeout?: number;
    onError?: (error: any) => void;
    signal?: GenericAbortSignal;
}
export declare function when(predicate: () => boolean, opts?: IWhenOptions): Promise<void> & {
    cancel(): void;
};
export declare function when(predicate: () => boolean, effect: Lambda, opts?: IWhenOptions): IReactionDisposer;
