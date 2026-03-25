import type { Document } from '../doc/Document.js';
import type { FlowScalar } from '../parse/cst.js';
import type { StringifyContext } from '../stringify/stringify.js';
import { NodeBase, Range } from './Node.js';
import type { Scalar } from './Scalar';
import { ToJSContext } from './toJS.js';
import type { YAMLMap } from './YAMLMap.js';
import type { YAMLSeq } from './YAMLSeq.js';
export declare namespace Alias {
    interface Parsed extends Alias {
        range: Range;
        srcToken?: FlowScalar & {
            type: 'alias';
        };
    }
}
export declare class Alias extends NodeBase {
    source: string;
    anchor?: never;
    constructor(source: string);
    /**
     * Resolve the value of this alias within `doc`, finding the last
     * instance of the `source` anchor before this node.
     */
    resolve(doc: Document): Scalar | YAMLMap | YAMLSeq | undefined;
    toJSON(_arg?: unknown, ctx?: ToJSContext): {} | null;
    toString(ctx?: StringifyContext, _onComment?: () => void, _onChompKeep?: () => void): string;
}
