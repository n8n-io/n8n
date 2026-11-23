import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import type { RouteRecordRaw } from 'vue-router';

import { PROMOTIONS_PLAYGROUND_VIEW } from '../promotions.constants';

/**
 * The only link between the Environments Playground and the promotions module. The module adds
 * both lists to its own, and they are empty in a production build. To remove the Playground,
 * delete this folder and the two spreads in `promotions.module.ts`.
 */
const PlaygroundView = async () => await import('./PromotionsPlaygroundView.vue');

export const playgroundSettingsPages = import.meta.env.DEV
	? [
			{
				id: 'settings-promotions-playground',
				order: 21,
				section: 'operations',
				icon: 'flask-conical',
				get label() {
					return useI18n().baseText('settings.promotions.playground.title');
				},
				position: 'top' as const,
				route: { to: { name: PROMOTIONS_PLAYGROUND_VIEW } },
				preview: true,
				// The same gate as the Environments settings page, without its scopes.
				get available() {
					return capabilityRegistry.use(capabilities.environmentsSettings).isPromotionsEnabled();
				},
			},
		]
	: [];

export const playgroundRoutes: RouteRecordRaw[] = import.meta.env.DEV
	? [{ path: 'playground', name: PROMOTIONS_PLAYGROUND_VIEW, component: PlaygroundView }]
	: [];
