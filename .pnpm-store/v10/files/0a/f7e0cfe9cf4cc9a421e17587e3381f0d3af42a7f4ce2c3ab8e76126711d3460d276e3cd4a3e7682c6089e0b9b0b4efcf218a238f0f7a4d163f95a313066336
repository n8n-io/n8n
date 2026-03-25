import { pick } from "./pick.js";
import { typedInclude } from "./typedInclude.js";
/**
 * Return copy of object, omitting blocklisted array of props
 */
export function omit(o, props) {
    const propsArr = Array.isArray(props) ? props : [props];
    const letsKeep = Object.keys(o).filter((prop) => !typedInclude(propsArr, prop));
    return pick(o, letsKeep);
}
