import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';

export const ASSIGNMENT_TYPES: Array<{ type: string; icon: IconName }> = [
	{ type: 'string', icon: 'case-upper' },
	{ type: 'number', icon: 'hash' },
	{ type: 'boolean', icon: 'square-check' },
	{ type: 'array', icon: 'list' },
	{ type: 'object', icon: 'box' },
];
