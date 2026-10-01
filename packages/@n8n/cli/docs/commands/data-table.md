# data-table

Manage n8n data tables and their rows.

## `data-table list`

List all data tables.

```bash
n8n-cli data-table list
```

## `data-table get`

Get a data table by ID.

```bash
n8n-cli data-table get dt-abc
```

## `data-table create`

Create a data table with columns.

```bash
n8n-cli data-table create --name=Inventory \
  --columns='[{"name":"item","type":"string"},{"name":"qty","type":"number"}]'
```

## `data-table delete`

Delete a data table and all its rows.

```bash
n8n-cli data-table delete dt-abc
```

## `data-table rows`

Query rows from a data table.

```bash
n8n-cli data-table rows dt-abc
n8n-cli data-table rows dt-abc --search=keyword --limit=50
n8n-cli data-table rows dt-abc --format=json
```

| Flag | Description |
|------|-------------|
| `--search` | Full-text search across string columns |
| `--filter` | Filter as JSON string |
| `--limit` | Maximum number of results |

## `data-table add-rows`

Insert rows from a JSON file.

```bash
n8n-cli data-table add-rows dt-abc --file=rows.json
```

The JSON file should contain an array of row objects, e.g.:

```json
[
  { "item": "Widget", "qty": 100 },
  { "item": "Gadget", "qty": 50 }
]
```

## `data-table update-rows`

Update rows matching a filter.

```bash
n8n-cli data-table update-rows dt-abc --file=update.json
```

The JSON file should contain `{filter, data}`.

## `data-table upsert-rows`

Upsert rows (update if exists, insert otherwise).

```bash
n8n-cli data-table upsert-rows dt-abc --file=upsert.json
```

## `data-table delete-rows`

Delete rows matching a filter.

```bash
n8n-cli data-table delete-rows dt-abc --filter='{"type":"and","filters":[...]}'
```
