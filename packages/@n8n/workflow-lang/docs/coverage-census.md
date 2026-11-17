# Coverage census: workflows that run with no fallback-host node

Date: 17 November 2026. Counts only: no workflow content.

A workflow is "fully compiled" when the converter gives no node to the fallback host: each node is
native, a library node, or compiled from its source and in the verified list.

## Method

- Input: the export of 147,671 workflows. 77,424 of them are the "fully covered" set.
- The census converts each workflow with the node compiler on, then compiles the result.
- This run is a sample, not the whole set: the fully covered workflows whose row number modulo 64
  is 0 to 3 (4876 workflows). The census is resumable.
- The rows have no credential data. Each credential has the default value of each field, a
  placeholder in each empty text field and an OAuth2 token: the fake credential of the verifier.
  A real credential can have other classes, so the real share of verified nodes can be lower.
- The verified list of this run: the committed list, with the entries of the widened verifier for
  26 node types. Slack and HubSpot have the committed entries: their check did not end in the time
  limit on the busy machine.
- The converter takes a collection only for members that have their own entry, and another
  authentication only for conditions that were checked under it.
- A fix is one concrete change. A workflow counts for a fix in the last column only when that fix
  is the only one it needs.

## Headline: share of the fully covered set that compiles fully

| Run | Workflows in the sample | Fully compiled |
|---|---|---|
| 12 November (whole set, node compiler off) | 77,424 | 22.9% |
| 17 November, first sample (committed list, old converter rules) | 4,876 | 31.7% |
| 17 November, this run | 4876 | 1719 (35.3%) |


| Measure | Count | Share |
|---|---|---|
| Fully compiled (no fallback-host node) | 1719 | 35.3% |
| With a fallback-host node | 3157 | 64.7% |
| Nodes in converted workflows | 59829 | |
| Nodes in the fallback host | 9054 | 15.1% |

## Workflows with a fallback-host node: fixes that they still need

| Fixes needed | Workflows |
|---|---|
| 1 | 1261 |
| 2 | 749 |
| 3 | 395 |
| 4 | 252 |
| 5 | 157 |
| 6 or more | 343 |

## Fallback-host nodes by reason class

| Reason class | Nodes | Workflows |
|---|---|---|
| node source does not compile | 4126 | 1733 |
| converter keeps the node in the host | 1605 | 860 |
| Code node that the translator does not take | 1219 | 848 |
| no node source (not a nodes-base node) | 951 | 686 |
| compiles, not verified against v1 | 886 | 472 |
| compiled, kept in the host by a runtime condition | 267 | 137 |

## Fallback-host nodes by node type (top 40)

| Node type | Nodes | Workflows |
|---|---|---|
| code | 1216 | 846 |
| postgres | 1080 | 381 |
| gmail | 462 | 287 |
| lc.agent | 345 | 283 |
| googleSheets | 388 | 223 |
| httpRequest | 348 | 208 |
| set | 265 | 192 |
| lc.openAi | 217 | 161 |
| googleDrive | 233 | 159 |
| if | 201 | 146 |
| extractFromFile | 191 | 134 |
| notion | 211 | 129 |
| airtable | 282 | 128 |
| googleBigQuery | 249 | 123 |
| emailSend | 206 | 121 |
| lc.chainLlm | 135 | 101 |
| microsoftOutlook | 195 | 96 |
| hubspot | 183 | 83 |
| slack | 130 | 81 |
| lc.anthropic | 108 | 77 |
| convertToFile | 81 | 67 |
| googleCalendar | 103 | 66 |
| mySql | 140 | 60 |
| telegram | 92 | 54 |
| filter | 67 | 49 |
| dataTable | 81 | 45 |
| lc.googleGemini | 53 | 44 |
| supabase | 73 | 44 |
| microsoftSql | 85 | 42 |
| dateTime | 84 | 40 |
| ftp | 101 | 40 |
| clickUp | 67 | 37 |
| snowflake | 65 | 37 |
| facebookGraphApi | 65 | 31 |
| pipedrive | 142 | 30 |
| executionData | 33 | 29 |
| jira | 56 | 28 |
| switch | 40 | 25 |
| microsoftExcel | 58 | 22 |
| sendGrid | 30 | 21 |

