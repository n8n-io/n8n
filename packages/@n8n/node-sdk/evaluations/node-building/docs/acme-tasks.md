# Acme Tasks API

Base URL: `http://127.0.0.1:18090/acme-tasks/v1`

All requests and responses use JSON.

## Authentication

Send the API key in the `X-Acme-Key` header. API keys start with `acme_`.
Use the sandbox key `acme_sandbox` for tests.

A request without a valid key gets `401 {"error": "unauthorized"}`.

## Task object

| Field       | Type             | Notes                              |
|-------------|------------------|------------------------------------|
| `id`        | string           | For example `tsk_001`              |
| `title`     | string           |                                    |
| `status`    | `open` \| `done` |                                    |
| `assignee`  | string \| null   | User name, `null` when unassigned  |
| `createdAt` | string           | ISO 8601 date-time                 |

## List tasks

`GET /tasks`

Query parameters:

| Name       | Required | Notes                                                    |
|------------|----------|----------------------------------------------------------|
| `status`   | no       | `open` or `done`. Omit it to list tasks of every status. |
| `pageSize` | no       | 1 to 50. Default 20.                                     |
| `cursor`   | no       | The `nextCursor` of the previous page.                   |

Response `200`:

```json
{
  "data": [
    { "id": "tsk_001", "title": "Task 1", "status": "open", "assignee": null, "createdAt": "2026-01-01T00:00:00.000Z" }
  ],
  "nextCursor": "MjA"
}
```

`nextCursor` is `null` on the last page. To get the next page, send the same
query again and add `cursor=<nextCursor>`. Cursors are opaque strings.

Errors: `400 {"error": "..."}` for an invalid `status`, `pageSize`, or `cursor`.

## Create a task

`POST /tasks`

Body:

| Field      | Required | Notes                                          |
|------------|----------|------------------------------------------------|
| `title`    | yes      | Non-empty string                               |
| `assignee` | no       | Non-empty string. Omit the field for no owner. |

Other fields are rejected. The API sets `status` to `open`.

Response `201`: the created task object.

Errors: `400 {"error": "..."}` for an invalid body.
