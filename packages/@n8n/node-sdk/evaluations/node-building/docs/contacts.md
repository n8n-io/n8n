# Contacts API

Base URL: `http://127.0.0.1:18090/contacts/v1`

All request bodies and most responses use JSON.

## Authentication

Send the API token in the `X-Contacts-Token` header. Tokens start with `cnt_`.
Use the sandbox token `cnt_sandbox` for tests.

A request without a valid token gets `401 {"error": "unauthorized"}`.

## Contact object

| Field       | Type             | Notes                                              |
|-------------|------------------|----------------------------------------------------|
| `id`        | number           | A 64-bit integer. Do not use it. Use `idStr`.      |
| `idStr`     | string           | The same ID as text. Use it in paths.              |
| `email`     | string           |                                                    |
| `firstName` | string \| null   |                                                    |
| `lastName`  | string \| null   |                                                    |
| `company`   | string \| null   |                                                    |
| `phone`     | string \| null   |                                                    |
| `tags`      | array of strings | Tag names                                          |

Contact IDs are larger than 2^53. A JSON parser that reads numbers as
double-precision floats changes the last digits of `id`. `idStr` keeps all
digits.

```json
{
  "id": 9007199254741001,
  "email": "ada@example.com",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "company": null,
  "phone": null,
  "tags": ["vip", "lead"],
  "idStr": "9007199254741001"
}
```

## Create a contact

`POST /contacts`

Body fields:

| Name        | Required | Notes                    |
|-------------|----------|--------------------------|
| `email`     | yes      | Must contain `@`         |
| `firstName` | no       |                          |
| `lastName`  | no       |                          |
| `company`   | no       |                          |
| `phone`     | no       |                          |

Each field that you send must be a non-empty string. Omit a field that has no
value. The body does not take tags: add them with `POST /contacts/{idStr}/tags`.

Response `201`: the contact, with `tags: []`.

Errors:

- `400 {"error": "..."}` for an unknown field or an empty value.
- `422 {"error": "invalid_email", "message": "email must contain @"}` for an
  invalid email.

## Add tags to a contact

`POST /contacts/{idStr}/tags`

Body: `{"tags": ["vip", "lead"]}`. The array must have one tag or more.

Response `200`: the contact with its tags.

Errors: `400` for an empty or invalid `tags` array. `404 {"error": "not_found",
"message": "contact <id> not found"}` for an unknown ID.

## Delete a contact

`DELETE /contacts/{idStr}`

Response `204` with no body.

Errors: `404` for an unknown ID.

## Search contacts

`GET /contacts`

Query parameters:

| Name   | Required | Notes                                                        |
|--------|----------|--------------------------------------------------------------|
| `tags` | no       | Repeat the parameter for each tag: `?tags=vip&tags=lead`.    |

The response has the contacts that have every given tag. Without `tags`, it
has all contacts. There are no pages.

Response `200`: a JSON array of contacts (not an object):

```json
[
  { "id": 9007199254741001, "email": "ada@example.com", "tags": ["vip", "lead"], "idStr": "9007199254741001" }
]
```

Errors: `400 {"error": "unknown query parameter <name>"}` for any other
parameter name, for example `tags[0]` or `tags[]`.
