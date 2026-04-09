// This list is copied from gguf/types.ts, but will all types available (for backward compatibility)
// NOT to be confused with GGMLQuantizationType, a FileQuantization can contain multiple GGMLQuantizationType
// For example, Q4_K_M model can contains Q4_K and Q6_K tensors
export enum GGMLFileQuantizationType {
	F32 = 0,
	F16 = 1,
	Q4_0 = 2,
	Q4_1 = 3,
	Q4_1_SOME_F16 = 4,
	Q4_2 = 5,
	Q4_3 = 6,
	Q8_0 = 7,
	Q5_0 = 8,
	Q5_1 = 9,
	Q2_K = 10,
	Q3_K_S = 11,
	Q3_K_M = 12,
	Q3_K_L = 13,
	Q4_K_S = 14,
	Q4_K_M = 15,
	Q5_K_S = 16,
	Q5_K_M = 17,
	Q6_K = 18,
	IQ2_XXS = 19,
	IQ2_XS = 20,
	Q2_K_S = 21,
	IQ3_XS = 22,
	IQ3_XXS = 23,
	IQ1_S = 24,
	IQ4_NL = 25,
	IQ3_S = 26,
	IQ3_M = 27,
	IQ2_S = 28,
	IQ2_M = 29,
	IQ4_XS = 30,
	IQ1_M = 31,
	BF16 = 32,
	Q4_0_4_4 = 33,
	Q4_0_4_8 = 34,
	Q4_0_8_8 = 35,
	TQ1_0 = 36,
	TQ2_0 = 37,
	MXFP4_MOE = 38,

	// custom quants used by unsloth
	// they are not officially a scheme enum value in GGUF, but only here for naming
	Q2_K_XL = 1000,
	Q3_K_XL = 1001,
	Q4_K_XL = 1002,
	Q5_K_XL = 1003,
	Q6_K_XL = 1004,
	Q8_K_XL = 1005,
}

const ggufQuants = Object.values(GGMLFileQuantizationType).filter((v): v is string => typeof v === "string");
export const GGUF_QUANT_RE = new RegExp(
	"(?<prefix>UD-)?" + `(?<quant>${ggufQuants.join("|")})` + "(_(?<sizeVariation>[A-Z]+))?",
);
export const GGUF_QUANT_RE_GLOBAL = new RegExp(GGUF_QUANT_RE, "g");

export function parseGGUFQuantLabel(fname: string): string | undefined {
	const quantLabel = fname.toUpperCase().match(GGUF_QUANT_RE_GLOBAL)?.at(-1); // if there is multiple quant substrings in a name, we prefer the last one
	return quantLabel;
}

// order of quantization, from biggest to smallest
// this list must be in sync with the order in GGMLFileQuantizationType
// the gguf.spec.ts tests are using verify if the order is correct
export const GGUF_QUANT_ORDER: GGMLFileQuantizationType[] = [
	GGMLFileQuantizationType.F32,
	GGMLFileQuantizationType.BF16,
	GGMLFileQuantizationType.F16,
	GGMLFileQuantizationType.Q8_K_XL,
	GGMLFileQuantizationType.Q8_0,

	// 6-bit quantizations
	GGMLFileQuantizationType.Q6_K_XL,
	GGMLFileQuantizationType.Q6_K,

	// 5-bit quantizations
	GGMLFileQuantizationType.Q5_K_XL,
	GGMLFileQuantizationType.Q5_K_M,
	GGMLFileQuantizationType.Q5_K_S,
	GGMLFileQuantizationType.Q5_0,
	GGMLFileQuantizationType.Q5_1,

	// 4-bit quantizations
	GGMLFileQuantizationType.Q4_K_XL,
	GGMLFileQuantizationType.Q4_K_M,
	GGMLFileQuantizationType.Q4_K_S,
	GGMLFileQuantizationType.IQ4_NL,
	GGMLFileQuantizationType.IQ4_XS,
	GGMLFileQuantizationType.Q4_0_4_4,
	GGMLFileQuantizationType.Q4_0_4_8,
	GGMLFileQuantizationType.Q4_0_8_8,
	GGMLFileQuantizationType.Q4_1_SOME_F16,
	GGMLFileQuantizationType.Q4_0,
	GGMLFileQuantizationType.Q4_1,
	GGMLFileQuantizationType.Q4_2,
	GGMLFileQuantizationType.Q4_3,
	GGMLFileQuantizationType.MXFP4_MOE,

	// 3-bit quantizations
	GGMLFileQuantizationType.Q3_K_XL,
	GGMLFileQuantizationType.Q3_K_L,
	GGMLFileQuantizationType.Q3_K_M,
	GGMLFileQuantizationType.Q3_K_S,
	GGMLFileQuantizationType.IQ3_M,
	GGMLFileQuantizationType.IQ3_S,
	GGMLFileQuantizationType.IQ3_XS,
	GGMLFileQuantizationType.IQ3_XXS,

	// 2-bit quantizations
	GGMLFileQuantizationType.Q2_K_XL,
	GGMLFileQuantizationType.Q2_K,
	GGMLFileQuantizationType.Q2_K_S,
	GGMLFileQuantizationType.IQ2_M,
	GGMLFileQuantizationType.IQ2_S,
	GGMLFileQuantizationType.IQ2_XS,
	GGMLFileQuantizationType.IQ2_XXS,

	// 1-bit quantizations
	GGMLFileQuantizationType.IQ1_S,
	GGMLFileQuantizationType.IQ1_M,
	GGMLFileQuantizationType.TQ1_0,
	GGMLFileQuantizationType.TQ2_0,
];

