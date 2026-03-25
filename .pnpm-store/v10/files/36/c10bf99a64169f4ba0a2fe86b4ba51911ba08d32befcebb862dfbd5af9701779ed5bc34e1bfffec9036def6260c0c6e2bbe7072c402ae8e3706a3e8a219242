const require_rolldown_runtime = require('../../../../../../../_virtual/rolldown_runtime.cjs');
const require_index = require('../../../../../semver@7.7.2/node_modules/semver/index.cjs');

//#region ../../node_modules/.pnpm/langsmith@0.3.74_@opentelemetry+api@1.9.0_openai@5.12.2_ws@8.18.3_bufferutil@4.0.9_utf-8-validate@6.0.5__zod@3.25.76_/node_modules/langsmith/dist/utils/prompts.js
var import_semver = /* @__PURE__ */ require_rolldown_runtime.__toESM(require_index.require_semver(), 1);
function parsePromptIdentifier(identifier) {
	if (!identifier || identifier.split("/").length > 2 || identifier.startsWith("/") || identifier.endsWith("/") || identifier.split(":").length > 2) throw new Error(`Invalid identifier format: ${identifier}`);
	const [ownerNamePart, commitPart] = identifier.split(":");
	const commit = commitPart || "latest";
	if (ownerNamePart.includes("/")) {
		const [owner, name] = ownerNamePart.split("/", 2);
		if (!owner || !name) throw new Error(`Invalid identifier format: ${identifier}`);
		return [
			owner,
			name,
			commit
		];
	} else {
		if (!ownerNamePart) throw new Error(`Invalid identifier format: ${identifier}`);
		return [
			"-",
			ownerNamePart,
			commit
		];
	}
}

//#endregion
exports.parsePromptIdentifier = parsePromptIdentifier;
//# sourceMappingURL=prompts.cjs.map