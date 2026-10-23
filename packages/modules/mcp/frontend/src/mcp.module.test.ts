import { i18nInstance, setLanguage } from '@n8n/i18n';
import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { createPinia, setActivePinia } from 'pinia';

import {
	MCP_AGENTS_VIEW,
	MCP_CLIENTS_VIEW,
	MCP_SETTINGS_VIEW,
	MCP_WORKFLOWS_VIEW,
} from './mcp.constants';
import { MCPModule } from './mcp.module';

describe('MCPModule', () => {
	const settingsPage = () => MCPModule.settingsPages?.find((item) => item.id === 'settings-mcp');

	const withScopes = (scopes: Scope[]) => {
		useRBACStore().setGlobalScopes(scopes);
		return settingsPage();
	};

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('settings sidebar item', () => {
		it('should hide the item from a user without an MCP scope', () => {
			expect(withScopes([])?.available).toBe(false);
		});

		it('should hide the item from a user holding only an unrelated scope', () => {
			expect(withScopes(['workflow:read'])?.available).toBe(false);
		});

		it.each<Scope>(['mcp:manage', 'mcp:oauth', 'mcpApiKey:create', 'mcpApiKey:rotate'])(
			'should show the item to a user with the %s scope',
			(scope) => {
				expect(withScopes([scope])?.available).toBe(true);
			},
		);

		it('should re-evaluate availability when scopes change after registration', () => {
			const item = withScopes([]);
			expect(item?.available).toBe(false);

			useRBACStore().addGlobalScope('mcp:oauth');

			expect(item?.available).toBe(true);
		});
	});

	describe('label', () => {
		const MCP_LABEL_KEY = 'settings.mcp';

		afterEach(() => {
			setLanguage('en');
		});

		it('should read the label from i18n', () => {
			expect(settingsPage()?.label).toBe('Instance-level MCP');
		});

		it('should follow a language change after registration', () => {
			const item = settingsPage();

			// `Object.fromEntries`, because a dotted i18n key is not a lintable
			// object-literal property name.
			i18nInstance.global.mergeLocaleMessage(
				'de',
				Object.fromEntries([[MCP_LABEL_KEY, 'MCP-Zugriff']]),
			);
			setLanguage('de');

			expect(item?.label).toBe('MCP-Zugriff');
		});

		it('should read i18n lazily, not when the descriptor is imported', () => {
			// The shell imports the descriptor at boot, before `App.vue` sets the language.
			const descriptor = Object.getOwnPropertyDescriptor(settingsPage(), 'label');

			expect(typeof descriptor?.get).toBe('function');
			expect(descriptor?.value).toBeUndefined();
		});
	});

	describe('routes', () => {
		it('should keep the route names and paths', () => {
			expect(MCPModule.routes?.map(({ path, name }) => ({ path, name }))).toEqual([
				{ path: 'mcp', name: MCP_SETTINGS_VIEW },
				{ path: 'mcp/workflows', name: MCP_WORKFLOWS_VIEW },
				{ path: 'mcp/agents', name: MCP_AGENTS_VIEW },
				{ path: 'mcp/clients', name: MCP_CLIENTS_VIEW },
			]);
		});

		it('should load every view lazily, so the shell does not pull them in at boot', () => {
			for (const route of MCPModule.routes ?? []) {
				expect(typeof route.component).toBe('function');
			}
		});
	});

	it('should register no modals: the connect dialogs belong to their views', () => {
		expect(MCPModule).not.toHaveProperty('modals');
	});
});
