import type { BaseArgs, RequestArgs } from "../../types.js";
import { omit } from "../../utils/omit.js";

/**
 * @deprecated
 */
export interface LegacyImageInput {
	data: Blob | ArrayBuffer;
}

export function preparePayload(args: BaseArgs & ({ inputs: Blob } | LegacyImageInput)): RequestArgs {
	return "data" in args ? args : { ...omit(args, "inputs"), data: args.inputs };
}
