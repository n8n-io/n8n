import { parseDef } from "../parseDef.js";
export function parseEffectsDef(_def, refs) {
    return refs.effectStrategy === "input"
        ? parseDef(_def.schema._def, refs)
        : {};
}
