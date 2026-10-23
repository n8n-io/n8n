import { VIEWS } from '@n8n/frontend-constants/views';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { createPinia, setActivePinia } from 'pinia';

import { LOG_STREAM_MODAL_KEY } from './modals';
import { LogStreamingModule } from './module.descriptor';

describe('LogStreamingModule', () => {
	it('should use the backend module id', () => {
		expect(LogStreamingModule.id).toBe('log-streaming');
	});

	it('should register the settings sidebar item with the previous order', () => {
		expect(LogStreamingModule.settingsPages?.map(({ id, order }) => ({ id, order }))).toEqual([
			{ id: 'settings-log-streaming', order: 170 },
		]);
	});

	describe('settings sidebar item', () => {
		const item = () => LogStreamingModule.settingsPages![0];

		beforeEach(() => {
			setActivePinia(createPinia());
		});

		it('should be available to a user with the logStreaming:manage scope', () => {
			useRBACStore().setGlobalScopes(['logStreaming:manage']);

			expect(item().available).toBe(true);
		});

		it('should be hidden from a user without the logStreaming:manage scope', () => {
			useRBACStore().setGlobalScopes(['workflow:read']);

			expect(item().available).toBe(false);
		});
	});

	it('should show the paywall only while log streaming is unlicensed', () => {
		expect(LogStreamingModule.placeholderPage).toEqual({
			licenseFlag: 'logStreaming',
			component: expect.any(Function),
		});
	});

	describe('routes', () => {
		const route = () => LogStreamingModule.routes?.[0];

		it('should keep the route name and path', () => {
			expect(LogStreamingModule.routes?.map(({ path, name }) => ({ path, name }))).toEqual([
				{ path: 'log-streaming', name: VIEWS.LOG_STREAMING_SETTINGS },
			]);
		});

		it('should check the logStreaming:manage scope', () => {
			expect(route()?.meta?.middlewareOptions?.rbac).toEqual({ scope: 'logStreaming:manage' });
		});

		it('should not list the module guard, because the shell adds it for a placeholder page', () => {
			expect(route()?.meta?.middleware).toEqual(['authenticated', 'rbac']);
		});

		it('should register the route under the settings route', () => {
			expect(route()?.meta?.telemetry?.pageCategory).toBe('settings');
		});

		it('should load the view lazily, so the shell does not pull it in at boot', () => {
			expect(typeof route()?.component).toBe('function');
		});
	});

	describe('modals', () => {
		it('should register the destination modal lazily', () => {
			expect(LogStreamingModule.modals).toEqual([
				{
					key: LOG_STREAM_MODAL_KEY,
					component: expect.any(Function),
					initialState: { open: false, data: undefined },
				},
			]);
		});
	});
});
