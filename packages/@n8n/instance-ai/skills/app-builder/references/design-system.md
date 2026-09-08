# @n8n/design-system in an app

Version pinned in the template: see `templates/vue/package.json`.

**In the sandbox, use the CSS tokens only.** `@n8n/design-system/theme.css`
is a plain stylesheet (tokens, fonts, reset, dark mode) and costs no build
memory. The `N8n*` Vue components are not available by default: importing any
of them pulls the whole component library plus element-plus and tiptap into
the bundle, and `vite build` then needs more than 1 GiB while the sandbox has
512 MiB. The build dies with exit 134 or 137.

```ts
// src/main.ts — the template already does this
import '@n8n/design-system/theme.css';
import './style.css';
```

Style plain elements with the tokens below. The template's `src/style.css`
ships `.button`, `.button--secondary`, `.card`, `.heading` and `.text`; add
more classes there. Do not add `import { ... } from '@n8n/design-system'`.

## Tokens (CSS variables)

Use these in `<style scoped>` instead of raw px values.

- Spacing: `--spacing--5xs` … `--spacing--3xs`, `--spacing--2xs`, `--spacing--xs`,
  `--spacing--sm`, `--spacing--md`, `--spacing--lg`, `--spacing--xl`,
  `--spacing--2xl` … `--spacing--5xl`
- Radius: `--radius--xs`, `--radius--sm`, `--radius`, `--radius--md`,
  `--radius--lg`, `--radius--xl`, `--radius--full`
- Font: `--font-family`, `--font-family--monospace`, `--font-size--3xs` …
  `--font-size--2xl`, `--font-weight--regular`, `--font-weight--medium`,
  `--font-weight--bold`
- Text colors: `--color--text`, `--color--text--shade-1`, `--color--text--tint-1`,
  `--color--text--danger`
- Surfaces: `--color--background`, `--color--background--light-1`,
  `--color--background--light-2`, `--color--background--light-3`,
  `--color--background--shade-2`
- Borders: `--border-color`, `--border-color--subtle`, `--border-color--strong`,
  `--border-color--stronger`
- Brand/status: `--color--primary`, `--color--danger`, `--color--success`,
  `--color--warning`
- Interactive surfaces (what `.button` uses): `--background--brand`,
  `--background--brand--hover`, `--background--brand--active`,
  `--background--brand--focus`, `--background--surface`, `--background--hover`,
  `--text-color`, `--height--sm`, `--height--md`, `--height--lg`
- Shorthands: `--border` (1px solid `--border-color`), `--line-height--sm`,
  `--line-height--md`

Dark mode is automatic through `color-scheme`; set `data-theme="dark"` on
`<body>` to force it.

```vue
<style scoped>
.grid {
	display: grid;
	gap: var(--spacing--md);
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
.panel {
	padding: var(--spacing--lg);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--background--light-2);
}
</style>
```

## Only when memory allows: Vue components

Skip this section in the sandbox (512 MiB). It applies only when the build
runs on a machine with at least 1 GiB of memory and the user accepts a ~1.3 MB
JavaScript bundle. Then the components need the global stylesheet and the
plugin once:

```ts
// src/main.ts
import '@n8n/design-system/style.css';
import { N8nPlugin } from '@n8n/design-system';
import { createApp } from 'vue';

createApp(App).use(N8nPlugin, {}).use(router).mount('#app');
```

Import components where you use them:

```vue
<script setup lang="ts">
import { N8nButton, N8nCard, N8nHeading, N8nInput } from '@n8n/design-system';
</script>
```

### Components (props; all optional unless marked)

