import { BaseOutputParser } from "../../output_parsers/base.js";
//#region src/utils/testing/output_parsers.ts
/**
* Parser for comma-separated values. It splits the input text by commas
* and trims the resulting values.
*/
var FakeSplitIntoListParser = class extends BaseOutputParser {
	lc_namespace = ["tests", "fake"];
	getFormatInstructions() {
		return "";
	}
	async parse(text) {
		return text.split(",").map((value) => value.trim());
	}
};
//#endregion
export { FakeSplitIntoListParser };

//# sourceMappingURL=output_parsers.js.map