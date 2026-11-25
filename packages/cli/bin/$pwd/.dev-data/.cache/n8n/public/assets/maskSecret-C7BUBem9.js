//#region src/app/utils/maskSecret.ts
var MASK = "••••••••";
/** Builds the masked form of a secret from the start and the end that the UI may show. */
function maskSecretParts(start, end) {
	return `${start}${MASK}${end}`;
}
/**
* Hides the middle of a secret and keeps its start and its end, for example
* `n8n_••••••••xzQn`. A value too short to hide anything comes back unchanged.
*/
function maskSecret(value, visibleStart = 4, visibleEnd = 4) {
	if (value.length <= visibleStart + visibleEnd) return value;
	return maskSecretParts(value.slice(0, visibleStart), value.slice(-visibleEnd));
}
//#endregion
export { maskSecretParts as n, maskSecret as t };
