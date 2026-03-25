const require_transformer = require('./transformer.cjs');

//#region src/experimental/masking/regex_masking_transformer.ts
/**
* RegexMaskingTransformer class for masking and rehydrating messages with Regex.
*/
var RegexMaskingTransformer = class extends require_transformer.MaskingTransformer {
	patterns;
	hashFunction;
	/**
	* Constructs a RegexMaskingTransformer with given patterns and an optional hash function.
	* Validates the provided patterns to ensure they conform to the expected structure.
	*
	* @param patterns - An object containing masking patterns. Each pattern should include
	*                   a regular expression (`regex`) and optionally a `replacement` string
	*                   or a `mask` function.
	* @param hashFunction - An optional custom hash function to be used for masking.
	*/
	constructor(patterns, hashFunction) {
		super();
		this.validatePatterns(patterns);
		this.patterns = patterns;
		this.hashFunction = hashFunction || this.defaultHashFunction;
	}
	/**
	* Validates the given masking patterns to ensure each pattern has a valid regular expression.
	* Throws an error if any pattern is found to be invalid.
	*
	* @param patterns - The patterns object to validate.
	*/
	validatePatterns(patterns) {
		for (const key of Object.keys(patterns)) {
			const pattern = patterns[key];
			if (!pattern || typeof pattern !== "object" || !(pattern.regex instanceof RegExp)) throw new Error("Invalid pattern configuration.");
		}
	}
	/**
	* Masks content in a message based on the defined patterns.
	* @param message - The message to be masked.
	* @param state - The current state containing original values.
	* @returns A tuple of the masked message and the updated state.
	*/
	async transform(message, state) {
		if (typeof message !== "string") throw new TypeError("RegexMaskingTransformer.transform Error: The 'message' argument must be a string.");
		if (!(state instanceof Map)) throw new TypeError("RegexMaskingTransformer.transform Error: The 'state' argument must be an instance of Map.");
		let processedMessage = message;
		const originalValues = state || /* @__PURE__ */ new Map();
		for (const key of Object.keys(this.patterns)) {
			const pattern = this.patterns[key];
			processedMessage = processedMessage.replace(pattern.regex, (match) => {
				const maskedValue = pattern.mask ? pattern.mask(match) : pattern.replacement ?? this.hashFunction(match);
				originalValues.set(maskedValue, match);
				return maskedValue;
			});
		}
		return [processedMessage, originalValues];
	}
	/**
	* Rehydrates a masked message back to its original form using the provided state.
	* @param message - The masked message to be rehydrated.
	* @param state - The state map containing mappings of masked values to their original values.
	* @returns The rehydrated (original) message.
	*/
	async rehydrate(message, state) {
		if (typeof message !== "string") throw new TypeError("RegexMaskingTransformer.rehydrate Error: The 'message' argument must be a string.");
		if (!(state instanceof Map)) throw new TypeError("RegexMaskingTransformer.rehydrate Error: The 'state' argument must be an instance of Map.");
		const rehydratedMessage = Array.from(state).reduce((msg, [masked, original]) => {
			const escapedMasked = masked.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			return msg.replace(new RegExp(escapedMasked, "g"), original);
		}, message);
		return rehydratedMessage;
	}
	/**
	* Default hash function for creating unique hash values.
	* @param input - The input string to hash.
	* @returns The resulting hash as a string.
	*/
	defaultHashFunction(input) {
		let hash = 0;
		for (let i = 0; i < input.length; i += 1) {
			const char = input.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash |= 0;
		}
		return hash.toString();
	}
};

//#endregion
exports.RegexMaskingTransformer = RegexMaskingTransformer;
//# sourceMappingURL=regex_masking_transformer.cjs.map