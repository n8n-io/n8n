function isValid<T extends Record<number | string | symbol, unknown>>(
	value: number | string | symbol,
	constant: T,
): value is keyof T {
	return Object.keys(constant).includes(value.toString());
}

// Periods
export const PeriodUnitToNumber = {
	hour: 0,
	day: 1,
	week: 2,
} as const;
// TODO: rename to singular
export type PeriodUnits = keyof typeof PeriodUnitToNumber;
// TODO: rename to singular
export type PeriodUnitNumbers = (typeof PeriodUnitToNumber)[PeriodUnits];
export const NumberToPeriodUnit = Object.entries(PeriodUnitToNumber).reduce(
	(acc, [key, value]: [PeriodUnits, PeriodUnitNumbers]) => {
		acc[value] = key;
		return acc;
	},
	{} as Record<PeriodUnitNumbers, PeriodUnits>,
);
export function isValidPeriodNumber(value: number) {
	return isValid(value, NumberToPeriodUnit);
}

// Types
export const TypeToNumber = {
	time_saved_min: 0,
	runtime_ms: 1,
	success: 2,
	failure: 3,
} as const;
// TODO: rename to singular
export type TypeUnits = keyof typeof TypeToNumber;
// TODO: rename to singular
export type TypeUnitNumbers = (typeof TypeToNumber)[TypeUnits];
export const NumberToType = Object.entries(TypeToNumber).reduce(
	(acc, [key, value]: [TypeUnits, TypeUnitNumbers]) => {
		acc[value] = key;
		return acc;
	},
	{} as Record<TypeUnitNumbers, TypeUnits>,
);

export function isValidTypeNumber(value: number) {
	return isValid(value, NumberToType);
}
