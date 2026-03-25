import { Range } from '../nodes/Node.js';
import { Scalar } from '../nodes/Scalar.js';
import type { FlowScalar } from '../parse/cst.js';
import type { ComposeErrorHandler } from './composer.js';
export declare function resolveFlowScalar(scalar: FlowScalar, strict: boolean, onError: ComposeErrorHandler): {
    value: string;
    type: Scalar.PLAIN | Scalar.QUOTE_DOUBLE | Scalar.QUOTE_SINGLE | null;
    comment: string;
    range: Range;
};
