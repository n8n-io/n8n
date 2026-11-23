import { MAX_CELL_DISPLAY_LENGTH } from '@/features/core/dataTable/constants';

export const isOversizedValue = (value: unknown): boolean =>
	typeof value === 'string' && value.length > MAX_CELL_DISPLAY_LENGTH;

export const isUnsafeNumberValue = (value: unknown): boolean => {
	if (typeof value !== 'number') return false;
	if (!Number.isFinite(value)) return true;
	return Math.abs(value) > Number.MAX_SAFE_INTEGER;
};
