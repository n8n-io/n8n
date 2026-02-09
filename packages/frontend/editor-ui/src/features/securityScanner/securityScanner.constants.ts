import type { SecurityCategory } from './scanner/types';

export const SECURITY_PANEL_LOCAL_STORAGE_KEY = 'n8n-security-panel';

export const DEFAULT_PANEL_WIDTH = 420;

export const MIN_PANEL_WIDTH = 300;

export const MAX_PANEL_WIDTH = 800;

export const CATEGORY_LABELS: Record<SecurityCategory, string> = {
	'hardcoded-secret': 'securityScanner.category.secrets',
	'pii-data-flow': 'securityScanner.category.pii',
	'insecure-config': 'securityScanner.category.config',
	'data-exposure': 'securityScanner.category.exposure',
	'expression-risk': 'securityScanner.category.expressions',
};

export type SecurityTab = SecurityCategory | 'all';

export const SECURITY_TABS: Array<{ value: SecurityTab; labelKey: string }> = [
	{ value: 'all', labelKey: 'securityScanner.tab.all' },
	{ value: 'hardcoded-secret', labelKey: 'securityScanner.tab.secrets' },
	{ value: 'pii-data-flow', labelKey: 'securityScanner.tab.pii' },
	{ value: 'insecure-config', labelKey: 'securityScanner.tab.config' },
	{ value: 'data-exposure', labelKey: 'securityScanner.tab.exposure' },
	{ value: 'expression-risk', labelKey: 'securityScanner.tab.expressions' },
];
