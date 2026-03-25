import { AbortHandler, AbortSignal as DeprecatedAbortSignal } from "@smithy/types";
/**
 * @public
 */
export { AbortHandler, DeprecatedAbortSignal as IAbortSignal };
/**
 * @public
 */
export declare class AbortSignal implements DeprecatedAbortSignal {
    onabort: AbortHandler | null;
    private _aborted;
    constructor();
    /**
     * Whether the associated operation has already been cancelled.
     */
    get aborted(): boolean;
    /**
     * @internal
     */
    abort(): void;
}
