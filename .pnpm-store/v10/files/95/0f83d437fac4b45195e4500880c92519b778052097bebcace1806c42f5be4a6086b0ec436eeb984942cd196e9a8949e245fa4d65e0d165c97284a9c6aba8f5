let _langchain_core_output_parsers = require("@langchain/core/output_parsers");

//#region src/output_parsers.ts
var BaseGoogleSearchOutputParser = class extends _langchain_core_output_parsers.BaseLLMOutputParser {
	lc_namespace = ["google_common", "output_parsers"];
	generationToGroundingInfo(generation) {
		if ("message" in generation) {
			const responseMetadata = generation?.message?.response_metadata;
			const metadata = responseMetadata?.groundingMetadata;
			const supports = responseMetadata?.groundingSupport ?? metadata?.groundingSupports ?? [];
			if (metadata) return {
				metadata,
				supports
			};
		}
	}
	generationsToGroundingInfo(generations) {
		for (const generation of generations) {
			const info = this.generationToGroundingInfo(generation);
			if (info !== void 0) return info;
		}
	}
	generationToString(generation) {
		if ("message" in generation) {
			const content = generation?.message?.content;
			if (typeof content === "string") return content;
			else return content.map((c) => {
				if (c?.type === "text") return c?.text ?? "";
				else return "";
			}).reduce((previousValue, currentValue) => `${previousValue}${currentValue}`);
		}
		return generation.text;
	}
	generationsToString(generations) {
		return generations.map((generation) => this.generationToString(generation)).reduce((previousValue, currentValue) => `${previousValue}${currentValue}`);
	}
	annotateSegment(text, grounding, support, index) {
		const start = support.segment.startIndex ?? 0;
		const end = support.segment.endIndex;
		const textBefore = text.substring(0, start);
		const textSegment = text.substring(start, end);
		const textAfter = text.substring(end);
		return `${textBefore}${this.segmentPrefix(grounding, support, index) ?? ""}${textSegment}${this.segmentSuffix(grounding, support, index) ?? ""}${textAfter}`;
	}
	annotateTextSegments(text, grounding) {
		let ret = text;
		for (let co = grounding.supports.length - 1; co >= 0; co -= 1) {
			const support = grounding.supports[co];
			ret = this.annotateSegment(ret, grounding, support, co);
		}
		return ret;
	}
	/**
	* Google requires us to
	* "Display the Search Suggestion exactly as provided without any modifications"
	* So this will typically be called from the textSuffix() method to get
	* a string that renders HTML.
	* See https://ai.google.dev/gemini-api/docs/grounding/search-suggestions
	* @param grounding
	*/
	searchSuggestion(grounding) {
		return grounding?.metadata?.searchEntryPoint?.renderedContent ?? "";
	}
	annotateText(text, grounding) {
		const prefix = this.textPrefix(text, grounding) ?? "";
		const suffix = this.textSuffix(text, grounding) ?? "";
		return `${prefix}${this.annotateTextSegments(text, grounding)}${suffix}`;
	}
	async parseResult(generations, _callbacks) {
		const text = this.generationsToString(generations);
		const grounding = this.generationsToGroundingInfo(generations);
		if (!grounding) return text;
		return this.annotateText(text, grounding);
	}
};
var SimpleGoogleSearchOutputParser = class extends BaseGoogleSearchOutputParser {
	segmentPrefix(_grounding, _support, _index) {}
	segmentSuffix(_grounding, support, _index) {
		return ` [${support.groundingChunkIndices.map((i) => i + 1).join(", ")}]`;
	}
	textPrefix(_text, _grounding) {
		return "Google Says:\n";
	}
	chunkToString(chunk, index) {
		const info = chunk.retrievedContext ?? chunk.web;
		return `${index + 1}. ${info.title} - ${info.uri}`;
	}
	textSuffix(_text, grounding) {
		let ret = "\n";
		(grounding?.metadata?.groundingChunks ?? []).forEach((chunk, index) => {
			ret = `${ret}${this.chunkToString(chunk, index)}\n`;
		});
		return ret;
	}
};
var MarkdownGoogleSearchOutputParser = class extends BaseGoogleSearchOutputParser {
	segmentPrefix(_grounding, _support, _index) {}
	chunkLink(grounding, index) {
		const chunk = grounding.metadata.groundingChunks[index];
		const url = chunk.retrievedContext?.uri ?? chunk.web?.uri;
		return `[[${index + 1}](${url})]`;
	}
	segmentSuffix(grounding, support, _index) {
		let ret = "";
		support.groundingChunkIndices.forEach((chunkIndex) => {
			const link = this.chunkLink(grounding, chunkIndex);
			ret = `${ret}${link}`;
		});
		return ret;
	}
	textPrefix(_text, _grounding) {}
	chunkSuffixLink(chunk, index) {
		const num = index + 1;
		const info = chunk.retrievedContext ?? chunk.web;
		const url = info.uri;
		return `${num}. [${info.title}](${url})`;
	}
	textSuffix(_text, grounding) {
		let ret = "\n**Search Sources**\n";
		grounding.metadata.groundingChunks.forEach((chunk, index) => {
			ret = `${ret}${this.chunkSuffixLink(chunk, index)}\n`;
		});
		const search = this.searchSuggestion(grounding);
		ret = `${ret}\n${search}`;
		return ret;
	}
};

//#endregion
exports.BaseGoogleSearchOutputParser = BaseGoogleSearchOutputParser;
exports.MarkdownGoogleSearchOutputParser = MarkdownGoogleSearchOutputParser;
exports.SimpleGoogleSearchOutputParser = SimpleGoogleSearchOutputParser;
//# sourceMappingURL=output_parsers.cjs.map