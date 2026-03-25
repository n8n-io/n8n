import { AbortController as DeprecatedAbortController } from "@smithy/types";
import { AbortSignal } from "./AbortSignal";
/**
 * @public
 */
export { DeprecatedAbortController as IAbortController };
/**
 * @deprecated This implementation was added as Node.js didn't support AbortController prior to 15.x
 * Use native implementation in browsers or Node.js \>=15.4.0.
 *
 * @public
 */
export declare class AbortController implements DeprecatedAbortController {
    readonly signal: AbortSignal;
    abort(): void;
}
