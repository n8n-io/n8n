import type $RefParser from "./index";
import type { ParserOptions } from "./index";
import type { JSONSchema } from "./index";
export interface InventoryEntry {
    $ref: any;
    parent: any;
    key: any;
    pathFromRoot: any;
    depth: any;
    file: any;
    hash: any;
    value: any;
    circular: any;
    extended: any;
    external: any;
    indirections: any;
}
/**
 * Bundles all external JSON references into the main JSON schema, thus resulting in a schema that
 * only has *internal* references, not any *external* references.
 * This method mutates the JSON schema object, adding new references and re-mapping existing ones.
 *
 * @param parser
 * @param options
 */
declare function bundle<S extends object = JSONSchema, O extends ParserOptions<S> = ParserOptions<S>>(parser: $RefParser<S, O>, options: O): void;
export default bundle;
