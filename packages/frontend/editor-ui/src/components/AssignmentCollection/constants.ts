import { DATA_TYPE_ICON_MAP } from '@/constants';
import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';

export const ASSIGNMENT_TYPES: Array<{ type: string; icon: IconName }> = [
	{ type: 'string', icon: DATA_TYPE_ICON_MAP.string },
	{ type: 'number', icon: DATA_TYPE_ICON_MAP.number },
	{ type: 'boolean', icon: DATA_TYPE_ICON_MAP.boolean },
	{ type: 'array', icon: DATA_TYPE_ICON_MAP.array },
	{ type: 'object', icon: DATA_TYPE_ICON_MAP.object },
	{ type: 'binary', icon: DATA_TYPE_ICON_MAP.file },
];
