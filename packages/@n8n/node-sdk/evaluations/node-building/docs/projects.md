# Projects API

Base URL: `http://127.0.0.1:18090/projects/v1`

All requests and responses use JSON.

## Authentication

Send the API key as a bearer token: `Authorization: Bearer <key>`. API keys
start with `prj_`. Use the sandbox key `prj_sandbox` for tests.

A request without a valid key gets `401 {"error": "unauthorized"}`.

## Project object

| Field       | Type   | Notes                     |
|-------------|--------|---------------------------|
| `id`        | string | For example `pj_3a00`     |
| `name`      | string | For example `Alpha project 1` |
| `createdAt` | string | ISO 8601 date-time        |

The web app shows a project at `https://app.projects.test/p/<id>`, for example
`https://app.projects.test/p/pj_3a00`.

## List projects

`GET /projects`

Query parameters:

| Name     | Required | Notes                                                       |
|----------|----------|-------------------------------------------------------------|
| `q`      | no       | Text that the project name contains, in any case.           |
| `limit`  | no       | 1 to 10. Default 5.                                         |
| `cursor` | no       | The `nextCursor` of the previous page.                      |

Response `200`:

```json
{
  "data": [
    { "id": "pj_3a00", "name": "Alpha project 1", "createdAt": "2026-05-01T00:00:00.000Z" }
  ],
  "nextCursor": "NQ"
}
```

`nextCursor` is `null` on the last page. To get the next page, send the same
query again and add `cursor=<nextCursor>`.

Errors: `400 {"error": "..."}` for an invalid `limit` or `cursor`.

## Get a project

`GET /projects/{id}`

Response `200`: the project.

Errors: `404 {"error": "not_found", "message": "project <id> not found"}`.
