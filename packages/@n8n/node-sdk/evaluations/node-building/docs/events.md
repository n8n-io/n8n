# Events API

Base URL: `http://127.0.0.1:18090/events/v1`

All responses use JSON.

## Authentication

Send the API key in the `X-Events-Key` header. API keys start with `evt_`.
Use the sandbox key `evt_sandbox` for tests.

A request without a valid key gets `401 {"error": "unauthorized"}`.

## List events

`GET /events`

Query parameters:

| Name              | Required | Notes                                                        |
|-------------------|----------|--------------------------------------------------------------|
| `occurred_after`  | yes      | Events at this time or later. A UTC time, see below.         |
| `occurred_before` | no       | Events before this time. A UTC time, see below.              |
| `limit`           | no       | Events in one page, 1 to 50. Default 20.                     |
| `cursor`          | no       | Set by the `next` link. Do not make it yourself.             |

A UTC time has exactly the form `YYYY-MM-DDTHH:mm:ssZ`, for example
`2026-03-01T07:30:00Z`. The API rejects offsets such as `+02:00` and
fractional seconds with `400`.

Response `200` lists events from the oldest to the newest:

```json
{
  "data": [
    { "id": "evt_001", "type": "user.login", "actor": "ada", "occurredAt": "2026-03-27T00:00:00Z", "deleted": false },
    { "id": "evt_006", "occurredAt": "2026-03-27T06:15:00Z", "deleted": true }
  ]
}
```

A deleted event stays in the list as a tombstone. A tombstone has only `id`,
`occurredAt`, and `deleted: true`.

## Pagination

Each response has a `Link` header:

```
Link: <http://127.0.0.1:18090/events/v1/events?occurred_after=2026-03-27T00%3A00%3A00Z>; rel="first", <http://127.0.0.1:18090/events/v1/events?occurred_after=2026-03-27T00%3A00%3A00Z&cursor=MjA>; rel="next"
```

To get the next page, send a GET request to the `rel="next"` URL. The URL
keeps your filters. The last page has no `rel="next"` link.

Errors: `400 {"error": "..."}` for a missing or invalid parameter.

Events in the sandbox: one event each 75 minutes from `2026-03-27T00:00:00Z`
to `2026-03-31T02:45:00Z`.
