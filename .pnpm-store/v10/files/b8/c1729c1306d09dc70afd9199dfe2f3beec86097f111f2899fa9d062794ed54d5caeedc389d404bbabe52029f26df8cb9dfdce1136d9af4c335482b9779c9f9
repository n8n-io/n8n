import { YAMLMap } from '../nodes/YAMLMap.js';
import { YAMLSeq } from '../nodes/YAMLSeq.js';
import type { FlowCollection } from '../parse/cst.js';
import { CollectionTag } from '../schema/types.js';
import type { ComposeContext, ComposeNode } from './compose-node.js';
import type { ComposeErrorHandler } from './composer.js';
export declare function resolveFlowCollection({ composeNode, composeEmptyNode }: ComposeNode, ctx: ComposeContext, fc: FlowCollection, onError: ComposeErrorHandler, tag?: CollectionTag): YAMLMap.Parsed<import("../index.js").ParsedNode, import("../index.js").ParsedNode | null> | YAMLSeq.Parsed<import("../index.js").ParsedNode>;