// This function finds the nearest quantization type that is less than or equal to the given quantization type.
// It returns undefined if no such quantization type is found.
export function findNearestQuantType(
	quant: GGMLFileQuantizationType,
	availableQuants: GGMLFileQuantizationType[],
): GGMLFileQuantizationType | undefined {
	// Create a map for quick index lookup from the defined order
	const orderMap = new Map<GGMLFileQuantizationType, number>();
	GGUF_QUANT_ORDER.forEach((q, index) => {
		orderMap.set(q, index);
	});

	const targetIndex = orderMap.get(quant) ?? 0; // the 0 case should never happen

	// Filter the available quantizations to include only those defined in the order map,
	// then sort them according to the GGUF_QUANT_ORDER (from largest/index 0 to smallest/highest index).
	const sortedAvailable = availableQuants
		.filter((q) => orderMap.has(q))
		.sort((a, b) => (orderMap.get(a) ?? Infinity) - (orderMap.get(b) ?? Infinity));

	// If no valid quantizations are available after filtering
	if (sortedAvailable.length === 0) {
		return undefined;
	}

	// Iterate through the sorted available quantizations (largest to smallest).
	// Find the first one whose order index is >= the target index.
	// This means finding the largest quantization that is smaller than or equal to the target.
	for (const availableQuant of sortedAvailable) {
		// We know the key exists due to the filter above.
		const availableIndex = orderMap.get(availableQuant) ?? 0;
		if (availableIndex >= targetIndex) {
			return availableQuant;
		}
	}

	// If the loop completes, it means all available quantizations are larger (have a smaller index)
	// than the target quantization. In this case, return the "smallest" available quantization,
	// which is the last element in the sorted list (highest index among available).
	return sortedAvailable[sortedAvailable.length - 1];
}

// This list is only used to calculate the size of the model, NOT to be confused with the quantization FILE type
export enum GGMLQuantizationType {
	F32 = 0,
	F16 = 1,
	Q4_0 = 2,
	Q4_1 = 3,
	Q5_0 = 6,
	Q5_1 = 7,
	Q8_0 = 8,
	Q8_1 = 9,
	Q2_K = 10,
	Q3_K = 11,
	Q4_K = 12,
	Q5_K = 13,
	Q6_K = 14,
	Q8_K = 15,
	IQ2_XXS = 16,
	IQ2_XS = 17,
	IQ3_XXS = 18,
	IQ1_S = 19,
	IQ4_NL = 20,
	IQ3_S = 21,
	IQ2_S = 22,
	IQ4_XS = 23,
	I8 = 24,
	I16 = 25,
	I32 = 26,
	I64 = 27,
	F64 = 28,
	IQ1_M = 29,
	BF16 = 30,
	TQ1_0 = 34,
	TQ2_0 = 35,
	MXFP4 = 39,
}
