// The shared jsdom harness — observers, matchMedia, canvas, timers, teardown guards.
import '@n8n/vitest-config/setup/frontend';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach } from 'vitest';

// Framework boot stays per-package on purpose: `@n8n/i18n` devDepends on
// `@n8n/vitest-config`, so booting i18n from inside the shared harness would
// close a turbo build cycle. Add `useI18n` boot here if this module needs it.
beforeEach(() => {
	setActivePinia(createPinia());
});