| Component | Props | Notes |
|---|---|---|
| `N8nButton` | `variant`: solid \| subtle \| ghost \| outline \| destructive \| success · `size`: xsmall \| small \| medium \| large \| xlarge · `loading`, `disabled`, `iconOnly`: boolean · `href` | Content is the slot: `<N8nButton>Save</N8nButton>`. Emits `click`. |
| `N8nIconButton` | `icon` (required, lucide name e.g. `plus`, `trash-2`, `x`, `check`, `search`, `refresh-cw`) + button props | Square icon-only button. |
| `N8nInput` | `modelValue`: string \| number · `type`: text \| textarea \| number \| password \| email \| url · `size`: mini \| small \| medium \| large \| xlarge · `placeholder`, `disabled`, `readonly`, `clearable`, `rows`, `maxlength` | `v-model`. Slots `prefix`, `suffix`. |
| `N8nInputNumber` | `modelValue`: number · `min`, `max`, `step`, `precision`, `controls`, `size`, `placeholder` | `v-model`. |
| `N8nSelect` + `N8nOption` | Select: `modelValue`, `placeholder`, `size`: mini \| small \| medium \| large \| xlarge · `disabled`, `filterable`, `multiple`, `clearable` — Option: `value` (required), `label`, `disabled` | `<N8nSelect v-model="x"><N8nOption v-for="o in opts" :key="o.value" :value="o.value" :label="o.label" /></N8nSelect>` |
| `N8nCheckbox` | `modelValue`: boolean · `label`, `disabled`, `indeterminate` | `v-model`. |
| `N8nSwitch` | `modelValue`: boolean · `label`, `disabled`, `size`: small \| medium | `v-model`. |
| `N8nInputLabel` | `label`, `tooltipText`, `required`, `bold`, `size`: small \| medium \| large · `inputName` | Wrap an input: `<N8nInputLabel label="Email"><N8nInput … /></N8nInputLabel>` |
| `N8nCard` | `hoverable`: boolean | Slots: default, `header`, `footer`, `prepend`, `append`. |
| `N8nHeading` | `tag`: h1…h6 (default span) · `size`: 2xlarge \| xlarge \| large \| medium \| small · `bold`, `color`: primary \| text-dark \| text-base \| text-light \| danger · `align` | `<N8nHeading tag="h1" size="2xlarge" bold>Title</N8nHeading>` |
| `N8nText` | `tag` (default span) · `size`: xsmall \| small \| medium \| large \| xlarge · `bold`, `compact`, `color`: primary \| secondary \| text-dark \| text-base \| text-light \| text-xlight \| danger \| success \| warning · `align` | Body copy. Use `tag="p"` for paragraphs. |
| `N8nLink` | `to` (router location or URL), `newWindow`, `size`, `bold`, `underline`, `theme`: primary \| secondary \| text \| danger | Slot is the text. |
| `N8nTabs` | `modelValue` · `options`: `{ value, label, icon?, disabled?, tooltip? }[]` · `size`: small \| medium · `variant`: modern \| legacy | `v-model` holds the active `value`. |
| `N8nTag` | `text` (required), `clickable`, `size`: sm \| md \| lg | Emits `click`. |
| `N8nBadge` | `theme`: default \| success \| warning \| danger \| primary \| secondary \| tertiary · `size`, `bold`, `showBorder` | Slot is the text. |
| `N8nCallout` | `theme` (required): info \| success \| secondary \| warning \| danger \| custom · `icon`, `slim`, `iconless` | Slot is the message; slot `actions` for buttons. |
| `N8nNotice` | `theme`: success \| warning \| danger \| info (default warning) · `content`, `compact` | Inline notice; `content` or slot. |
| `N8nTooltip` | `content`, `placement`: top \| bottom \| left \| right (+ `-start`/`-end`), `disabled`, `showAfter` | Wraps the trigger: `<N8nTooltip content="Hint"><N8nButton …/></N8nTooltip>` |
| `N8nIcon` | `icon` (required, lucide name), `size`: xsmall \| small \| medium \| large \| xlarge or px number · `color`, `spin` | Icon names: kebab-case lucide, e.g. `check`, `x`, `plus`, `search`, `settings`, `user`, `calendar`, `arrow-right`, `external-link`. |
| `N8nLoading` | `loading`, `rows`, `cols`, `variant`: p \| h1 \| button \| custom \| image \| rect \| circle | Skeleton placeholder. |
| `N8nSpinner` | `size`: xsmall \| small \| medium \| large \| xlarge · `type`: dots \| ring | Indeterminate spinner. |
| `N8nDatatable` | `columns` (required): `{ id, path, label, width? }[]` · `rows` (required): objects read by `path` · `pagination`, `rowsPerPage`, `currentPage` | Simple table with client-side pagination. |
| `N8nEmptyState` | `heading`, `description`, `icon`, `buttonText`, `buttonVariant`, `calloutText` | Emits `click:button`. |
