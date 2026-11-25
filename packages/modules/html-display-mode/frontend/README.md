# @n8n/frontend-module-html-display-mode

Frontend feature module for the HTML display mode in the NDV and Logs run data panels. It shows the
HTML that the HTML node generates with the "Generate HTML template" operation, through the design
system's sanitised preview. The editor-ui shell consumes it from source through
`src/app/modules.manifest.ts`.

```bash
pnpm turbo typecheck --filter=@n8n/frontend-module-html-display-mode
pnpm turbo lint --filter=@n8n/frontend-module-html-display-mode
pnpm turbo test --filter=@n8n/frontend-module-html-display-mode
```

See `packages/@n8n/module-cli/frontend-module-guide.md` for the module rules.
