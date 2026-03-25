import { pick } from "./pick.js";
import { typedInclude } from "./typedInclude.js";

/**
 * Return copy of object, omitting blocklisted array of props
 */
export function omit<T extends object, K extends keyof T>(o: T, props: K[] | K): Pick<T, Exclude<keyof T, K>> {
	const propsArr = Array.isArray(props) ? props : [props];
	const letsKeep = (Object.keys(o) as (keyof T)[]).filter((prop) => !typedInclude(propsArr, prop));
	return pick(o, letsKeep);
}
