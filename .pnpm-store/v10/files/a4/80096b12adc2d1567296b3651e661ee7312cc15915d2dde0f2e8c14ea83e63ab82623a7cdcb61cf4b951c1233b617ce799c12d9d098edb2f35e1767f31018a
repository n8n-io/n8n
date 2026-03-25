import { Range } from '../nodes/Node.js';
import { Scalar } from '../nodes/Scalar.js';
import type { BlockScalar } from '../parse/cst.js';
import type { ComposeErrorHandler } from './composer.js';
export declare function resolveBlockScalar(scalar: BlockScalar, strict: boolean, onError: ComposeErrorHandler): {
    value: string;
    type: Scalar.BLOCK_FOLDED | Scalar.BLOCK_LITERAL | null;
    comment: string;
    range: Range;
};
