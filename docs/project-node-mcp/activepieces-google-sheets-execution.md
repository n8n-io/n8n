# Activepieces Google Sheets execution flow

This document records the tool calls used to answer whether Activepieces could run Google
Sheets actions and then append the following row to the **Financial reports** spreadsheet:

| Month | Amount |
| --- | ---: |
| `01/01/2027` | `5000` |

The calls below are listed in execution order. Calls shown in the same step were executed in
parallel.

## 1. Check the available Activepieces tools

**Tool:** `GetMcpTools`

**Reason:** Confirm that the Activepieces MCP server exposed the tools needed to discover
Google Sheets actions, inspect connections, resolve action schemas, and execute a one-off
action.

**Sent:**

```json
{
  "server": "user-activepieces",
  "pattern": "ap_(run_action|research_pieces|search_actions|list_connections|get_piece_props)"
}
```

**Got:** Matches for:

- `ap_get_piece_props`
- `ap_list_connections`
- `ap_research_pieces`
- `ap_run_action`
- `ap_search_actions`

## 2. Load the schemas for connection lookup, piece research, and action execution

These three `GetMcpTools` calls ran in parallel.

### 2a. Connection lookup schema

**Tool:** `GetMcpTools`

**Reason:** Learn the accepted filters and output contract for listing configured
connections.

**Sent:**

```json
{
  "server": "user-activepieces",
  "toolName": "ap_list_connections"
}
```

**Got:** A schema accepting `pieceName`, `displayName`, and `status` filters. The description
confirmed that results include the connection `externalId`.

### 2b. Piece research schema

**Tool:** `GetMcpTools`

**Reason:** Learn how to discover the correct Google Sheets action for appending one row.

**Sent:**

```json
{
  "server": "user-activepieces",
  "toolName": "ap_research_pieces"
}
```

**Got:** A schema accepting exact `pieceNames` and an optional `forIntent` description.

### 2c. One-off action execution schema

**Tool:** `GetMcpTools`

**Reason:** Learn the payload required to execute a Google Sheets action without creating a
saved flow.

**Sent:**

```json
{
  "server": "user-activepieces",
  "toolName": "ap_run_action"
}
```

**Got:** A schema requiring `pieceName` and `actionName`, with optional `input` and
`connectionExternalId`.

## 3. Find an active Google Sheets connection and the correct action

These two `CallMcpTool` calls ran in parallel.

### 3a. Find the Google Sheets connection

**Tool:** `CallMcpTool` → `user-activepieces/ap_list_connections`

**Reason:** Obtain the configured connection identifier required to authenticate subsequent
Google Sheets calls.

**Sent:**

```json
{
  "pieceName": "google-sheets",
  "status": ["ACTIVE"]
}
```

**Got:**

```json
{
  "externalId": "AH7tf0uR9knUsz7jIiE27",
  "displayName": "Google Sheets",
  "piece": "@activepieces/piece-google-sheets",
  "status": "ACTIVE",
  "scope": "PROJECT"
}
```

### 3b. Research the row insertion action

**Tool:** `CallMcpTool` → `user-activepieces/ap_research_pieces`

**Reason:** Identify the action intended to append one row and avoid using a bulk, update, or
top-insertion action.

**Sent:**

```json
{
  "pieceNames": ["google-sheets"],
  "forIntent": "Add a row to the spreadsheet named Financial reports with Month 01/01/2027 and Amount 5000"
}
```

**Got:** The Google Sheets piece and its action list. `insert_row` (**Add Row**) was the
relevant action. Its guidance said it appends one row to the end of a worksheet and is not
idempotent.

## 4. Load the action-property inspection schema

**Tool:** `GetMcpTools`

**Reason:** Learn how to inspect action inputs and resolve dynamic Google Sheets fields.

**Sent:**

```json
{
  "server": "user-activepieces",
  "toolName": "ap_get_piece_props"
}
```

**Got:** A schema requiring `pieceName`, `actionOrTriggerName`, and `type`, with optional
`auth` and known `input` values for resolving dynamic properties.

