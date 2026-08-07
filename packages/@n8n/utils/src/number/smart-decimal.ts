export const smartDecimal = (value: number, decimals = 2): number => {
	// Check if integer
	if (Number.isInteger(value)) {
		return value;
	}

	// Check if it has only one decimal place
	if (value.toString().split('.')[1].length <= decimals) {
		return value;
	}

	return Number(value.toFixed(decimals));
};
