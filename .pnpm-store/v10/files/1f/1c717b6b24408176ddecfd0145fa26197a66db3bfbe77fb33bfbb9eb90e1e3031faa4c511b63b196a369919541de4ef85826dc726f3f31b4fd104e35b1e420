import { isBaseMessage, isBaseMessageChunk } from "../messages/base.js";
import { convertToChunk } from "../messages/utils.js";
import { ChatGenerationChunk, GenerationChunk } from "../outputs.js";
import { BaseOutputParser } from "./base.js";
import { deepCompareStrict } from "@cfworker/json-schema";
//#region src/output_parsers/transform.ts
/**
* Class to parse the output of an LLM call that also allows streaming inputs.
*/
var BaseTransformOutputParser = class extends BaseOutputParser {
	async *_transform(inputGenerator) {
		for await (const chunk of inputGenerator) if (typeof chunk === "string") yield this.parseResult([{ text: chunk }]);
		else yield this.parseResult([{
			message: chunk,
			text: this._baseMessageToString(chunk)
		}]);
	}
	/**
	* Transforms an asynchronous generator of input into an asynchronous
	* generator of parsed output.
	* @param inputGenerator An asynchronous generator of input.
	* @param options A configuration object.
	* @returns An asynchronous generator of parsed output.
	*/
	async *transform(inputGenerator, options) {
		yield* this._transformStreamWithConfig(inputGenerator, this._transform.bind(this), {
			...options,
			runType: "parser"
		});
	}
};
/**
* A base class for output parsers that can handle streaming input. It
* extends the `BaseTransformOutputParser` class and provides a method for
* converting parsed outputs into a diff format.
*/
var BaseCumulativeTransformOutputParser = class extends BaseTransformOutputParser {
	diff = false;
	constructor(fields) {
		super(fields);
		this.diff = fields?.diff ?? this.diff;
	}
	async *_transform(inputGenerator) {
		let prevParsed;
		let accGen;
		for await (const chunk of inputGenerator) {
			if (typeof chunk !== "string" && typeof chunk.content !== "string") throw new Error("Cannot handle non-string output.");
			let chunkGen;
			if (isBaseMessageChunk(chunk)) {
				if (typeof chunk.content !== "string") throw new Error("Cannot handle non-string message output.");
				chunkGen = new ChatGenerationChunk({
					message: chunk,
					text: chunk.content
				});
			} else if (isBaseMessage(chunk)) {
				if (typeof chunk.content !== "string") throw new Error("Cannot handle non-string message output.");
				chunkGen = new ChatGenerationChunk({
					message: convertToChunk(chunk),
					text: chunk.content
				});
			} else chunkGen = new GenerationChunk({ text: chunk });
			if (accGen === void 0) accGen = chunkGen;
			else accGen = accGen.concat(chunkGen);
			const parsed = await this.parsePartialResult([accGen]);
			if (parsed !== void 0 && parsed !== null && !deepCompareStrict(parsed, prevParsed)) {
				if (this.diff) yield this._diff(prevParsed, parsed);
				else yield parsed;
				prevParsed = parsed;
			}
		}
	}
	getFormatInstructions() {
		return "";
	}
};
//#endregion
export { BaseCumulativeTransformOutputParser, BaseTransformOutputParser };

//# sourceMappingURL=transform.js.map