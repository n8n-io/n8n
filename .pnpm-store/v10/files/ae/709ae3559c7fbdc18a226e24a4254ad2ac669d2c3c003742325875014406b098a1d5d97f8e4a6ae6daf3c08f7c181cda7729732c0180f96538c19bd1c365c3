const require_base = require("../../output_parsers/base.cjs");
//#region src/utils/testing/output_parsers.ts
/**
* Parser for comma-separated values. It splits the input text by commas
* and trims the resulting values.
*/
var FakeSplitIntoListParser = class extends require_base.BaseOutputParser {
	lc_namespace = ["tests", "fake"];
	getFormatInstructions() {
		return "";
	}
	async parse(text) {
		return text.split(",").map((value) => value.trim());
	}
};
//#endregion
exports.FakeSplitIntoListParser = FakeSplitIntoListParser;

//# sourceMappingURL=output_parsers.cjs.map