// The jsdom harness — observers, matchMedia, canvas, timers, teardown guards.
import '@n8n/vitest-config/setup/frontend';

import { loadLanguage, type LocaleMessages } from '@n8n/i18n';
import englishBaseText from '@n8n/i18n/locales/en.json';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach } from 'vitest';

/**
 * The framework boot every frontend package repeats: english messages, and a fresh pinia per test.
 *
 * `@n8n/vitest-config` cannot host this. `@n8n/i18n` devDepends on it, so importing i18n from the
 * shared harness closes a cycle in the turbo graph. Nothing imports this package back, so it can
 * hold what the harness cannot.
 *
 * `useI18n()` reads a module-level singleton, so `loadLanguage` runs once at import and needs no
 * app instance. Without it `baseText` returns the key itself. The strings are the central
 * `en.json`; per-module locales are a later wave.
 *
 * Use it from a package's vitest setup file:
 * `import '@n8n/frontend-test-utils/setup';`
 */
loadLanguage('en', englishBaseText as unknown as LocaleMessages);

beforeEach(() => {
	setActivePinia(createPinia());
});
