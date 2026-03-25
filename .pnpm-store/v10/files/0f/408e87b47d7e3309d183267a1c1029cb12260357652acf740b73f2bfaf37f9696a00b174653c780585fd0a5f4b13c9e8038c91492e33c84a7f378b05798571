import type { ParseOptions, ScriptHandler, TemplateHandler } from './types';
import Documentation from './Documentation';
export type { ScriptHandler, TemplateHandler };
/**
 * parses the source at filePath and returns the doc
 * @param opt ParseOptions containing the filePath and the rest of the options
 * @param documentation documentation to be enriched if needed
 * @returns {object} documentation object
 */
export declare function parseFile(opt: ParseOptions, documentation?: Documentation): Promise<Documentation[]>;
/**
 * parses the source and returns the doc
 * @param {string} source code whose documentation is parsed
 * @param {string} opt path of the current file against whom to resolve the mixins
 * @returns {object} documentation object
 */
export declare function parseSource(source: string, opt: ParseOptions, documentation?: Documentation): Promise<Documentation[]>;
