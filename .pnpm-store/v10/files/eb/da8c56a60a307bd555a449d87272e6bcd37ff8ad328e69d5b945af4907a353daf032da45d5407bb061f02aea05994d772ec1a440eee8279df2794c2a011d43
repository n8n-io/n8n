//#region src/utils/zod-to-json-schema/getRelativePath.ts
const getRelativePath = (pathA, pathB) => {
	let i = 0;
	for (; i < pathA.length && i < pathB.length; i++) if (pathA[i] !== pathB[i]) break;
	return [(pathA.length - i).toString(), ...pathB.slice(i)].join("/");
};
//#endregion
exports.getRelativePath = getRelativePath;

//# sourceMappingURL=getRelativePath.cjs.map