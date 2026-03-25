//#region src/tools/gmail/descriptions.ts
const CREATE_DRAFT_DESCRIPTION = `A tool for creating draft emails in Gmail.

INPUT example:
{
  "message": "Hello, this is a test draft",
  "to": ["example1@email.com", "example2@email.com"],
  "subject": "Test Draft",
  "cc": ["cc1@email.com"],
  "bcc": ["bcc1@email.com"]
}

OUTPUT:
The output is a confirmation message with the draft ID.
`;
const GET_MESSAGE_DESCRIPTION = `A tool for retrieving a specific email message from Gmail using its message ID.

INPUT example:
{
  "messageId": "unique_message_id_string"
}

OUTPUT:
The output includes detailed information about the retrieved email message. This includes the subject, body, sender (from), recipients (to), date of the email, and the message ID. If any of these details are not available in the email, the tool will throw an error indicating the missing information.

Example Output:
"Result for the prompt unique_message_id_string
{
  'subject': 'Email Subject',
  'body': 'Email Body Content',
  'from': 'sender@email.com',
  'to': 'recipient@email.com',
  'date': 'Email Date',
  'messageId': 'unique_message_id_string'
}"
`;
const GET_THREAD_DESCRIPTION = `A tool for retrieving an entire email thread from Gmail using the thread ID.

INPUT example:
{
  "threadId": "unique_thread_id_string"
}

OUTPUT:
The output includes an array of all the messages in the specified thread. Each message in the array contains detailed information including the subject, body, sender (from), recipients (to), date of the email, and the message ID. If any of these details are not available in a message, the tool will throw an error indicating the missing information.

Example Output:
"Result for the prompt unique_thread_id_string
[
  {
    'subject': 'Email Subject',
    'body': 'Email Body Content',
    'from': 'sender@email.com',
    'to': 'recipient@email.com',
    'date': 'Email Date',
    'messageId': 'unique_message_id_string'
  },
  ... (other messages in the thread)
]"
`;
const SEARCH_DESCRIPTION = `A tool for searching Gmail messages or threads using a specific query. Offers the flexibility to choose between messages and threads as the search resource.

INPUT:
{
  "query": "search query",
  "maxResults": 10, // Optional: number of results to return
  "resource": "messages" // Optional: can be "messages" or "threads"
}

OUTPUT:
JSON list of matching email messages or threads based on the specified resource. If no data is returned, or if the specified resource is invalid, throw error with a relevant message.

Example result for messages:
"[{
  'id': 'message_id',
  'threadId': 'thread_id',
  'snippet': 'message snippet',
  'body': 'message body',
  'subject': 'message subject',
  'sender': 'message sender'
}, 
... (other messages matching the query)
]"

Example result for threads:
"[{
  'id': 'thread_id',
  'snippet': 'thread snippet',
  'body': 'first message body',
  'subject': 'first message subject',
  'sender': 'first message sender'
},
... (other threads matching the query)
]"`;

//#endregion
export { CREATE_DRAFT_DESCRIPTION, GET_MESSAGE_DESCRIPTION, GET_THREAD_DESCRIPTION, SEARCH_DESCRIPTION };
//# sourceMappingURL=descriptions.js.map