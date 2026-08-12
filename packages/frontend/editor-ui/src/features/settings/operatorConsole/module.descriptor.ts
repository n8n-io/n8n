import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { hasPermission } from '@/app/utils/rbac/permissions';

import { OPERATOR_CONSOLE_MODULE_NAME, OPERATOR_CONSOLE_VIEW } from './operatorConsole.constants';

const i18n = useI18n();

const OperatorConsoleView = async () => await import('./OperatorConsoleView.vue');

/**
 * The console is a frontend module rather than a plain settings route so the
 * sidebar entry and the route both disappear when `operator-console` is not in
 * `N8N_ENABLED_MODULES` — the module is opt-in and off by default.
 */
export const OperatorConsoleModule: FrontendModuleDescription = {
	id: OPERATOR_CONSOLE_MODULE_NAME,
	name: 'Operator console',
	description: 'Live log tail across every n8n instance',
	icon: 'terminal',
	routes: [
		{
			path: 'operator-console',
			name: OPERATOR_CONSOLE_VIEW,
			component: OperatorConsoleView,
			meta: {
				layout: 'settings',
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: {
					rbac: {
						scope: 'orchestration:read',
					},
				},
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
	settingsPages: [
		{
			id: 'settings-operator-console',
			icon: 'terminal',
			label: i18n.baseText('operatorConsole.title'),
			position: 'top',
			route: { to: { name: OPERATOR_CONSOLE_VIEW } },
			get available() {
				return hasPermission(['rbac'], { rbac: { scope: 'orchestration:read' } });
			},
		},
	],
};
