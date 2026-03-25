//#region src/experimental/masking/parser.ts
/**
* MaskingParser class for handling the masking and rehydrating of messages.
*/
var MaskingParser = class {
	transformers;
	state;
	config;
	constructor(config = {}) {
		this.transformers = config.transformers ?? [];
		this.state = /* @__PURE__ */ new Map();
		this.config = config;
	}
	/**
	* Adds a transformer to the parser.
	* @param transformer - An instance of a class extending MaskingTransformer.
	*/
	addTransformer(transformer) {
		this.transformers.push(transformer);
	}
	/**
	* Getter method for retrieving the current state.
	* @returns The current state map.
	*/
	getState() {
		return this.state;
	}
	/**
	* Masks the provided message using the added transformers.
	* This method sequentially applies each transformer's masking logic to the message.
	* It utilizes a state map to track original values corresponding to their masked versions.
	*
	* @param message - The message to be masked.
	* @returns A masked version of the message.
	* @throws {TypeError} If the message is not a string.
	* @throws {Error} If no transformers are added.
	*/
	async mask(message) {
		if (this.config.onMaskingStart) await this.config.onMaskingStart(message);
		if (this.transformers.length === 0) throw new Error("MaskingParser.mask Error: No transformers have been added. Please add at least one transformer before parsing.");
		if (typeof message !== "string") throw new TypeError("MaskingParser.mask Error: The 'message' argument must be a string.");
		let processedMessage = message;
		for (const transformer of this.transformers) {
			const [transformedMessage, transformerState] = await transformer.transform(processedMessage, new Map(this.state));
			processedMessage = transformedMessage;
			transformerState.forEach((value, key) => this.state.set(key, value));
		}
		if (this.config.onMaskingEnd) await this.config.onMaskingEnd(processedMessage);
		return processedMessage;
	}
	/**
	* Rehydrates a masked message back to its original form.
	* This method sequentially applies the rehydration logic of each added transformer in reverse order.
	* It relies on the state map to correctly map the masked values back to their original values.
	*
	* The rehydration process is essential for restoring the original content of a message
	* that has been transformed (masked) by the transformers. This process is the inverse of the masking process.
	*
	* @param message - The masked message to be rehydrated.
	* @returns The original (rehydrated) version of the message.
	*/
	async rehydrate(message, state) {
		if (this.config.onRehydratingStart) await this.config.onRehydratingStart(message);
		if (typeof message !== "string") throw new TypeError("MaskingParser.rehydrate Error: The 'message' argument must be a string.");
		if (this.transformers.length === 0) throw new Error("MaskingParser.rehydrate Error: No transformers have been added. Please add at least one transformer before rehydrating.");
		if (state && !(state instanceof Map)) throw new TypeError("MaskingParser.rehydrate Error: The 'state' argument, if provided, must be an instance of Map.");
		const rehydrationState = state || this.state;
		let rehydratedMessage = message;
		const reversedTransformers = this.transformers.slice().reverse();
		for (const transformer of reversedTransformers) rehydratedMessage = await transformer.rehydrate(rehydratedMessage, rehydrationState);
		if (this.config.onRehydratingEnd) await this.config.onRehydratingEnd(rehydratedMessage);
		return rehydratedMessage;
	}
};

//#endregion
export { MaskingParser };
//# sourceMappingURL=parser.js.map