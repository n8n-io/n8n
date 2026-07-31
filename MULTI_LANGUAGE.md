# Multi-language support in n8n

## Design goal

n8n ships and maintains only English UI copy. This feature does **not**
introduce additional languages that the n8n team translates or maintains —
instead it lets self-hosting customers supply their **own** translation
catalogs for the languages they care about, entirely outside of the n8n
repository. n8n stays maintenance-free with respect to non-English strings;
the customer owns the catalog file, keeps it up to date, and is responsible
for its accuracy.

## How it works

### Instance-wide configuration

An admin declares available languages via the `N8N_EDITOR_LANGUAGES` env var
(`packages/@n8n/config/src/configs/languages.config.ts`), a JSON object
mapping a locale code to a translation file path and display name, e.g.:

```
N8N_EDITOR_LANGUAGES={"de":{"file":"/files/languages/de.json","name":"Deutsch"}}
N8N_DEFAULT_LOCALE=de
```

`N8N_DEFAULT_LOCALE` (`packages/@n8n/config/src/index.ts`) picks which of
the declared languages (or `en`) renders by default for the whole instance,
including pre-auth pages like login.

`LanguageService` (`packages/cli/src/services/language.service.ts`) reads
this config, verifies each declared file actually exists on disk (skipping
and logging a warning for any that don't, so a bad path doesn't break
startup), and exposes:
- `getAvailableLanguages()` — the list surfaced to the frontend
- `getLanguageCatalog(code)` — loads and parses a specific catalog file
- `isAvailable(code)` — validation helper

The catalog itself is served on demand via
`GET /editor-language/:code` (`packages/cli/src/controllers/translation.controller.ts`),
reachable unauthenticated since the instance default must also render on the
login page.

### Per-user override

Independent of the instance default, an individual user can pick any
instance-declared language for themselves in **Settings → Personal →
Language**. This is persisted as `locale` on the user's settings JSON
(`IUserSettings.locale`, `packages/workflow/src/interfaces.ts`) via
`PATCH /me/settings`, validated in `UserService.updateSettings`
(`packages/cli/src/services/user.service.ts`) against `LanguageService.isAvailable`.

A new `N8N_EDITOR_LANGUAGE_USER_SETTING` env var (default `true`) lets an
admin lock this down instance-wide: when set to `false`,
`LanguagesConfig.userSettingEnabled` is `false`, the language dropdown is
hidden in `SettingsPersonalView.vue` (gated on the
`languageUserSettingEnabled` flag exposed through `FrontendSettings`), and
`UserService.updateSettings` rejects any request that still tries to set
`locale` with a 400 (`UserError`), since personal overrides aren't supported
in that mode.

### Loading and merging catalogs on the frontend

On login (or on locale change), `App.vue`
(`packages/frontend/editor-ui/src/app/App.vue`) computes the effective
locale — the user's personal override if set, otherwise the instance
default — fetches its catalog via `GET /editor-language/:code`, and calls
`loadLanguage(locale, messages)`
(`packages/frontend/@n8n/i18n/src/index.ts`) to register it with vue-i18n.
If the fetch fails (missing/unreadable file, or a user's stale override
pointing at a removed language), it degrades to English rather than
breaking app boot.

### Fallback to English for missing keys

A customer's catalog is expected to be a complete translation of every
string. The gap n8n needs to cover is version drift: n8n doesn't bundle
customer translations into the Docker image, so when an instance is
upgraded and new UI strings are added, it's easy for a customer to forget to
regenerate/update their own catalog file to match. We make sure our own translations are used as fallback using vue-i18n's built-in `fallbackLocale` setting, configured once at
[packages/frontend/@n8n/i18n/src/index.ts:22-28](packages/frontend/@n8n/i18n/src/index.ts#L22-L28):

```ts
export const i18nInstance = createI18n({
	legacy: false,
	locale: 'en',
	fallbackLocale: 'en',
	messages: { en: englishBaseText },
	warnHtmlMessage: false,
});
```

`englishBaseText` (the full English catalog) is always loaded as the `en`
locale's messages. `fallbackLocale: 'en'` tells vue-i18n that whenever a key
is looked up in the active (non-English) locale and isn't found there, it
falls back to the `en` messages for that key. A customer's catalog is loaded
via `loadLanguage()` as a `Partial<LocaleMessages>`
(`packages/frontend/@n8n/i18n/src/index.ts:422`) so that if it does fall
behind the current n8n version, vue-i18n transparently backfills any missing
key from English at lookup time, rather than rendering a blank or broken
label.

## Demo tooling (not for merging to master)

- `scripts/translate-catalog-claude.mjs` — a one-off script used to generate
  a demo translation catalog via the Claude API, for demoing this feature
  locally. Not part of the shipped product.
- `packages/frontend/@n8n/i18n/src/locales/es.json` — the demo Spanish
  catalog this script produced. This file exists only for the local demo
  and must not be merged into `master`.
