# Coverage census: workflows that run with no fallback-host node

Date: 17 November 2026. Counts only: no workflow content.

A workflow is "fully compiled" when the converter gives no node to the fallback host: each node is
native, a library node, or compiled from its source and in the verified list.

## Method

- Input: the export of 147,671 workflows (77,424 in the "fully covered" set, 70,247 not).
- The census converts each workflow with the node compiler on, then compiles the result.
- This run is a sample, not the whole export: the fully covered workflows whose row number modulo 64
  is 0 to 3 (4876 workflows), and the others whose row number modulo 64 is 0 or 1 (2134 workflows).
  The whole export did not fit in the time of the run: at the measured rate (2 to 5 workflows each
  second with 8 workers on a busy machine) it takes 8 to 20 hours.
- The rows have no credential data. Each credential has the default value of each field, a
  placeholder in each empty text field and an OAuth2 token: the fake credential of the verifier.
  A real credential can have other classes, so the real share of verified nodes can be lower.
- "Widened list": the committed verified list plus the entries that the widened verifier gives for
  21 node types (Slack is not in it). "Committed list": src/node-compile/verified.generated.ts.
- A fix is one concrete change. A workflow counts for a fix in the last column only when that fix
  is the only one it needs.

## Headline

| Set | Workflows in the sample | Fully native, 12 November (whole set, node compiler off) | Fully compiled now, committed list | Fully compiled now, widened list |
|---|---|---|---|---|
| Fully covered (77,424) | 4876 | 22.9% | 1546 (31.7%) | 1612 (33.1%) |
| Not fully covered (70,247) | 2134 | 17.1% | 504 (23.6%) | 518 (24.3%) |
| All (147,671), estimate from both samples | 7010 | 20.2% | 27.9% | 28.9% |

The tables below are for the sample of the fully covered set.

| Measure | Count | Share |
|---|---|---|
| Fully compiled (no fallback-host node), widened verified list | 1612 | 33.1% |
| Fully compiled, committed verified list | 1546 | 31.7% |
| With a fallback-host node | 3264 | 66.9% |
| Nodes in converted workflows | 59829 | |
| Nodes in the fallback host | 9663 | 16.2% |
| Nodes compiled from source (widened list / committed list) | 1025 / 594 | |

## Workflows with a fallback-host node: fixes that they still need

| Fixes needed | Workflows |
|---|---|
| 1 | 1219 |
| 2 | 727 |
| 3 | 468 |
| 4 | 294 |
| 5 | 178 |
| 6 or more | 378 |

## Fallback-host nodes by reason class

| Reason class | Nodes | Workflows |
|---|---|---|
| node source does not compile | 4175 | 1759 |
| Code node that the translator does not take | 1702 | 1073 |
| converter keeps the node in the host | 1638 | 883 |
| compiles, not verified against v1 | 1006 | 557 |
| no node source (not a nodes-base node) | 951 | 686 |
| compiled, kept in the host by a runtime condition | 191 | 87 |

## Fallback-host nodes by node type (top 40)

| Node type | Nodes | Workflows |
|---|---|---|
| code | 1699 | 1071 |
| postgres | 1080 | 381 |
| gmail | 482 | 294 |
| lc.agent | 345 | 283 |
| googleSheets | 407 | 241 |
| httpRequest | 350 | 209 |
| set | 266 | 193 |
| lc.openAi | 217 | 161 |
| googleDrive | 240 | 160 |
| if | 201 | 146 |
| extractFromFile | 191 | 134 |
| airtable | 284 | 130 |
| notion | 210 | 129 |
| googleBigQuery | 249 | 123 |
| emailSend | 206 | 121 |
| microsoftOutlook | 229 | 110 |
| lc.chainLlm | 135 | 101 |
| slack | 131 | 82 |
| lc.anthropic | 108 | 77 |
| convertToFile | 81 | 67 |
| googleCalendar | 103 | 66 |
| hubspot | 132 | 62 |
| mySql | 140 | 60 |
| telegram | 93 | 53 |
| filter | 70 | 52 |
| dataTable | 81 | 45 |
| lc.googleGemini | 53 | 44 |
| supabase | 73 | 44 |
| microsoftSql | 85 | 42 |
| dateTime | 84 | 40 |
| ftp | 101 | 40 |
| microsoftTeams | 50 | 40 |
| clickUp | 69 | 38 |
| snowflake | 65 | 37 |
| pipedrive | 154 | 35 |
| microsoftExcel | 85 | 34 |
| facebookGraphApi | 65 | 31 |
| executionData | 33 | 29 |
| switch | 41 | 26 |
| salesforce | 61 | 23 |

