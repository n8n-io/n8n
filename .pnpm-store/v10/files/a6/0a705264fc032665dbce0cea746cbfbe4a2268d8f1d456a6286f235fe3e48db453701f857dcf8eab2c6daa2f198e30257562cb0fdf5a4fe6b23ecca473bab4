const require_base = require('./base.cjs');

//#region src/chains/transform.ts
/**
* Class that represents a transform chain. It extends the `BaseChain`
* class and implements the `TransformChainFields` interface. It provides
* a way to transform input values to output values using a specified
* transform function.
*/
var TransformChain = class extends require_base.BaseChain {
	static lc_name() {
		return "TransformChain";
	}
	transformFunc;
	inputVariables;
	outputVariables;
	_chainType() {
		return "transform";
	}
	get inputKeys() {
		return this.inputVariables;
	}
	get outputKeys() {
		return this.outputVariables;
	}
	constructor(fields) {
		super(fields);
		this.transformFunc = fields.transform;
		this.inputVariables = fields.inputVariables;
		this.outputVariables = fields.outputVariables;
	}
	async _call(values, runManager) {
		return this.transformFunc(values, runManager?.getChild("transform"));
	}
};

//#endregion
exports.TransformChain = TransformChain;
//# sourceMappingURL=transform.cjs.map