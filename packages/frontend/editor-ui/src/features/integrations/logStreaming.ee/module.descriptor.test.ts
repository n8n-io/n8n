import { VIEWS } from '@n8n/frontend-constants/views';

import { LOG_STREAM_MODAL_KEY } from './modals';
import { LogStreamingModule } from './module.descriptor';

describe('LogStreamingModule', () => {
	it('should use the backend module id', () => {
		expect(LogStreamingModule.id).toBe('log-streaming');
	});

	it('should leave the settings sidebar item to the shell', () => {
		expect(LogStreamingModule).not.toHaveProperty('settingsPages');
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

		it('should not check the module state, so unlicensed users still reach the paywall', () => {
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
