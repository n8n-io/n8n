---
name: googlesheets
hosts: sheets.googleapis.com
path_prefixes: /v4/spreadsheets
passthrough_hosts: oauth2.googleapis.com
read_paths:
---
Service: Google Sheets API v4 (sheets.googleapis.com/v4/spreadsheets).

Calls are HTTP requests. The tool name tells the kind: "read_get_spreadsheets_values" (GET a range), "write_post_spreadsheets_values:append", and so on. The args are {path, query, body}. Every POST and PUT is a write: the Sheets node has no POST that only reads. Code decides this, not you.
Not covered here: deleting a spreadsheet. The node does it with DELETE www.googleapis.com/drive/v3/files/<id>, which belongs to the Google Drive vendor. Without that vendor the guard refuses the call with 403.

Real result shapes:
- A values read ({range, majorDimension, values}) holds only the cells of the range, without the empty cells at the end. Code adds two fields: "sheetTitle" (the tab) and "grid" (the rows padded so that they start at cell A1). Always use "grid", never "values", to seed rows.
- A spreadsheet read holds "spreadsheetId", "properties.title" and "sheets[].properties" ({sheetId, title, index}).
- A batchGet answer holds "valueRanges[]", each with "sheetTitle" and "grid".
You may be given reads. "$reads[0]" is always the spreadsheet (id, title, tabs). The next reads are the whole tab that a write names, each with "sheetTitle" and "grid".

World format, under "native.google_sheets":
- spreadsheets[]: {ref, id, title, sheets: [{title, rows}]}. "rows" is a list of rows, each a list of cells, from cell A1. A cell that starts with "=" is a formula.
Seed the spreadsheet with its real id, so that the agent can use it in later calls: "id": "$reads[0].spreadsheetId" (or take it from the call path when you have no read). Never invent an id. Never write "owner" or "shared_with": code places the spreadsheet in the one account that the call can read.
Seed every tab with its title ("$reads[0].sheets[0].properties.title"). Give rows ("rows": "$result.grid", or "$reads[1].grid") only to the tabs that you have a grid for. Leave the other tabs without rows.
For a read of a range: seed the spreadsheet with the title, the tab of "$result.sheetTitle", and rows "$result.grid".

Writes: a create ({properties: {title}}) needs no seed. An append, an update, a clear or a batch update names a spreadsheet in its path. Seed that spreadsheet and the rows of the tab that the call names, as above, so that the gym can find the place of the change. Do not apply the change yourself.
