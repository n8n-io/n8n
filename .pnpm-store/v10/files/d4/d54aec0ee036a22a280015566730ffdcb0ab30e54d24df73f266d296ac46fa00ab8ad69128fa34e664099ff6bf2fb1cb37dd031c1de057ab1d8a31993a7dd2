import { omit } from "../../utils/omit.js";
export function preparePayload(args) {
    return "data" in args ? args : { ...omit(args, "inputs"), data: args.inputs };
}
