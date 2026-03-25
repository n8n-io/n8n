import { isInteropZodSchema } from "@langchain/core/utils/types";
import { toJsonSchema } from "@langchain/core/utils/json_schema";
import { isSerializableSchema } from "@langchain/core/utils/standard_schema";

//#region src/utils/zod_to_gemini_parameters.ts
function adjustObjectType(obj) {
	if (!Array.isArray(obj.type)) return obj;
	const len = obj.type.length;
	const nullIndex = obj.type.indexOf("null");
	if (len === 2 && nullIndex >= 0) {
		const typeIndex = nullIndex === 0 ? 1 : 0;
		obj.type = obj.type[typeIndex];
		obj.nullable = true;
	} else if (len === 1 && nullIndex === 0) throw new Error("zod_to_gemini_parameters: Gemini cannot handle null type");
	else if (len === 1) obj.type = obj?.type[0];
	else throw new Error("zod_to_gemini_parameters: Gemini cannot handle union types");
	return obj;
}
function removeAdditionalProperties(obj) {
	if (typeof obj === "object" && obj !== null) {
		const newObj = { ...obj };
		if ("additionalProperties" in newObj) delete newObj.additionalProperties;
		if ("anyOf" in newObj || "oneOf" in newObj) {
			const unionTypes = newObj.anyOf || newObj.oneOf;
			if (Array.isArray(unionTypes) && unionTypes.length === 2) {
				const nullIndex = unionTypes.findIndex((t) => t.type === "null");
				if (nullIndex >= 0) {
					const nonNullType = unionTypes[nullIndex === 0 ? 1 : 0];
					delete newObj.anyOf;
					delete newObj.oneOf;
					for (const key in nonNullType) if (key in nonNullType) newObj[key] = nonNullType[key];
					newObj.nullable = true;
				} else throw new Error("zod_to_gemini_parameters: Gemini cannot handle union types (discriminatedUnion, anyOf, oneOf). Consider using a flat object structure with optional fields instead.");
			} else throw new Error("zod_to_gemini_parameters: Gemini cannot handle union types (discriminatedUnion, anyOf, oneOf). Consider using a flat object structure with optional fields instead.");
		}
		if ("exclusiveMinimum" in newObj && newObj.exclusiveMinimum === 0) {
			newObj.minimum = .01;
			delete newObj.exclusiveMinimum;
		} else if ("exclusiveMinimum" in newObj) {
			newObj.minimum = newObj.exclusiveMinimum + 1e-5;
			delete newObj.exclusiveMinimum;
		}
		adjustObjectType(newObj);
		for (const key in newObj) if (key in newObj) {
			if (Array.isArray(newObj[key])) newObj[key] = newObj[key].map(removeAdditionalProperties);
			else if (typeof newObj[key] === "object" && newObj[key] !== null) newObj[key] = removeAdditionalProperties(newObj[key]);
		}
		return newObj;
	}
	return obj;
}
function schemaToGeminiParameters(schema) {
	const { $schema, ...rest } = removeAdditionalProperties(isInteropZodSchema(schema) || isSerializableSchema(schema) ? toJsonSchema(schema) : schema);
	return rest;
}
function jsonSchemaToGeminiParameters(schema) {
	const { $schema, ...rest } = removeAdditionalProperties(schema);
	return rest;
}

//#endregion
export { adjustObjectType, jsonSchemaToGeminiParameters, removeAdditionalProperties, schemaToGeminiParameters };
//# sourceMappingURL=zod_to_gemini_parameters.js.map