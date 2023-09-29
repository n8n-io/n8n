# n8n Chat

This is a chatbot for n8n. It allows to execute AI Workflows via chat.

## Pre-requisites
Create a n8n workflow which you want to execute via chat. The workflow has to be accessible via Webhook.


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
Each Chatbot request is sent to the n8n webhook. The response is then sent back to the Chatbot. The request is accompanied by an `action` query parameter.

`action` can be one of:
- `loadPreviousSession`: When the user opens the Chatbot again and the previous chat session should be loaded
- `sendMessage`: When the user sends a message
