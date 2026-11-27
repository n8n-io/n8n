// The shared frontend test harness: the jsdom environment, english messages, and a fresh pinia
// per test. It lives in `@n8n/frontend-test-utils` rather than in `@n8n/vitest-config`, because
// `@n8n/i18n` devDepends on the latter and importing i18n there closes a cycle in the turbo graph.
import '@n8n/frontend-test-utils/setup';

import { APP_MODALS_ELEMENT_ID } from '../roles.constants';

// The dialogs of this module attach to the modals container of the shell (`AppModals.vue`).
// The shell does not render in these tests, so each test adds the container itself.
beforeEach(() => {
	const appModals = document.createElement('div');
	appModals.id = APP_MODALS_ELEMENT_ID;
	document.body.appendChild(appModals);
});

afterEach(() => {
	document.getElementById(APP_MODALS_ELEMENT_ID)?.remove();
});
