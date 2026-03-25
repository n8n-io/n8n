import * as tasks from "./tasks/index.js";
import type { Options } from "./types.js";
import { omit } from "./utils/omit.js";
import { typedEntries } from "./utils/typedEntries.js";

/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */

type Task = typeof tasks;

export class InferenceClient {
	private readonly accessToken: string;
	private readonly defaultOptions: Options;

	constructor(
		accessToken = "",
		defaultOptions: Options & {
			endpointUrl?: string;
		} = {}
	) {
		this.accessToken = accessToken;
		this.defaultOptions = defaultOptions;

		for (const [name, fn] of typedEntries(tasks)) {
			Object.defineProperty(this, name, {
				enumerable: false,
				value: (params: Parameters<typeof fn>[0], options: Parameters<typeof fn>[1]) =>
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(fn as any)(
						/// ^ The cast of fn to any is necessary, otherwise TS can't compile because the generated union type is too complex
						{ endpointUrl: defaultOptions.endpointUrl, accessToken, ...params },
						{
							...omit(defaultOptions, ["endpointUrl"]),
							...options,
						}
					),
			});
		}
	}

	/**
	 * Returns a new instance of InferenceClient tied to a specified endpoint.
	 *
	 * For backward compatibility mostly.
	 */
	public endpoint(endpointUrl: string): InferenceClient {
		return new InferenceClient(this.accessToken, { ...this.defaultOptions, endpointUrl });
	}
}

export interface InferenceClient extends Task {}

/**
 * For backward compatibility only, will remove soon.
 * @deprecated replace with InferenceClient
 */
export class HfInference extends InferenceClient {}
/**
 * For backward compatibility only, will remove soon.
 * @deprecated replace with InferenceClient
 */
export class InferenceClientEndpoint extends InferenceClient {}
