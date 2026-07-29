# Demo: custom UI languages

Quick recipe for demoing `LanguageService` / `N8N_EDITOR_LANGUAGES` locally,
without touching any config files.

## Env vars

- `N8N_EDITOR_LANGUAGES` - JSON object mapping a locale code to the
  translation file to load and the display name to show for it:
  `{"<code>":{"file":"<absolute path>","name":"<display name>"}}`.
  The file is expected to be a complete translation, but anything missing
  (e.g. because the catalog hasn't caught up with a newer n8n version yet)
  falls back to English automatically.
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

## Testing in Docker with translation files in a volume

Same idea as above, but closer to how a self-hosting customer would run it:
the translation file lives on the host, mounted into the container as a
read-only volume, and `N8N_EDITOR_LANGUAGES` points at the path *inside* the
container.

```bash
mkdir -p ~/.n8n-languages
cp packages/frontend/@n8n/i18n/src/locales/en.json ~/.n8n-languages/es.json
# edit ~/.n8n-languages/es.json to translate whichever keys you want to test

docker run -it --rm --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -v ~/.n8n-languages:/files/languages:ro \
  -e N8N_EDITOR_LANGUAGES='{"es":{"file":"/files/languages/es.json","name":"Español"}}' \
  -e N8N_DEFAULT_LOCALE=es \
  docker.n8n.io/n8nio/n8n
```

Notes:
- The container path in `N8N_EDITOR_LANGUAGES` (`/files/languages/es.json`)
  must match the volume's mount target, not the host path - `~/.n8n-languages`
  above is only ever visible on the host.
- The list of available languages (which files exist, which locale codes
  are offered) is computed once on first request after the container starts
  and cached for the container's lifetime - adding a new language, or fixing
  a `file` path that didn't exist yet, needs a container restart to show up.
  Editing the *content* of a file for a language that was already available
  at that point takes effect immediately on reload, no restart needed, since
  each language selection re-reads the file from disk.
- To simulate a customer forgetting to update their catalog after an n8n
  upgrade, remove a key from `es.json` and reload (no restart needed) - the
  UI falls back to the English string for that key instead of breaking.
