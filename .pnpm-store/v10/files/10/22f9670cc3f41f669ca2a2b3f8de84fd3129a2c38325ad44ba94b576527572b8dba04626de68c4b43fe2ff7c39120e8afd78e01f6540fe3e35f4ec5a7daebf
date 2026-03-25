
//#region src/utils/validate_schema.ts
function assertNoEmptyStringEnums(schema, toolName, path = []) {
	if (schema == null || typeof schema !== "object") return;
	const obj = schema;
	if (Array.isArray(obj.enum)) {
		if (obj.enum.some((v) => v === "")) {
			const pathStr = path.length ? ` at path "${path.join(".")}"` : "";
			const toolStr = toolName ? ` in tool "${toolName}"` : "";
			throw new Error(`Invalid enum: empty string not allowed${toolStr}${pathStr}. Gemini API rejects empty strings in enums.`);
		}
	}
	if (obj.type === "object" && obj.properties && typeof obj.properties === "object") for (const [prop, child] of Object.entries(obj.properties)) assertNoEmptyStringEnums(child, toolName, [...path, prop]);
	if (obj.items) assertNoEmptyStringEnums(obj.items, toolName, [...path, "[]"]);
	for (const k of [
		"anyOf",
		"oneOf",
		"allOf"
	]) {
		const arr = obj[k];
		if (Array.isArray(arr)) arr.forEach((child, i) => assertNoEmptyStringEnums(child, toolName, [...path, `${k}[${i}]`]));
	}
	if (obj.additionalProperties && typeof obj.additionalProperties === "object") assertNoEmptyStringEnums(obj.additionalProperties, toolName, [...path, "additionalProperties"]);
}

//#endregion
exports.assertNoEmptyStringEnums = assertNoEmptyStringEnums;
//# sourceMappingURL=validate_schema.cjs.map