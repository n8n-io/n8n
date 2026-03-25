import { v5, v6 } from "uuid";

//#region src/id.ts
function uuid6(clockseq) {
	return v6({ clockseq });
}
function uuid5(name, namespace) {
	const namespaceBytes = namespace.replace(/-/g, "").match(/.{2}/g).map((byte) => parseInt(byte, 16));
	return v5(name, new Uint8Array(namespaceBytes));
}

//#endregion
export { uuid5, uuid6 };
//# sourceMappingURL=id.js.map