## 5. Inspect the spreadsheet lookup action

**Tool:** `CallMcpTool` → `user-activepieces/ap_get_piece_props`

**Reason:** Determine the exact input field names for finding a spreadsheet by title.

**Sent:**

```json
{
  "pieceName": "@activepieces/piece-google-sheets",
  "actionOrTriggerName": "find_spreadsheets",
  "type": "action",
  "auth": "AH7tf0uR9knUsz7jIiE27"
}
```

**Got:** The `find_spreadsheets` schema. It required `spreadsheet_name` and optionally
accepted `exact_match` and `includeTeamDrives`. Its output included spreadsheet names and
IDs.

## 6. Find the Financial reports spreadsheet

**Tool:** `CallMcpTool` → `user-activepieces/ap_run_action`

**Reason:** Resolve the user-provided spreadsheet title to a stable spreadsheet ID before
writing data.

**Sent:**

```json
{
  "pieceName": "@activepieces/piece-google-sheets",
  "actionName": "find_spreadsheets",
  "connectionExternalId": "AH7tf0uR9knUsz7jIiE27",
  "input": {
    "spreadsheet_name": "Financial reports",
    "exact_match": true,
    "includeTeamDrives": true
  }
}
```

**Got:**

```json
{
  "found": true,
  "spreadsheets": [
    {
      "id": "1bR2qGRMfSTnb0Di-ENY5-ahx_7sM4Qh5IiqWLWLtQeo",
      "name": "Financial reports",
      "webViewLink": "https://docs.google.com/spreadsheets/d/1bR2qGRMfSTnb0Di-ENY5-ahx_7sM4Qh5IiqWLWLtQeo/edit?usp=drivesdk"
    }
  ]
}
```

The Activepieces run ID was `xHVlMYETdyRIPOptz0mek`.

## 7. Inspect the worksheet lookup action

**Tool:** `CallMcpTool` → `user-activepieces/ap_get_piece_props`

**Reason:** Check how worksheet tabs can be identified inside the selected spreadsheet.

**Sent:**

```json
{
  "pieceName": "@activepieces/piece-google-sheets",
  "actionOrTriggerName": "find-worksheet",
  "type": "action",
  "auth": "AH7tf0uR9knUsz7jIiE27",
  "input": {
    "spreadsheetId": "1bR2qGRMfSTnb0Di-ENY5-ahx_7sM4Qh5IiqWLWLtQeo"
  }
}
```

**Got:** The `find-worksheet` schema. It required `spreadsheetId` and `title`, and returned
worksheet titles and IDs. It also indicated that `spreadsheetId` was a dropdown property
whose options could be resolved.

## 8. Load the dropdown-resolution schema

**Tool:** `GetMcpTools`

**Reason:** Learn how to resolve valid worksheet IDs for dropdown-backed action properties.

**Sent:**

```json
{
  "server": "user-activepieces",
  "toolName": "ap_resolve_property_options"
}
```

**Got:** A schema requiring the piece, action, property name, and action type, with optional
authentication, parent inputs, and a search value.

## 9. Inspect the Add Row action

**Tool:** `CallMcpTool` → `user-activepieces/ap_get_piece_props`

**Reason:** Determine the exact fields required by `insert_row`.

**Sent:**

```json
{
  "pieceName": "@activepieces/piece-google-sheets",
  "actionOrTriggerName": "insert_row",
  "type": "action",
  "auth": "AH7tf0uR9knUsz7jIiE27",
  "input": {
    "spreadsheet_id": "1bR2qGRMfSTnb0Di-ENY5-ahx_7sM4Qh5IiqWLWLtQeo"
  }
}
```

**Got:** The base `insert_row` schema with these properties:

- `spreadsheetId`
- `sheetId`
- `first_row_headers`
- `as_string`
- `values`

The supplied known-input key used `spreadsheet_id`, but the action expected `spreadsheetId`.
As a result, this call returned the base schema without resolving the dependent worksheet or
column fields. No write occurred.

## 10. Resolve worksheets in Financial reports

**Tool:** `CallMcpTool` → `user-activepieces/ap_resolve_property_options`

