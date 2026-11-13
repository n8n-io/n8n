import * as api from './ui-extensions.api';
import { UiExtensionsModule } from './ui-extensions.module';

vi.mock('./ui-extensions.api');

describe('UiExtensionsModule', () => {
	it('has the backend module id', () => {
		expect(UiExtensionsModule.id).toBe('ui-extensions');
	});

	it('loads the views again when the views of the user change', async () => {
		vi.mocked(api.fetchUiExtensionViews).mockResolvedValue([]);

		await UiExtensionsModule.pushHandlers?.uiExtensionViewsChanged?.();

		expect(api.fetchUiExtensionViews).toHaveBeenCalledOnce();
	});
});
