import { invert } from '@/utils/inverter';

function isValid<T extends Record<number | string | symbol, unknown>>(
	value: number | string | symbol,
	constant: T,
): value is keyof T {
	return Object.keys(constant).includes(value.toString());
}

export type PeriodUnit = keyof typeof PeriodUnitToNumber;

export type PeriodUnitNumber = (typeof PeriodUnitToNumber)[PeriodUnit];
// Periods
export const PeriodUnitToNumber = {
	hour: 0,
	day: 1,
	week: 2,
} as const;

export const NumberToPeriodUnit = invert(PeriodUnitToNumber);

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

export type TypeUnit = keyof typeof TypeToNumber;

export type TypeUnitNumber = (typeof TypeToNumber)[TypeUnit];
export const NumberToType = invert(TypeToNumber);

export function isValidTypeNumber(value: number) {
	return isValid(value, NumberToType);
}
