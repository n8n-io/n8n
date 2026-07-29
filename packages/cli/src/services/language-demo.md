# Demo: custom UI languages

Quick recipe for demoing `LanguageService` / `N8N_EDITOR_LANGUAGES` locally,
without touching any config files.

## Env vars

- `N8N_EDITOR_LANGUAGES` - JSON object mapping a locale code to the
  translation file to load and the display name to show for it:
  `{"<code>":{"file":"<absolute path>","name":"<display name>"}}`.
  The file only needs to contain the keys you want to override - anything
  missing falls back to English automatically.
- `N8N_DEFAULT_LOCALE` - instance-wide default locale. May be set to any
  code declared in `N8N_EDITOR_LANGUAGES` above (defaults to `en`).

## Running with a Spanish demo catalog

Run from `packages/cli`, pointing `file` at wherever you keep the Spanish
translation JSON on your machine (it doesn't need to exist yet - create it
with a handful of keys copied from
`packages/frontend/@n8n/i18n/src/locales/en.json`):

```bash
cd packages/cli

N8N_EDITOR_LANGUAGES='{"es":{"file":"/Users/konstantintieber/dev/n8n/packages/frontend/@n8n/i18n/src/locales/es.json","name":"Español"}}' \
N8N_DEFAULT_LOCALE=es \
pnpm run dev
```

The login page and the rest of the editor UI render in Spanish, falling back
to English for any key not present in `es.json`.

## Demoing the personal override

Once logged in, an individual user can pick a different language than the
instance default in **Settings → Personal → Language** - it's saved on the
user record and takes precedence over `N8N_DEFAULT_LOCALE` for that user
only, without changing the instance-wide setting or restarting the server.
