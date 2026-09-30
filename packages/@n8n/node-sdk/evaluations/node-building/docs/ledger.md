# Ledger API

Base URL: `http://127.0.0.1:18090/ledger/api`

All responses use JSON.

## Authentication

Send a bearer token: `Authorization: Bearer <token>`. Tokens start with `ldg_`.
Use the sandbox token `ldg_sandbox` for tests.

A request without a valid token gets `401 {"error": "unauthorized"}`.

## Get an invoice

`GET /invoices/{invoiceId}`

Response `200` wraps the invoice in `data`:

```json
{
  "data": {
    "id": "inv_1001",
    "number": "2026-0001",
    "status": "open",
    "currency": "EUR",
    "customer": { "id": "cus_1", "name": "Acme Corp" },
    "issuedAt": "2026-09-01",
    "dueDate": "2026-10-15",
    "totalCents": 12950,
    "lineItems": [
      { "sku": "SUP-1", "description": "Support hours", "quantity": 3, "unitPriceCents": 2500, "totalCents": 7500 }
    ]
  }
}
```

Notes:

- Every amount is an integer number of cents (`12950` is 129.50).
- `dueDate` is a date string or `null` (draft invoices have no due date).
- `status` is `draft`, `open`, or `paid`.

Errors: `404 {"error": "not_found", "message": "Invoice <id> not found"}` for an
unknown invoice ID.

Invoices in the sandbox: `inv_1001`, `inv_1002`, `inv_1003`.
