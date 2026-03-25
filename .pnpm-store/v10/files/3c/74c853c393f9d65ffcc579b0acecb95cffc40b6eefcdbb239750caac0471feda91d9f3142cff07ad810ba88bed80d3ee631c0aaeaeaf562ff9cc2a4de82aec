const require_transform = require("./transform.cjs");
//#region src/output_parsers/string.ts
/**
* OutputParser that parses LLMResult into the top likely string.
* @example
* ```typescript
* const promptTemplate = PromptTemplate.fromTemplate(
*   "Tell me a joke about {topic}",
* );
*
* const chain = RunnableSequence.from([
*   promptTemplate,
*   new ChatOpenAI({ model: "gpt-4o-mini" }),
*   new StringOutputParser(),
* ]);
*
* const result = await chain.invoke({ topic: "bears" });
* console.log("What do you call a bear with no teeth? A gummy bear!");
* ```
*/
var StringOutputParser = class extends require_transform.BaseTransformOutputParser {
	static lc_name() {
		return "StrOutputParser";
	}
	lc_namespace = [
		"langchain_core",
		"output_parsers",
		"string"
	];
	lc_serializable = true;
	/**
	* Parses a string output from an LLM call. This method is meant to be
	* implemented by subclasses to define how a string output from an LLM
	* should be parsed.
	* @param text The string output from an LLM call.
	* @param callbacks Optional callbacks.
	* @returns A promise of the parsed output.
	*/
	parse(text) {
		return Promise.resolve(text);
	}
	getFormatInstructions() {
		return "";
	}
	_textContentToString(content) {
		return content.text;
	}
	_imageUrlContentToString(_content) {
		throw new Error(`Cannot coerce a multimodal "image_url" message part into a string.`);
	}
	_messageContentToString(content) {
		switch (content.type) {
			case "text":
			case "text_delta":
				if ("text" in content) return this._textContentToString(content);
				break;
			case "image_url":
				if ("image_url" in content) return this._imageUrlContentToString(content);
				break;
			case "reasoning":
			case "thinking":
			case "redacted_thinking": return "";
			default: throw new Error(`Cannot coerce "${content.type}" message part into a string.`);
		}
		throw new Error(`Invalid content type: ${content.type}`);
	}
	_baseMessageContentToString(content) {
		return content.reduce((acc, item) => acc + this._messageContentToString(item), "");
	}
};
//#endregion
exports.StringOutputParser = StringOutputParser;

//# sourceMappingURL=string.cjs.map