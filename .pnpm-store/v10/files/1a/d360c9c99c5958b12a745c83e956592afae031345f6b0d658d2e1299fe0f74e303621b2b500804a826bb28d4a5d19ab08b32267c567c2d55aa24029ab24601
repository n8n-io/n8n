import type { Directives } from '../doc/directives.js';
import { Document } from '../doc/Document.js';
import type { ParsedNode } from '../nodes/Node.js';
import type { DocumentOptions, ParseOptions, SchemaOptions } from '../options.js';
import type * as CST from '../parse/cst.js';
import type { ComposeErrorHandler } from './composer.js';
export declare function composeDoc<Contents extends ParsedNode = ParsedNode, Strict extends boolean = true>(options: ParseOptions & DocumentOptions & SchemaOptions, directives: Directives, { offset, start, value, end }: CST.Document, onError: ComposeErrorHandler): Document.Parsed<Contents, Strict>;
