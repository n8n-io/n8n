export const smartDecimal = (value: number, decimals = 2): number => {
	// Check if integer
	if (Number.isInteger(value)) {
		return value;
	}

	// Check if it has only one decimal place. Exponential-notation numbers
	// (e.g. `0.0000001` → `"1e-7"`) have no `.`, so fall through to rounding.
	const decimalPart = value.toString().split('.')[1];
	if (decimalPart !== undefined && decimalPart.length <= decimals) {
		return value;
	}

	return Number(value.toFixed(decimals));
};
