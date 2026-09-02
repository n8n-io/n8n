// The shared jsdom harness — observers, matchMedia, canvas, timers, teardown guards.
import '@n8n/vitest-config/setup/frontend';

import { loadLanguage, type LocaleMessages } from '@n8n/i18n';
import englishBaseText from '@n8n/i18n/locales/en.json';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach } from 'vitest';

// Framework boot stays per-package on purpose: `@n8n/i18n` devDepends on
// `@n8n/vitest-config`, so booting i18n from inside the shared harness would
// close a turbo build cycle.
//
// `useI18n()` reads a module-level singleton, so this runs once at import and
// needs no app instance — but `baseText` returns the key itself until the
// messages are loaded, and this module's strings still live in the central
// `en.json` (per-module locales are a later wave).
loadLanguage('en', englishBaseText as unknown as LocaleMessages);

beforeEach(() => {
	setActivePinia(createPinia());
});
