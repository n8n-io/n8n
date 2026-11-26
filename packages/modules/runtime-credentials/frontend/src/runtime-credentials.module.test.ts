import { capabilityRegistry } from '@n8n/frontend-module-sdk';

import { RuntimeCredentialsModule } from './runtime-credentials.module';

describe('RuntimeCredentialsModule', () => {
	it('puts the settings page in the security section after the shell link', () => {
		const [page] = RuntimeCredentialsModule.settingsPages;

		expect(page.section).toBe('security');
		expect(page.order).toBeGreaterThan(10);
		expect(page.order).toBeLessThan(20);
	});

	it('adds a project tab and two routes', () => {
		expect(RuntimeCredentialsModule.projectTabs.project).toHaveLength(1);
		expect(RuntimeCredentialsModule.routes).toHaveLength(2);
		expect(RuntimeCredentialsModule.id).toBe('runtime-credentials');
	});

	describe('project tab availability', () => {
		const [tab] = RuntimeCredentialsModule.projectTabs.project ?? [];

		const withScopes = (scopes: string[]) =>
			vi.spyOn(capabilityRegistry, 'use').mockReturnValue({
				scopesFor: () => scopes,
				isReadOnly: () => false,
			} as never);

		afterEach(() => vi.restoreAllMocks());

		it('shows the tab when the project scopes include the request-fed policy scope', () => {
			withScopes(['credentialTypePolicy:manageRequestFed']);

			expect(tab.available?.('project-1')).toBe(true);
		});

		it('hides the tab when the scope is missing, and does not throw before scopes load', () => {
			withScopes([]);

			expect(tab.available?.('project-1')).toBe(false);
		});

		it('hides the tab when there is no project id', () => {
			expect(tab.available?.(undefined)).toBe(false);
		});
	});
});
