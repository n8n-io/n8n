import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useToast } from '@/app/composables/useToast';

/**
 * This module is a pure re-export. Kept as its own test file so the
 * assertion below runs in a module registry where nothing else could have
 * registered a notifier: importing the shim, and only the shim, must leave
 * `useToast` unwired.
 *
 * That is what makes deleting this file behaviour-neutral when the shim is
 * retired. Re-adding a registration here fails this test.
 */
describe('useToast shim', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));

		const appEl = document.createElement('div');
		appEl.id = 'n8n-app';
		document.body.appendChild(appEl);
	});

	afterEach(() => {
		document.getElementById('n8n-app')?.remove();
	});

	it('registers nothing, so removing it changes no behaviour', () => {
		useToast().showMessage({ message: 'Not rendered' });

		expect(document.querySelector('.el-notification')).toBeNull();
	});
});
