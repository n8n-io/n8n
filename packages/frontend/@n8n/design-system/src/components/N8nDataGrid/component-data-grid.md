# Component specification

A data grid for tabular data. It shows rows in typed columns. Users can sort, filter, paginate and select rows. Each of sort, filters and pagination runs in the browser (client mode) or on the server (server mode).

The grid also has an edit mode. In edit mode, users can edit cells, paste values, undo edits, delete selected rows, and move and rename columns.

- **Component Name:** N8nDataGrid
- **Base:** [AG Grid Community](https://www.ag-grid.com/vue-data-grid/) 34 with `ag-grid-vue3`
- **First consumer:** the data tables grid in `editor-ui/src/features/core/dataTable/`

## Why?

The data tables grid is the only AG Grid component in n8n. It is tied to data tables: it calls the data table store directly and builds its columns from the data table schema. Sort, filters and row positions follow data table rules. Other views need a grid too, for example the node output table (`RunDataTable.vue`). This component moves the generic grid into the design system. The data table rules stay in the data table feature.

## Concepts

### Client mode and server mode

Sort, filters and pagination each have a mode prop: `sortMode`, `filterMode` and `paginationMode`.

- **Client mode** (default): the grid sorts, filters and paginates `rows` itself. The state props are optional. The change handlers only tell the parent about a change.
- **Server mode**: the grid does not change the order or the set of rows. It shows `rows` as they are. The parent must pass the state and its change handler. The parent loads the matching rows.

The type enforces server mode. A server-mode usage without the state or the handler is a type error.

### Controlled state

The parent binds the state as a prop and listens for `update:<name>`:

```vue
<N8nDataGrid sort-mode="server" :sort="sort" @update:sort="onSort" />
```

The grid declares `onUpdate:<name>` as a prop, not as an emit. This lets the server-mode type require the handler. Parents write `@update:<name>` as usual. `v-model:<name>` is not supported in server mode, because vue-tsc does not count the handler that `v-model` generates.

The grid shows the state from the props. For example, a header click only calls `onUpdate:sort`. The sort arrow changes when the parent passes the new `sort`. If the parent does not accept the change, nothing changes in the grid.

### Controlled edits

The grid never changes `rows`. An edit, a paste, an undo and a redo each emit `cell-edit`. The parent updates `rows` to accept the edit. If the parent does not update `rows`, the cell shows the old value again.

The grid emits `cell-edit` only when the value changes. It compares the new value with the value in `rows`, by column type. For example, it compares dates by time.

The grid keeps its own undo history of the last 10 edits. Undo emits the reversed edit, and redo emits the edit again. Before it emits, the grid does the same check: if the cell already shows the value that the entry would set, or if the row is no longer in `rows`, the grid removes the entry. It then tries the next entry in the same keypress. This removes rejected edits from the history.

Column order and column labels follow the same rule. A drag emits `column-move`, and a rename emits `column-rename`. The parent updates `columns` to accept the change.

## Public API Definition

The component is generic over the row type: `TRow extends Record<string, unknown>`.

### Types

```ts
type DataGridColumnType = 'string' | 'number' | 'boolean' | 'date' | 'json';

type DataGridColumn<TRow> = {
	id: string;
	field: keyof TRow & string;
	label: string;
	type: DataGridColumnType;
	icon?: IconName;
	width?: number;
	minWidth?: number;
	maxWidth?: number;
	flex?: number;
	sortable?: boolean; // default: true
	filterable?: boolean; // default: true, false for 'json'
	editable?: boolean | ((row: TRow) => boolean); // default: true, false for 'json'
	resizable?: boolean; // default: true
	lock?: 'left' | 'right'; // the column cannot move and stays at that side
	renameable?: boolean; // default: false
	actions?: DataGridColumnAction[];
	cellSlot?: boolean | ((row: TRow) => boolean); // default: false, renders the `cell` slot for this column, or for the rows where the function returns `true`
	format?: (value: unknown) => string;
	cellClass?: string | ((row: TRow) => string | undefined);
	headerClass?: string;
};

type DataGridColumnAction = {
	id: string;
	label: string;
	icon?: IconName;
	disabled?: boolean;
};

type DataGridSort = { field: string; direction: 'asc' | 'desc' } | null;

type DataGridFilterOperator =
	| 'contains'
	| 'equals'
	| 'notEqual'
	| 'lessThan'
	| 'lessThanOrEqual'
	| 'greaterThan'
	| 'greaterThanOrEqual'
	| 'between'
	| 'isEmpty'
	| 'notEmpty'
	| 'null'
	| 'notNull'
	| 'true'
	| 'false';

type DataGridFilterValue = string | number | boolean | Date | null;

type DataGridFilter = {
	field: string;
	operator: DataGridFilterOperator;
	value?: DataGridFilterValue;
	valueTo?: DataGridFilterValue; // only for 'between'
};

type DataGridCellEdit = {
	rowKey: string;
	field: string;
	oldValue: unknown;
	newValue: unknown;
};
```

Filter operators for each column type. Each operator has a predicate for client mode.

| Type | Operators |
|---|---|
| `string` | `contains`, `equals`, `notEqual`, `isEmpty`, `notEmpty`, `null`, `notNull` |
| `number` | `equals`, `notEqual`, `lessThan`, `lessThanOrEqual`, `greaterThan`, `greaterThanOrEqual`, `between`, `null`, `notNull` |
| `date` | the same as `number` |
| `boolean` | `true`, `false`, `null`, `notNull` |
| `json` | none |

Each column has one filter condition. Filters on different columns combine with AND.

### Props

**Data**

- `rows: TRow[]` - The rows to show. In server mode these are the rows of the current page.
- `columns: DataGridColumn<TRow>[]` - The columns, in display order.
- `rowKey: (keyof TRow & string) | ((row: TRow) => string)` - A stable, unique key for each row.
- `loading?: boolean` - Shows the loading state. It hides the empty state. Default: `false`

**Editing and selection**

- `editable?: boolean` - Turns on edit mode for cells. Users can edit cells, paste values and delete selected rows. Default: `false`
- `columnsEditable?: boolean` - Turns on edit mode for columns. Users can move columns, rename columns and use column actions. Default: `false`
- `selectable?: boolean` - Shows a checkbox column for row selection. Default: `false`
- `selectionDisabled?: boolean` - Keeps the checkbox column visible but stops users from selecting rows, so the columns do not move when selection turns off for a short time. Default: `false`
- `selectedKeys?: string[]` - The keys of the selected rows. The grid keeps its own selection if this is not set.
- `onUpdate:selectedKeys?: (keys: string[]) => void`

**Sort**

| `sortMode` | `sort` | `onUpdate:sort` |
|---|---|---|
| `'client'` (default) | optional, the initial sort | optional |
| `'server'` | required | required |

**Filters**

| `filterMode` | `filters` | `onUpdate:filters` |
|---|---|---|
| `'client'` (default) | optional, the initial filters | optional |
| `'server'` | required | required |

**Pagination**

| `paginationMode` | `page`, `itemsPerPage` | `total` | `onUpdate:page`, `onUpdate:itemsPerPage` |
|---|---|---|---|
| `'client'` (default) | optional | not allowed | optional |
| `'server'` | required | required | required |
| `'none'` | not allowed | not allowed | not allowed |

- `pageSizes?: number[]` - Options for the page size selector. Default: `[10, 20, 50]`

Names follow `N8nPagination` (`itemsPerPage`, `pageSizes`). The grid renders `N8nPagination` below the rows.

In client mode, a change of sort or filters sets the page to 1. If `rows` gets shorter and the current page no longer exists, the grid goes to the last page. It does not go to page 1 on every change of `rows`, because accepted edits also change `rows`. In server mode, the grid never changes the page itself. The parent decides.

### Events

- `@cell-edit` - A cell value changes because of an edit, a paste, an undo or a redo. Payload: `(edit: DataGridCellEdit) => void`. The grid does not emit an edit that does not change the value.
- `@column-move` - The user drops a column at a new position. Payload: `({ columnId: string; toIndex: number }) => void`. `toIndex` is an index in `columns`.
- `@column-rename` - The user renames a column in its header. Payload: `({ columnId: string; label: string }) => void`
- `@column-action` - The user selects a column action. Payload: `({ columnId: string; actionId: string }) => void`
- `@delete-selected` - The user presses Delete or Backspace while rows are selected and `editable` is `true`. Payload: `(keys: string[]) => void`
- `@grid-ready` - The grid is set up and shows its columns. Payload: `() => void`
- `@first-data-rendered` - The grid shows rows for the first time. It does not fire while there are no rows. Payload: `() => void`

`update:sort`, `update:filters`, `update:page`, `update:itemsPerPage` and `update:selectedKeys` are props. See [Controlled state](#controlled-state).

### Slots

- `cell`: `{ row: TRow; column: DataGridColumn<TRow>; value: unknown; formattedValue: string }` - Custom cell content. The grid uses it only for the cells that `cellSlot` selects.
- `header-append` - Content in a fixed last column header, for example an "add column" button. The grid adds this column only when the slot is set.
- `footer-row` - Content in a pinned row below the data rows, for example an "add row" button. It renders in the cell of the first column. When there are no rows, the empty state shows in the same row.
- `empty` - Content when `rows` is empty and `loading` is `false`. Default: "No rows".

### Exposed methods

- `focusCell(rowKey: string, field?: string, options?: { edit?: boolean }): void` - Scrolls to a cell and focuses it. Without `field`, it uses the first editable column. With `edit: true`, it also starts editing.

### Keyboard

| Key | Action |
|---|---|
| Click on the focused cell, Enter | Start editing |
| Escape | Stop editing, or clear the selection |
| Ctrl/Cmd + C | Copy the focused cell value |
| Ctrl/Cmd + V | Paste into the focused cell. The value is converted to the column type. A value that cannot be converted is ignored. |
| Ctrl/Cmd + Z | Undo the last edit |
| Ctrl/Cmd + Shift + Z, Ctrl + Y | Redo |
| Delete, Backspace | Emit `delete-selected` |

### Built-in cell behavior

- `null` and `undefined` show as "Null", and `''` shows as "Empty", both in italics.
- `string`: edits in a large text popup. If the user opens the editor on `null` and saves without typing, the value stays `null`.
- `number`: shows with a space as the thousands separator and a dot as the decimal separator. The format does not depend on the browser locale, because that locale can be different from the n8n UI language. Use `format` to change it.
- `boolean`: shows and edits as a checkbox.
- `date`: shows as ISO 8601 in the local time zone, and edits with a date-time picker.
- `json`: shows `JSON.stringify(value)`. It cannot be edited, sorted or filtered.

## Not part of the grid

The consumer handles these:

- Loading and saving data, and errors, toasts and confirmation dialogs.
- The backend formats for sort and filters.
- System columns and their rules, for example `id`, `createdAt` and `updatedAt` in data tables.
- The content of "add column" and "add row".
- Telemetry.

## Later (not in the first version)

These are for the node output table (`RunDataTable.vue`). The API above leaves room for them without breaking changes.

- `layout?: 'auto' | 'fill'` - `'fill'` uses the height of the parent and scrolls rows inside the grid.
- A `header` slot for custom header content.
- Drag of headers and cells, for mapping values into parameters.

## Template usage examples

**Client mode:**

```vue
<script setup lang="ts">
import { N8nDataGrid, type DataGridColumn } from '@n8n/design-system';

type User = { id: string; name: string; age: number };

const columns: Array<DataGridColumn<User>> = [
	{ id: 'name', field: 'name', label: 'Name', type: 'string' },
	{ id: 'age', field: 'age', label: 'Age', type: 'number' },
];
const rows = ref<User[]>([...]);

function onCellEdit({ rowKey, field, newValue }: DataGridCellEdit) {
	rows.value = rows.value.map((row) => (row.id === rowKey ? { ...row, [field]: newValue } : row));
}
</script>

<template>
	<N8nDataGrid :rows="rows" :columns="columns" row-key="id" editable @cell-edit="onCellEdit" />
</template>
```

**Server mode (data tables):**

```vue
<template>
	<N8nDataGrid
		:rows="rows"
		:columns="columns"
		row-key="id"
		:loading="loading"
		:editable="!readOnly"
		:columns-editable="!readOnly && !schemaReadOnly"
		:selectable="!readOnly"
		sort-mode="server"
		:sort="sort"
		@update:sort="onSort"
		filter-mode="server"
		:filters="filters"
		@update:filters="onFilters"
		pagination-mode="server"
		:page="page"
		:items-per-page="itemsPerPage"
		:total="total"
		@update:page="onPage"
		@update:items-per-page="onItemsPerPage"
		@cell-edit="onCellEdit"
		@column-move="onColumnMove"
		@column-rename="onColumnRename"
		@column-action="onColumnAction"
		@delete-selected="onDeleteSelected"
	>
		<template #header-append><AddColumnButton /></template>
		<template #footer-row><AddRowButton /></template>
	</N8nDataGrid>
</template>
```

## Decisions

- The grid has no search. Search fields sit outside the grid in the consumer's layout, for example in the data table header or the NDV panel header. The consumer filters `rows` itself or sends the search text to its backend. A change of the search text does not change the grid page. The consumer sets the page, for example to 1.
- `selectable` and `editable` are independent. Bulk actions on selected rows are not always edits, for example an export. A read-only data table keeps its checkbox column and disables it (`selectionDisabled`), as it does today. This keeps the columns in place when the Instance AI preview locks and unlocks the grid.
- Stories use the title `Experimental/DataGrid`.
- The number format does not depend on the browser locale. See [Built-in cell behavior](#built-in-cell-behavior).
- Edit mode is off by default (`editable` and `columnsEditable` are `false`).
