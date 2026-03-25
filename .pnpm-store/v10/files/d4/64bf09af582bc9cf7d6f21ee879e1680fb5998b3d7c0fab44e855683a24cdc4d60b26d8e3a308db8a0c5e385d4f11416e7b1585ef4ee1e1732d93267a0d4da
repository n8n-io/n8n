import { _mergeDicts } from "./base.js";
//#region src/messages/metadata.ts
function mergeResponseMetadata(a, b) {
	return _mergeDicts(a, b) ?? {};
}
function mergeModalitiesTokenDetails(a, b) {
	const output = {};
	if (a?.audio !== void 0 || b?.audio !== void 0) output.audio = (a?.audio ?? 0) + (b?.audio ?? 0);
	if (a?.image !== void 0 || b?.image !== void 0) output.image = (a?.image ?? 0) + (b?.image ?? 0);
	if (a?.video !== void 0 || b?.video !== void 0) output.video = (a?.video ?? 0) + (b?.video ?? 0);
	if (a?.document !== void 0 || b?.document !== void 0) output.document = (a?.document ?? 0) + (b?.document ?? 0);
	if (a?.text !== void 0 || b?.text !== void 0) output.text = (a?.text ?? 0) + (b?.text ?? 0);
	return output;
}
function mergeInputTokenDetails(a, b) {
	const output = { ...mergeModalitiesTokenDetails(a, b) };
	if (a?.cache_read !== void 0 || b?.cache_read !== void 0) output.cache_read = (a?.cache_read ?? 0) + (b?.cache_read ?? 0);
	if (a?.cache_creation !== void 0 || b?.cache_creation !== void 0) output.cache_creation = (a?.cache_creation ?? 0) + (b?.cache_creation ?? 0);
	return output;
}
function mergeOutputTokenDetails(a, b) {
	const output = { ...mergeModalitiesTokenDetails(a, b) };
	if (a?.reasoning !== void 0 || b?.reasoning !== void 0) output.reasoning = (a?.reasoning ?? 0) + (b?.reasoning ?? 0);
	return output;
}
function mergeUsageMetadata(a, b) {
	return {
		input_tokens: (a?.input_tokens ?? 0) + (b?.input_tokens ?? 0),
		output_tokens: (a?.output_tokens ?? 0) + (b?.output_tokens ?? 0),
		total_tokens: (a?.total_tokens ?? 0) + (b?.total_tokens ?? 0),
		input_token_details: mergeInputTokenDetails(a?.input_token_details, b?.input_token_details),
		output_token_details: mergeOutputTokenDetails(a?.output_token_details, b?.output_token_details)
	};
}
//#endregion
export { mergeResponseMetadata, mergeUsageMetadata };

//# sourceMappingURL=metadata.js.map