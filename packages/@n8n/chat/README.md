# n8n Chat
This is an embeddable Chat widget for n8n. It allows the execution of AI-Powered Workflows through a Chat window.

## Pre-requisites
Create a n8n workflow which you want to execute via chat. The workflow has to be triggered using a **Webhook** node and return data using the **Respond to Webhook** node.

[See example workflow](/resources/workflow.json)

## Installation

### Embed HTML
```html
<script type="module">
	import { createChat } from '@n8n/chat';

	createChat({
		webhookUrl: 'http://localhost:5678/webhook/513107b3-6f3a-4a1e-af21-659f0ed14183'
	});
</script>
```

## Options




## How it works
Each Chat request is sent to the n8n Webhook endpoint, which then sends back a response.

Each request is accompanied by an `action` query parameter, where `action` can be one of:
- `loadPreviousSession` - When the user opens the Chatbot again and the previous chat session should be loaded
- `sendMessage` - When the user sends a message


## Caveats

### Fullscreen mode
In fullscreen mode, the Chat window will take up the entire width and height of its target container. Make sure that the container has a set width and height.

```css
html,
body,
#n8n-chat {
	width: 100%;
	height: 100%;
}
```