## The fix list (top 80), ranked by workflows that the fix alone makes fully compiled

| Fix | Fallback nodes | Workflows that need it | Workflows where it is the last fix |
|---|---|---|---|
| compile postgres: database_executeQuery_execute: 'this.evaluateExpression' has no compiled form | 949 | 344 | 176 |
| node source: lc.agent | 345 | 283 | 112 |
| compile emailSend: configureTransport: 'createTransport' comes from the package 'nodemailer', which has no compiled form | 204 | 120 | 50 |
| node source: lc.openAi | 217 | 161 | 42 |
| compile googleBigQuery: record_executeQuery_execute: 'this.evaluateExpression' has no compiled form | 183 | 97 | 39 |
| compile gmail: parseRawEmail: 'simpleParser' comes from the package 'mailparser', which has no compiled form | 203 | 155 | 33 |
| node source: lc.chainLlm | 135 | 101 | 29 |
| node source: lc.anthropic | 108 | 77 | 25 |
| compile mySql: database_executeQuery_execute: 'this.evaluateExpression' has no compiled form | 118 | 56 | 25 |
| compile notion: extractDatabaseMentionRLC: 'safeRegex' comes from the package 'n8n-workflow', which has no compiled form | 100 | 77 | 22 |
| converter httpRequest: host-expression: The runtime cannot apply the credential type "…"; the node runs in the fallback host | 113 | 48 | 18 |
| compile postgres: configurePostgres: the credential 'credentials' is used as a whole value: only its fields can go into a request | 131 | 69 | 17 |
| compile snowflake: execute: 'this.evaluateExpression' has no compiled form | 61 | 35 | 17 |
| compile microsoftSql: execute: 'this.evaluateExpression' has no compiled form | 84 | 42 | 16 |
| Code translator: catch reads the error | 118 | 90 | 14 |
| compile googleSheets: GoogleSheet_getColumnWithOffset: 'xlsxUtils' comes from the package '@e965/xlsx', which has no compiled form | 48 | 36 | 14 |
| verify facebookGraphApi .: graphApiVersion | 65 | 31 | 14 |
| compile gmail: encodeEmail: 'MailComposer' comes from the package 'nodemailer/lib/mail-composer', which has no compiled form | 141 | 87 | 13 |
| compile notion: getPropertyKeyValue: a date format that is not a text literal has no compiled form | 54 | 41 | 13 |
| compile googleSheets: code: label: Labels have no native form. | 52 | 34 | 12 |
| runtime pipedrive: The node asks for the bytes of a response, and the runtime of the caller does not store a response as binary data. | 106 | 28 | 12 |
| node source: lc.googleGemini | 53 | 44 | 11 |
| compile airtable: record_get_execute: the parameter 'id' has an expression, and the compiler cannot prove that the item index of 'this.getNodeParameter' is the index of an input  | 65 | 38 | 11 |
| converter googleSheets: host-expression: The runtime cannot apply the credential type "…"; the node runs in the fallback host | 96 | 39 | 10 |
| verify notion databasePage.getAll: (operation) | 25 | 23 | 10 |
| compile sendGrid: code: file bytes have a compiled form only as a file of a multipart request and with `length`: 'dataBuffer' | 30 | 21 | 10 |
| compile extractFromFile: execute: the name 'spreadsheet' has no declaration that the compiler can read | 191 | 134 | 9 |
| converter set: an expression does not translate (regular expression) | 101 | 74 | 9 |
| compile airtable: record_update_execute: the parameter 'columns.value' has an expression, and the compiler cannot prove that the item index of 'this.getNodeParameter' is the inde | 60 | 37 | 9 |
| compile gmail: replyToEmail: 'addressparser' comes from the package 'nodemailer/lib/addressparser', which has no compiled form | 35 | 18 | 9 |
| compile googleCalendar: code: instanceof: `instanceof` has no native form. | 23 | 18 | 9 |
| runtime googleBigQuery: The credential of the node gives its conditions values that are not checked against the v1 node. | 27 | 15 | 9 |
| Code translator: Date: other | 77 | 59 | 8 |
| verify clickUp: another authentication or credential class | 40 | 28 | 8 |
| Code translator: converter code-node-reference | 38 | 28 | 8 |
| converter googleSheets: an expression does not translate (Luxon value) | 47 | 26 | 8 |
| converter httpRequest: an expression does not translate (regular expression) | 60 | 44 | 7 |
| converter if: fallback-degrade: The boolean operation "…" is not supported | 21 | 16 | 7 |
| compile zendesk: zendeskApiRequest: the code compares or branches on a credential field: node code cannot read a credential value | 30 | 16 | 7 |
| converter supabase: an expression does not translate (Luxon value) | 27 | 16 | 7 |
| verify googleSheets sheet.delete: @each=startIndex | 14 | 13 | 7 |
| compile dateTime: code: instanceof: `instanceof` has no native form. | 69 | 33 | 6 |
| verify googleSheets sheet.clear: range | 23 | 19 | 6 |
| compile whatsApp: … no class with an execute method | 38 | 19 | 6 |
| compile airtable: record_deleteRecord_execute: the parameter 'id' has an expression, and the compiler cannot prove that the item index of 'this.getNodeParameter' is the index of  | 27 | 18 | 6 |
| node source: lc.textClassifier | 30 | 17 | 6 |
| compile sendInBlue: … no class with an execute method | 21 | 12 | 6 |
| compile discord: router: a call with the n8n context has a target that is not known at compile time | 8 | 8 | 6 |
| compile googleDrive: file_upload_execute: 'FormData' comes from the package 'form-data', which has no compiled form | 64 | 56 | 5 |
| converter googleCalendar: an expression does not translate (Luxon value) | 28 | 21 | 5 |
| converter if: an expression does not translate (Luxon value) | 25 | 17 | 5 |
| converter removeDuplicates: fallback-degrade: Removing items seen in earlier executions needs state that the workflow language does not have | 16 | 15 | 5 |
| compile microsoftSharePoint: … no class with an execute method | 26 | 15 | 5 |
| converter httpRequest: an expression does not translate (.toString()) | 15 | 14 | 5 |
| compile salesforce: TS2339: Property 'onError' does not exist on type '{ name: string | 19 | 11 | 5 |
| compile airtable: coerceArrayTypeFields: 'isResourceMapperValue' comes from the package 'n8n-workflow', which has no compiled form | 52 | 35 | 4 |
| compile microsoftOutlook: microsoftApiRequest: the code compares or branches on a credential field: node code cannot read a credential value | 43 | 32 | 4 |
| compile executionData: execute: 'this.customData' has no compiled form | 33 | 29 | 4 |
| converter googleSheets: an expression does not translate (Date: locale options) | 32 | 22 | 4 |
| converter set: an expression does not translate (Luxon value) | 22 | 17 | 4 |
| compile rssFeedRead: execute: 'this.helpers' has no compiled form | 79 | 16 | 4 |
| compile airtable: record_upsert_execute: the parameter 'columns.value' has an expression, and the compiler cannot prove that the item index of 'this.getNodeParameter' is the inde | 29 | 16 | 4 |
| compile googleCalendar: addNextOccurrence: a moment that is not the start of a call that gives text or a number has no compiled form | 23 | 15 | 4 |
| node source: lc.vectorStoreSupabase | 24 | 14 | 4 |
| compile slack: getMessageContent: 'this.getWorkflow' has no compiled form | 21 | 13 | 4 |
| verify hubspot: another authentication or credential class | 174 | 80 | 3 |
| compile ftp: execute: 'sftpClient' comes from the package 'ssh2-sftp-client', which has no compiled form | 45 | 22 | 3 |
| node source: lc.informationExtractor | 26 | 21 | 3 |
| compile dataTable: router: a call with the n8n context has a target that is not known at compile time | 33 | 18 | 3 |
| converter set: an expression does not translate (.toString()) | 21 | 17 | 3 |
| compile dataTable: getDataTableProxyExecute: 'this.helpers.getDataTableProxy' has no compiled form | 21 | 16 | 3 |
| compile googleDrive: file_createFromText_execute: 'FormData' comes from the package 'form-data', which has no compiled form | 21 | 16 | 3 |
| Code translator: .setHours() | 11 | 11 | 3 |
| converter set: an expression does not translate (Luxon DateTime) | 14 | 10 | 3 |
| converter httpRequest: an expression does not translate (syntax) | 11 | 10 | 3 |
| converter filter: an expression does not translate (Luxon DateTime) | 12 | 10 | 3 |
| verify clickUp task.setCustomField: (operation) | 17 | 8 | 3 |
| compile github: code: file bytes have a compiled form only as a file of a multipart request and with `length`: 'buffer' | 16 | 8 | 3 |
| converter httpRequest: fallback-degrade: A parameter name repeats | 8 | 7 | 3 |
| converter microsoftOutlook: an expression does not translate (Date: locale options) | 8 | 7 | 3 |

