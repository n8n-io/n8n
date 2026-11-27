import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';

import { ApiKeysModule } from './api-keys.module';

// No pinia is active here: importing the descriptor must read no store.
describe('ApiKeysModule', () => {
	it('keeps the module id', () => {
		expect(ApiKeysModule.id).toBe('api-keys');
	});

	describe('route', () => {
		const route = () => {
			expect(ApiKeysModule.routes).toHaveLength(1);
			return ApiKeysModule.routes?.[0];
		};

		it('keeps the route name and the path under settings', () => {
			expect(route()?.path).toBe('api');
			expect(route()?.name).toBe('APISettings');
		});

		// No backend module has the id `api-keys`, so the module is never active. The `'custom'`
		// middleware runs the module availability check and would hide the page from everyone.
		it('keeps the route meta, with no module availability check', () => {
			expect(route()?.meta).toEqual({
				middleware: ['authenticated'],
				telemetry: { pageCategory: 'settings', getProperties: expect.any(Function) },
			});
		});

		it('reports the settings feature to telemetry', () => {
			// The shell types `meta.telemetry` in its own `RouteMeta` augmentation, not here.
			const telemetry = route()?.meta?.telemetry as { getProperties: () => unknown };
			expect(telemetry.getProperties()).toEqual({ feature: 'api' });
		});

		it('loads the view lazily', () => {
			expect(route()?.component).toBeTypeOf('function');
		});
	});

	describe('create or edit modal', () => {
		const modal = () => {
			expect(ApiKeysModule.modals).toHaveLength(1);
			return ApiKeysModule.modals?.[0];
		};

		it('keeps the modal key and its initial state', () => {
			expect(modal()?.key).toBe('createOrEditApiKey');
			expect(modal()?.initialState).toEqual({
				open: false,
				data: { activeId: null, mode: '' },
			});
		});

		it('loads the modal lazily', () => {
			expect(modal()?.component).toBeTypeOf('function');
		});
	});

	// The shell hides these surfaces while a module is inactive, and this module is never active.
	it('does not use a surface that the shell hides for an inactive module', () => {
		const descriptor: FrontendModuleDescription = ApiKeysModule;
		expect(descriptor.settingsPages).toBeUndefined();
		expect(descriptor.pushHandlers).toBeUndefined();
		expect(descriptor.placeholderPage).toBeUndefined();
	});
});
