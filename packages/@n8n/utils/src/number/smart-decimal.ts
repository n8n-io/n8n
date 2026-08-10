export const smartDecimal = (value: number, decimals = 2): number => {
	// Check if integer
	if (Number.isInteger(value)) {
		return value;
	}

	// Numbers small enough to serialize in exponential notation (e.g. 1e-7)
	// have no '.' in their string form, so guard the missing decimal segment.
	const decimalPart = value.toString().split('.')[1];
	if (decimalPart !== undefined && decimalPart.length <= decimals) {
		return value;
	}

	return Number(value.toFixed(decimals));
};