## Fix groups (all fixes of one kind for one node type), top 40

| Group | Fallback nodes | Workflows that need it | Workflows where it is the last group |
|---|---|---|---|
| Code translator (all features) | 1219 | 848 | 332 |
| node source: langchain nodes | 951 | 686 | 248 |
| compile: postgres | 1080 | 381 | 213 |
| converter: httpRequest | 348 | 208 | 69 |
| compile: gmail | 386 | 244 | 59 |
| compile: emailSend | 206 | 121 | 50 |
| compile: airtable | 249 | 115 | 48 |
| converter: set | 265 | 192 | 43 |
| compile: notion | 167 | 109 | 39 |
| compile: googleBigQuery | 183 | 97 | 39 |
| verify: hubspot | 174 | 80 | 37 |
| converter: googleSheets | 229 | 117 | 35 |
| compile: googleSheets | 105 | 68 | 31 |
| compile: mySql | 140 | 60 | 31 |
| converter: if | 201 | 146 | 29 |
| verify: googleSheets | 51 | 43 | 19 |
| compile: snowflake | 65 | 37 | 19 |
| compile: googleCalendar | 70 | 47 | 18 |
| verify: clickUp | 62 | 36 | 18 |
| compile: microsoftSql | 85 | 42 | 17 |
| verify: facebookGraphApi | 65 | 31 | 16 |
| verify: telegram | 57 | 35 | 15 |
| runtime pipedrive | 111 | 29 | 12 |
| converter: gmail | 63 | 45 | 10 |
| compile: dateTime | 84 | 40 | 10 |
| verify: notion | 41 | 37 | 10 |
| verify: slack | 56 | 36 | 10 |
| converter: slack | 49 | 35 | 10 |
| converter: supabase | 47 | 29 | 10 |
| compile: sendGrid | 30 | 21 | 10 |
| compile: extractFromFile | 191 | 134 | 9 |
| compile: googleDrive | 102 | 84 | 9 |
| compile: dataTable | 59 | 33 | 9 |
| runtime googleBigQuery | 27 | 15 | 9 |
| compile: discord | 16 | 15 | 9 |
| compile: microsoftOutlook | 117 | 66 | 8 |
| converter: filter | 67 | 49 | 8 |
| converter: microsoftOutlook | 26 | 20 | 8 |
| verify: supabase | 26 | 17 | 8 |
| compile: microsoftExcel | 58 | 22 | 7 |
