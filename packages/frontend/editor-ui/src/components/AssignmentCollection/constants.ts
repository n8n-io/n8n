import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';

export const ASSIGNMENT_TYPES: Array<{ type: string; icon: IconName }> = [
	{ type: 'string', icon: 'font' },
	{ type: 'number', icon: 'hashtag' },
	{ type: 'boolean', icon: 'check-square' },
	{ type: 'array', icon: 'list' },
	{ type: 'object', icon: 'cube' },
];
