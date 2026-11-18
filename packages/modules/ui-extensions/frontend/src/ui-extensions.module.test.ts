import * as api from './ui-extensions.api';
import { UiExtensionsModule } from './ui-extensions.module';

vi.mock('./ui-extensions.api');

describe('UiExtensionsModule', () => {
	it('has the backend module id', () => {
		expect(UiExtensionsModule.id).toBe('ui-extensions');
	});

	it('serves a page at its own route, behind the login and the module check', () => {
		expect(UiExtensionsModule.routes).toEqual([
			expect.objectContaining({
				path: '/extensions/pages/:pageId',
				name: 'UiExtensionPage',
				meta: { layout: 'default', middleware: ['authenticated', 'custom'] },
			}),
		]);
	});

	it('loads the views again when the views of the user change', async () => {
		vi.mocked(api.fetchUiExtensionViews).mockResolvedValue([]);

		await UiExtensionsModule.pushHandlers?.uiExtensionViewsChanged?.();

		expect(api.fetchUiExtensionViews).toHaveBeenCalledOnce();
	});
});