**Reason:** List valid worksheet IDs using the correct `spreadsheetId` parent property.

**Sent:**

```json
{
  "pieceName": "@activepieces/piece-google-sheets",
  "actionOrTriggerName": "insert_row",
  "type": "action",
  "propertyName": "sheetId",
  "auth": "AH7tf0uR9knUsz7jIiE27",
  "input": {
    "spreadsheetId": "1bR2qGRMfSTnb0Di-ENY5-ahx_7sM4Qh5IiqWLWLtQeo"
  }
}
```

**Got:**

```json
[
  {
    "label": "Sheet1",
    "value": 0
  },
  {
    "label": "Fixtures/Orders",
    "value": 1603099698
  }
]
```

## 11. Resolve each worksheet's column headers

These two `CallMcpTool` calls ran in parallel.

### 11a. Inspect Sheet1

**Tool:** `CallMcpTool` → `user-activepieces/ap_get_piece_props`

**Reason:** Verify whether `Sheet1` contained the requested Month and Amount columns.

**Sent:**

```json
{
  "pieceName": "@activepieces/piece-google-sheets",
  "actionOrTriggerName": "insert_row",
  "type": "action",
  "auth": "AH7tf0uR9knUsz7jIiE27",
  "input": {
    "spreadsheetId": "1bR2qGRMfSTnb0Di-ENY5-ahx_7sM4Qh5IiqWLWLtQeo",
    "sheetId": 0,
    "first_row_headers": true
  }
}
```

**Got:** Dynamic value fields:

```json
[
  {
    "name": "A",
    "displayName": "Month"
  },
  {
    "name": "B",
    "displayName": "Amount $"
  }
]
```

### 11b. Inspect Fixtures/Orders

**Tool:** `CallMcpTool` → `user-activepieces/ap_get_piece_props`

**Reason:** Compare the other worksheet's headers and avoid writing financial data to the
wrong tab.

**Sent:**

```json
{
  "pieceName": "@activepieces/piece-google-sheets",
  "actionOrTriggerName": "insert_row",
  "type": "action",
  "auth": "AH7tf0uR9knUsz7jIiE27",
  "input": {
    "spreadsheetId": "1bR2qGRMfSTnb0Di-ENY5-ahx_7sM4Qh5IiqWLWLtQeo",
    "sheetId": 1603099698,
    "first_row_headers": true
  }
}
```

**Got:** Dynamic value fields:

```json
[
  {
    "name": "A",
    "displayName": "Order"
  },
  {
    "name": "B",
    "displayName": "Status"
  }
]
```

This confirmed that `Sheet1` was the intended worksheet.

## 12. Append the row to Sheet1

**Tool:** `CallMcpTool` → `user-activepieces/ap_run_action`

**Reason:** Perform the requested write using the resolved spreadsheet ID, worksheet ID, and
column mapping.

**Sent:**

```json
{
  "pieceName": "@activepieces/piece-google-sheets",
  "actionName": "insert_row",
  "connectionExternalId": "AH7tf0uR9knUsz7jIiE27",
  "input": {
    "spreadsheetId": "1bR2qGRMfSTnb0Di-ENY5-ahx_7sM4Qh5IiqWLWLtQeo",
    "sheetId": 0,
    "first_row_headers": true,
    "as_string": false,
    "values": {
      "A": "01/01/2027",
      "B": 5000
    }
  }
}
```

**Got:**

```json
{
  "spreadsheetId": "1bR2qGRMfSTnb0Di-ENY5-ahx_7sM4Qh5IiqWLWLtQeo",
  "tableRange": "Sheet1!A1:B13",
  "updates": {
    "updatedRange": "Sheet1!A14:B14",
    "updatedRows": 1,
    "updatedColumns": 2,
    "updatedCells": 2
  },
  "row": 14
}
```

The Activepieces run ID was `QVfIpVYrrDAR1YVbPvAh8`.

## Result

One row was appended to `Financial reports` → `Sheet1`, at row 14:

```text
Month:  01/01/2027
Amount: 5000
```
