![n8n.io - Workflow Automation](https://user-images.githubusercontent.com/65276001/173571060-9f2f6d7b-bac0-43b6-bdb2-001da9694058.png)

# @n8n/design-system

A component system for [n8n](https://n8n.io) using Storybook to preview.

## Project setup

```
pnpm install
```

### Compiles and hot-reloads for development

```
pnpm storybook
```

### Build static pages

```
pnpm build:storybook
```

### Run your unit tests

```
pnpm test:unit
```

### Lints and fixes files

```
pnpm lint
```

### Build css files

```
pnpm build:theme
```

### Monitor theme files and build any changes

```
pnpm watch:theme
```

### Check the declarations this package ships

```
pnpm typecheck:libcheck
```

`build` runs this after the emit. Consumers compile with `skipLibCheck: true`, so
a broken `.d.ts` here is invisible to them until they turn it off — at which point
they cannot fix it. The check compiles `dist/**/*.d.ts` with `skipLibCheck: false`
and no `paths` mappings, so the declarations resolve their imports the way an
installed consumer would. It fails on errors in this package's files only, and
counts the third-party ones (`--verbose` lists them).

## License

You can find the license information [here](https://github.com/n8n-io/n8n/blob/master/README.md#license)
