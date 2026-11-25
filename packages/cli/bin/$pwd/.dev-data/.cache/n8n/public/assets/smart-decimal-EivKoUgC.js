//#region ../../@n8n/utils/src/number/smart-decimal.ts
var smartDecimal = (value, decimals = 2) => {
	if (Number.isInteger(value)) return value;
	const decimalPart = value.toString().split(".")[1];
	if (decimalPart !== void 0 && decimalPart.length <= decimals) return value;
	return Number(value.toFixed(decimals));
};
//#endregion
export { smartDecimal as t };
