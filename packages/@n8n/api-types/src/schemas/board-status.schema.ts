import { z } from 'zod';

export const boardStatusColorSchema = z.string().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/);

export const boardAllowedStatusSchema = z.object({
	name: z.string().trim().min(1).max(128),
	color: boardStatusColorSchema,
});

export type BoardAllowedStatus = z.infer<typeof boardAllowedStatusSchema>;

export const DEFAULT_BOARD_STATUS_COLORS = [
	'#6366F1',
	'#14B8A6',
	'#F59E0B',
	'#EC4899',
	'#8B5CF6',
	'#10B981',
] as const;

export const getDefaultBoardStatusColor = (index: number): string =>
	DEFAULT_BOARD_STATUS_COLORS[index % DEFAULT_BOARD_STATUS_COLORS.length];

const resolveBoardStatusColor = (color: unknown, index: number): string => {
	if (typeof color === 'string' && boardStatusColorSchema.safeParse(color).success) {
		return color;
	}

	return getDefaultBoardStatusColor(index);
};

export const normalizeBoardAllowedStatus = (value: unknown, index: number): BoardAllowedStatus => {
	if (typeof value === 'string') {
		const name = value.trim();
		if (!name) {
			throw new Error('Status name cannot be empty');
		}

		return {
			name,
			color: getDefaultBoardStatusColor(index),
		};
	}

	if (value && typeof value === 'object' && 'name' in value && typeof value.name === 'string') {
		const name = value.name.trim();
		if (!name) {
			throw new Error('Status name cannot be empty');
		}

		const color = 'color' in value ? value.color : undefined;
		return {
			name,
			color: resolveBoardStatusColor(color, index),
		};
	}

	throw new Error('Invalid board status');
};

export const normalizeBoardAllowedStatuses = (value: unknown): BoardAllowedStatus[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.map((status, index) => normalizeBoardAllowedStatus(status, index));
};

export const getBoardStatusNames = (statuses: BoardAllowedStatus[]): string[] =>
	statuses.map((status) => status.name);

export const boardAllowedStatusesSchema = z.preprocess((value) => {
	if (value === undefined || value === null) {
		return value;
	}

	return normalizeBoardAllowedStatuses(value);
}, z.array(boardAllowedStatusSchema).optional());
