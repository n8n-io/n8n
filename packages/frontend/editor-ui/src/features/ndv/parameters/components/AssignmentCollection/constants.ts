import { DATA_TYPE_ICON_MAP } from '@/app/constants';

export const ASSIGNMENT_TYPES = [
	{ type: 'string', icon: DATA_TYPE_ICON_MAP.string },
	{ type: 'number', icon: DATA_TYPE_ICON_MAP.number },
	{ type: 'boolean', icon: DATA_TYPE_ICON_MAP.boolean },
	{ type: 'array', icon: DATA_TYPE_ICON_MAP.array },
	{ type: 'object', icon: DATA_TYPE_ICON_MAP.object },
	{ type: 'binary', icon: DATA_TYPE_ICON_MAP.file },
] as const;
