import type { Document } from '../doc/Document.js';
import type { Node } from './Node.js';
export interface AnchorData {
    aliasCount: number;
    count: number;
    res: unknown;
}
export interface ToJSContext {
    anchors: Map<Node, AnchorData>;
    doc: Document<Node, boolean>;
    keep: boolean;
    mapAsMap: boolean;
    mapKeyWarned: boolean;
    maxAliasCount: number;
    onCreate?: (res: unknown) => void;
}
/**
 * Recursively convert any node or its contents to native JavaScript
 *
 * @param value - The input value
 * @param arg - If `value` defines a `toJSON()` method, use this
 *   as its first argument
 * @param ctx - Conversion context, originally set in Document#toJS(). If
 *   `{ keep: true }` is not set, output should be suitable for JSON
 *   stringification.
 */
export declare function toJS(value: any, arg: string | null, ctx?: ToJSContext): any;
