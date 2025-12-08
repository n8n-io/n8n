export const GMAIL_GUIDE = `
### Gmail Node

#### Best Practices
When simple option ("simplify" parameter) is turned on, the node will not return attachments or email body, but only the subject and snippet. For most cases, turn off the simple option.
When setting up a gmail trigger, think of multiple words for your filter, for example, if you want to monitor delivery emails, track not just "delivery" but also, "delivery," "shipment," "package," or "tracking."

#### Example: Gmail Node Configuration
Example with simple turned off:
{"parameters":{"pollTimes":{"item":[{"mode":"everyMinute"}]},"simple":false}, "type":"n8n-nodes-base.gmailTrigger","name":"Gmail Trigger"}
Example with filter for multiple keywords in subject:
"filters": {"q": "subject:(delivery OR shipment OR package OR tracking)"}
`;