## The fix list (top 80), ranked by workflows that the fix alone makes fully compiled

| Fix | Fallback nodes | Workflows that need it | Workflows where it is the last fix |
|---|---|---|---|
| compile postgres: database_executeQuery_execute: 'this.evaluateExpression' has no compiled form | 949 | 344 | 170 |
| node source: lc.agent | 345 | 283 | 107 |
| compile emailSend: configureTransport: 'createTransport' comes from the package 'nodemailer', which has no compiled form | 204 | 120 | 45 |
| compile googleBigQuery: record_executeQuery_execute: 'this.getExecutionCancelSignal' has no compiled form | 185 | 98 | 38 |
| node source: lc.openAi | 217 | 161 | 37 |
| compile gmail: parseRawEmail: 'simpleParser' comes from the package 'mailparser', which has no compiled form | 203 | 155 | 27 |
| node source: lc.chainLlm | 135 | 101 | 27 |
| node source: lc.anthropic | 108 | 77 | 23 |
| compile mySql: database_executeQuery_execute: 'this.evaluateExpression' has no compiled form | 118 | 56 | 23 |
| compile notion: extractDatabaseMentionRLC: 'safeRegex' comes from the package 'n8n-workflow', which has no compiled form | 100 | 77 | 22 |
| compile postgres: configurePostgres: the credential 'credentials' is used as a whole value: only its fields can go into a request | 131 | 69 | 18 |
| converter httpRequest: host-expression: The runtime cannot apply the credential type "…"; the node runs in the fallback host | 113 | 48 | 17 |
| compile snowflake: execute: 'this.evaluateExpression' has no compiled form | 61 | 35 | 17 |
| Code translator: Date: other | 142 | 107 | 16 |
| compile microsoftTeams: router: the name 'getTeamsCredentialType' has no declaration that the compiler can read | 49 | 39 | 16 |
| compile microsoftSql: execute: 'this.evaluateExpression' has no compiled form | 84 | 42 | 15 |
| compile notion: getPropertyKeyValue: a date format that is not a text literal has no compiled form | 54 | 41 | 13 |
| compile googleSheets: GoogleSheet_getColumnWithOffset: 'xlsxUtils' comes from the package '@e965/xlsx', which has no compiled form | 48 | 36 | 12 |
| compile googleSheets: code: label: Labels have no native form. | 52 | 34 | 12 |
| converter googleSheets: host-expression: The runtime cannot apply the credential type "…"; the node runs in the fallback host | 96 | 39 | 11 |
| compile airtable: record_get_execute: the parameter 'id' has an expression, and the compiler cannot prove that the item index of 'this.getNodeParameter' is the index of an input  | 65 | 38 | 11 |
| verify telegram message.sendMessage: @each=inlineKeyboard.rows | 25 | 17 | 11 |
| node source: lc.googleGemini | 53 | 44 | 10 |
| verify notion databasePage.getAll: (operation not in the list) | 25 | 23 | 10 |
| compile sendGrid: code: file bytes have a compiled form only as a file of a multipart request and with `length`: 'dataBuffer' | 30 | 21 | 10 |
| compile gmail: encodeEmail: 'MailComposer' comes from the package 'nodemailer/lib/mail-composer', which has no compiled form | 141 | 87 | 9 |
| converter set: an expression does not translate (regular expression) | 100 | 73 | 9 |
| compile airtable: record_update_execute: the parameter 'columns.value' has an expression, and the compiler cannot prove that the item index of 'this.getNodeParameter' is the inde | 60 | 37 | 9 |
| compile googleCalendar: code: instanceof: `instanceof` has no native form. | 23 | 18 | 9 |
| compile dateTime: code: instanceof: `instanceof` has no native form. | 69 | 33 | 8 |
| converter googleSheets: an expression does not translate (Luxon value) | 47 | 26 | 8 |
| compile gmail: replyToEmail: 'addressparser' comes from the package 'nodemailer/lib/addressparser', which has no compiled form | 35 | 18 | 8 |
| compile extractFromFile: execute: the name 'spreadsheet' has no declaration that the compiler can read | 191 | 134 | 7 |
| converter httpRequest: an expression does not translate (regular expression) | 60 | 44 | 7 |
| runtime pipedrive: The node asks for the bytes of a response, and the runtime of the caller does not store a response as binary data. | 79 | 22 | 7 |
| converter supabase: an expression does not translate (Luxon value) | 27 | 16 | 7 |
| verify googleSheets sheet.delete: @each=startIndex | 14 | 13 | 7 |
| compile sendInBlue: … no class with an execute method | 21 | 12 | 7 |
| verify clickUp: another authentication or credential class | 40 | 28 | 6 |
| Code translator: converter code-node-reference | 33 | 25 | 6 |
| converter googleSheets: an expression does not translate (Date: other) | 23 | 23 | 6 |
| verify googleSheets sheet.clear: range | 23 | 19 | 6 |
| compile airtable: record_deleteRecord_execute: the parameter 'id' has an expression, and the compiler cannot prove that the item index of 'this.getNodeParameter' is the index of  | 27 | 18 | 6 |
| node source: lc.textClassifier | 30 | 17 | 6 |
| compile zendesk: zendeskApiRequest: the code compares or branches on a credential field: node code cannot read a credential value | 30 | 16 | 6 |
| compile discord: router: a call with the n8n context has a target that is not known at compile time | 8 | 8 | 6 |
| Code translator: binary data | 251 | 163 | 5 |
| compile whatsApp: … no class with an execute method | 38 | 19 | 5 |
| converter if: an expression does not translate (Luxon value) | 25 | 17 | 5 |
| converter removeDuplicates: fallback-degrade: Removing items seen in earlier executions needs state that the workflow language does not have | 16 | 15 | 5 |
| compile microsoftSharePoint: … no class with an execute method | 26 | 15 | 5 |
| converter httpRequest: an expression does not translate (.toString()) | 15 | 14 | 5 |
| compile airtable: coerceArrayTypeFields: 'isResourceMapperValue' comes from the package 'n8n-workflow', which has no compiled form | 52 | 35 | 4 |
| compile executionData: execute: 'this.customData' has no compiled form | 33 | 29 | 4 |
| converter googleSheets: an expression does not translate (Date: locale options) | 32 | 22 | 4 |
| converter set: an expression does not translate (Luxon value) | 22 | 17 | 4 |
| compile rssFeedRead: execute: 'this.helpers' has no compiled form | 79 | 16 | 4 |
| compile airtable: record_upsert_execute: the parameter 'columns.value' has an expression, and the compiler cannot prove that the item index of 'this.getNodeParameter' is the inde | 29 | 16 | 4 |
| converter if: fallback-degrade: The boolean operation "…" is not supported | 21 | 16 | 4 |
| node source: lc.vectorStoreSupabase | 24 | 14 | 4 |
| compile slack: getMessageContent: 'this.getWorkflow' has no compiled form | 21 | 13 | 4 |
| compile salesforce: TS2339: Property 'onError' does not exist on type '{ name: string | 19 | 11 | 4 |
| Code translator: catch reads the error | 173 | 119 | 3 |
| compile microsoftOutlook: microsoftApiRequest: the code compares or branches on a credential field: node code cannot read a credential value | 43 | 32 | 3 |
| compile ftp: execute: 'sftpClient' comes from the package 'ssh2-sftp-client', which has no compiled form | 45 | 22 | 3 |
| converter googleCalendar: an expression does not translate (Luxon value) | 28 | 21 | 3 |
| node source: lc.informationExtractor | 26 | 21 | 3 |
| compile dataTable: router: a call with the n8n context has a target that is not known at compile time | 33 | 18 | 3 |
| converter set: an expression does not translate (.toString()) | 21 | 17 | 3 |
| compile dataTable: getDataTableProxyExecute: 'this.helpers.getDataTableProxy' has no compiled form | 21 | 16 | 3 |
| compile googleDrive: file_createFromText_execute: 'FormData' comes from the package 'form-data', which has no compiled form | 21 | 16 | 3 |
| compile googleCalendar: addNextOccurrence: a moment that is not the start of a call that gives text or a number has no compiled form | 23 | 15 | 3 |
| Code translator: .setHours() | 11 | 11 | 3 |
| converter set: an expression does not translate (Luxon DateTime) | 14 | 10 | 3 |
| converter httpRequest: an expression does not translate (syntax) | 11 | 10 | 3 |
| converter filter: an expression does not translate (Luxon DateTime) | 12 | 10 | 3 |
| runtime googleBigQuery: The credential of the node gives its conditions values that are not checked against the v1 node. | 18 | 9 | 3 |
| verify clickUp task.setCustomField: (operation not in the list) | 17 | 8 | 3 |
| compile github: code: file bytes have a compiled form only as a file of a multipart request and with `length`: 'buffer' | 16 | 8 | 3 |
| converter httpRequest: fallback-degrade: A parameter name repeats | 8 | 7 | 3 |

