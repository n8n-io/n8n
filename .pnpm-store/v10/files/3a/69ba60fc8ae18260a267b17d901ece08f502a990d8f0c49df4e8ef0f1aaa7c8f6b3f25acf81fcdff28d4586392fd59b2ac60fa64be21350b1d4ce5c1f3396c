const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const uuid = require_rolldown_runtime.__toESM(require("uuid"));

//#region src/id.ts
function uuid6(clockseq) {
	return (0, uuid.v6)({ clockseq });
}
function uuid5(name, namespace) {
	const namespaceBytes = namespace.replace(/-/g, "").match(/.{2}/g).map((byte) => parseInt(byte, 16));
	return (0, uuid.v5)(name, new Uint8Array(namespaceBytes));
}

//#endregion
exports.uuid5 = uuid5;
exports.uuid6 = uuid6;
//# sourceMappingURL=id.cjs.map