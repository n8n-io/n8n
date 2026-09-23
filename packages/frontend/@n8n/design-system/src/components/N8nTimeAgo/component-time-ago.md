# N8nTimeAgo

Renders a date as a relative time, for example "3 minutes ago". The absolute date is available as the `title` attribute.

- **Component name:** `N8nTimeAgo`
- **Reference:** [timeago.js](https://github.com/hustcc/timeago.js)

## Why?

Cards, tables, and detail views show when a resource changed. One component keeps the wording and the tooltip format the same everywhere. The component only formats. The app registers its timeago.js locale once and passes the locale name through the `locale` prop, so the strings stay in the app's translation files.

## Public API

### Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `date` | `string` | Required | Date to render, as an ISO 8601 string. |
| `capitalize` | `boolean` | `false` | Keep the casing of the locale text instead of lowercasing it. |
| `locale` | `string` | `undefined` | Name of a timeago.js locale that the app registered. Omit to use the timeago.js default. |

### Events

None.

### Slots

None.

## Examples

```vue
<N8nTimeAgo :date="workflow.updatedAt" />
<N8nTimeAgo :date="client.grantedAt" capitalize :locale="defaultLocale" />
```
