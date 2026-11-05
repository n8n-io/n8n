# Backend docs site

A local [Starlight](https://starlight.astro.build) site for the onboarding documents in `docs/backend`.
The markdown in `docs/backend` stays the source of truth. This site reads it in place and adds a sidebar, search, and rendered Mermaid diagrams.

## Run it

```sh
pnpm docs:backend
```

The command runs the Astro dev server. Open the printed URL. Edits to the markdown reload the page.

## What the site changes at render time

- `README.md` becomes the home page.
- A fenced `mermaid` block becomes a diagram. The browser renders it with the `mermaid` package, in the active color theme.
- A relative link to another page in `docs/backend` becomes a site route.
- A relative link to any other file in the repository becomes a link to that file on GitHub, on `master`.
- The front matter field `last_reviewed` appears under the page title.
- The remark plugin counts the words of each page. The page title shows the reading time at 200 words a minute.
- A click on a diagram opens it in a full-window overlay. Escape or a click outside closes it.
- The theme follows docs.n8n.io: the Geist fonts, the n8n colors, and the n8n logomark. The theme is in `src/styles/custom.css`.
- One sun and moon button switches between the light and dark themes. It is in `src/components/ThemeSelect.astro`.
- Code blocks use the Shiki highlighter that Astro includes. Expressive Code is off because its stylesheet did not load with Astro 7.

The plugin that does the link and diagram work is `plugins/remark-backend-docs.mjs`. The sidebar order is in `astro.config.mjs` and follows the reading plan in `docs/backend/README.md`. A new page appears in the sidebar without a config change, after the known pages. Month 1 nests its pages by topic. A new page that no topic lists goes into a "More" group.

## Build a static copy

```sh
pnpm --filter @n8n/backend-docs-site build:site
```

The output lands in `dist/`. The script is not named `build`, so `pnpm build` at the repository root does not build the site.

`cookie` is a direct dev dependency for one reason. Astro's prerender step resolves that module from `dist/` with plain Node rules, and in this monorepo the search reaches the root `node_modules`, where an older `cookie` lives. The direct dependency puts the right version first on the path.
