
//#region src/utils/tencent_hunyuan/common.ts
const service = "hunyuan";
const signedHeaders = `content-type;host`;
const getDate = (timestamp) => {
	const date = /* @__PURE__ */ new Date(timestamp * 1e3);
	const year = date.getUTCFullYear();
	const month = `0${(date.getUTCMonth() + 1).toString()}`.slice(-2);
	const day = `0${date.getUTCDate()}`.slice(-2);
	return `${year}-${month}-${day}`;
};

//#endregion
exports.getDate = getDate;
exports.service = service;
exports.signedHeaders = signedHeaders;
//# sourceMappingURL=common.cjs.map