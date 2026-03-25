import type { BaseArgs, InferenceProvider, RequestArgs } from "../../types.js";
import { omit } from "../../utils/omit.js";

/**
 * @deprecated
 */
export interface LegacyAudioInput {
	data: Blob | ArrayBuffer;
	provider?: InferenceProvider;
}

export function preparePayload(args: BaseArgs & ({ inputs: Blob } | LegacyAudioInput)): RequestArgs {
	return "data" in args
		? args
		: {
				...omit(args, "inputs"),
				data: args.inputs,
		  };
}