## Fix groups (all fixes of one kind for one node type), top 40

| Group | Fallback nodes | Workflows that need it | Workflows where it is the last group |
|---|---|---|---|
| Code translator (all features) | 1702 | 1073 | 397 |
| node source: langchain nodes | 951 | 686 | 233 |
| compile: postgres | 1080 | 381 | 208 |
| converter: httpRequest | 350 | 209 | 67 |
| compile: airtable | 249 | 115 | 48 |
| compile: gmail | 386 | 244 | 47 |
| compile: emailSend | 206 | 121 | 45 |
| converter: set | 266 | 193 | 43 |
| converter: googleSheets | 248 | 136 | 42 |
| compile: notion | 167 | 109 | 38 |
| compile: googleBigQuery | 185 | 98 | 38 |
| compile: googleSheets | 105 | 68 | 29 |
| compile: mySql | 140 | 60 | 28 |
| converter: if | 201 | 146 | 26 |
| verify: hubspot | 108 | 57 | 25 |
| verify: googleSheets | 51 | 43 | 19 |
| compile: snowflake | 65 | 37 | 19 |
| verify: clickUp | 64 | 37 | 18 |
| compile: googleCalendar | 70 | 47 | 17 |
| compile: microsoftTeams | 50 | 40 | 17 |
| compile: microsoftSql | 85 | 42 | 15 |
| verify: telegram | 56 | 32 | 13 |
| verify: facebookGraphApi | 65 | 31 | 13 |
| compile: dateTime | 84 | 40 | 12 |
| converter: slack | 51 | 37 | 10 |
| verify: notion | 40 | 36 | 10 |
| converter: supabase | 47 | 29 | 10 |
| verify: googleBigQuery | 46 | 26 | 10 |
| compile: sendGrid | 30 | 21 | 10 |
| converter: gmail | 63 | 45 | 9 |
| verify: slack | 55 | 35 | 9 |
| compile: dataTable | 59 | 33 | 9 |
| compile: discord | 16 | 15 | 9 |
| converter: microsoftOutlook | 26 | 20 | 8 |
| verify: supabase | 26 | 17 | 8 |
| compile: extractFromFile | 191 | 134 | 7 |
| compile: microsoftOutlook | 117 | 66 | 7 |
| converter: filter | 70 | 52 | 7 |
| runtime pipedrive | 86 | 23 | 7 |
| converter: telegram | 26 | 17 | 7 |

