import { VIEWS } from '@n8n/frontend-constants/views';
import type { RouteRecordRaw } from 'vue-router';

import { LOG_STREAM_MODAL_KEY } from './modals';
import { LogStreamingModule } from './module.descriptor';

describe('LogStreamingModule', () => {
	it('should use the backend module id', () => {
		expect(LogStreamingModule.id).toBe('log-streaming');
	});

	it('should not register a settings sidebar item, because the Observability overview lists the page', () => {
		expect(LogStreamingModule).not.toHaveProperty('settingsPages');
	});

	it('should show the paywall only while log streaming is unlicensed', () => {
		expect(LogStreamingModule.placeholderPage).toEqual({
			licenseFlag: 'logStreaming',
			component: expect.any(Function),
		});
	});

	describe('routes', () => {
		// Widened: `defineFrontendModule` keeps the literal tuple, whose members differ in shape.
		const routes: RouteRecordRaw[] = LogStreamingModule.routes;
		const pageRoute = () => routes.find((route) => route.name === VIEWS.LOG_STREAMING_SETTINGS);
		const redirectRoute = () => routes.find((route) => 'redirect' in route);

		it('should keep the route name and path', () => {
			expect(pageRoute()).toMatchObject({
				path: 'log-streaming',
				name: VIEWS.LOG_STREAMING_SETTINGS,
			});
		});

		it('should nest under the Observability overview, so its sidebar link stays active', () => {
			expect(pageRoute()?.meta?.parentRouteName).toBe(VIEWS.OBSERVABILITY_SETTINGS_ROOT);
		});

		it('should check the logStreaming:manage scope', () => {
			expect(pageRoute()?.meta?.middlewareOptions?.rbac).toEqual({
				scope: 'logStreaming:manage',
			});
		});

		it('should not list the module guard, because the shell adds it for a placeholder page', () => {
			expect(pageRoute()?.meta?.middleware).toEqual(['authenticated', 'rbac']);
		});

		it('should load the view lazily, so the shell does not pull it in at boot', () => {
			expect(typeof pageRoute()?.component).toBe('function');
		});

		it('should redirect the old flat settings path to the nested page', () => {
			expect(redirectRoute()).toMatchObject({
				path: 'log-streaming',
				redirect: { name: VIEWS.LOG_STREAMING_SETTINGS },
				meta: { telemetry: { pageCategory: 'settings' } },
			});
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
