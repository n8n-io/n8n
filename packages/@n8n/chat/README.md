# n8n Chat

This is a chatbot for n8n. It allows to execute AI Workflows via chat.

## Pre-requisites
Create a n8n workflow which you want to execute via chat. The workflow has to be triggered using a **Webhook** node and return data using the **Respond to Webhook** node.

[See example workflow](/resources/workflow.json)

## Installation

### Embed HTML
```html
<script type="module">
	import { createChat } from '@n8n/chat';

	createChat({
		webhookUrl: ''
	});
</script>
```

## How it works
Each Chat request is sent to the n8n Webhook endpoint, which then sends back a response.

Each request is accompanied by an `action` query parameter, where `action` can be one of:
- `loadPreviousSession` - When the user opens the Chatbot again and the previous chat session should be loaded
- `sendMessage` - When the user sends a message