## Not fully covered set: fix groups

| Group | Fallback nodes | Workflows that need it | Workflows where it is the last group |
|---|---|---|---|
| Code translator (all features) | 1341 | 610 | 161 |
| node source: langchain nodes | 730 | 390 | 85 |
| compile: postgres | 463 | 171 | 76 |
| converter: httpRequest | 696 | 393 | 60 |
| compile: emailSend | 103 | 68 | 20 |
| converter: set | 236 | 142 | 19 |
| compile: airtable | 133 | 57 | 19 |
| node source: other packages | 182 | 75 | 17 |
| converter: googleSheets | 137 | 65 | 14 |
| compile: googleBigQuery | 74 | 39 | 13 |
| compile: mySql | 118 | 30 | 10 |
| compile: n8n | 33 | 23 | 10 |
| compile: googleSheets | 38 | 28 | 9 |
| verify: hubspot | 61 | 23 | 8 |
| compile: notion | 67 | 34 | 7 |
| converter: if | 133 | 72 | 6 |
| compile: microsoftSql | 36 | 15 | 5 |
| compile: dataTable | 33 | 24 | 4 |
| converter: slack | 22 | 20 | 4 |
| runtime googleBigQuery | 26 | 12 | 4 |
| compile: metabase | 20 | 12 | 4 |
| compile: graphql | 19 | 7 | 4 |
