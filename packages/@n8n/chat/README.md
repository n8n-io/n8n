# n8n Chat
This is an embeddable Chat widget for n8n. It allows the execution of AI-Powered Workflows through a Chat window.

## Pre-requisites
Create a n8n workflow which you want to execute via chat. The workflow has to be triggered using a **Webhook** node and return data using the **Respond to Webhook** node.

[See example workflow](/resources/workflow.json)

> Make sure the workflow is **Active.**

### How it works
Each Chat request is sent to the n8n Webhook endpoint, which then sends back a response.

Each request is accompanied by an `action` query parameter, where `action` can be one of:
- `loadPreviousSession` - When the user opens the Chatbot again and the previous chat session should be loaded
- `sendMessage` - When the user sends a message

We use the `Switch` node to handle the different actions.

## Installation

### a. CDN Embed
Add the following code to your HTML page.

```html
<link href="https://cdn.jsdelivr.net/npm/@n8n/chat/style.css" type="text/css" />
<script type="module">
	import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/chat.js';

	createChat({
		webhookUrl: 'YOUR_PRODUCTION_WEBHOOK_URL'
	});
</script>
```

### b. Import Embed
Install and save n8n Chat as a production dependency.

```sh
npm install @n8n/chat
```

Import the CSS and use the `createChat` function to initialize your Chat window.

```ts
import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';

createChat({
	webhookUrl: 'YOUR_PRODUCTION_WEBHOOK_URL'
});
```

##### Vue.js

```html
<script lang="ts" setup>
// App.vue
import { onMounted } from 'vue';
import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';

onMounted(() => {
	createChat({
		webhookUrl: 'YOUR_PRODUCTION_WEBHOOK_URL'
	});
});
</script>
<template>
	<div></div>
</template>
```

##### React

```tsx
// App.tsx
import { useEffect } from 'react';
import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';

export const App = () => {
	useEffect(() => {
		createChat({
			webhookUrl: 'YOUR_PRODUCTION_WEBHOOK_URL'
		});
	}, []);

	return (<div></div>);
};
```

## Options
The default options are:

```ts
createChat({
	webhookUrl: '',
	webhookConfig: {
		method: 'GET',
		headers: {}
	},
	target: '#n8n-chat',
	mode: 'window',
	defaultLanguage: 'en',
	initialMessages: [
		'Hi there! 👋',
		'My name is Nathan. How can I assist you today?'
	],
	i18n: {
		en: {
			title: 'Hi there! 👋',
			subtitle: "Start a chat. We're here to help you 24/7.",
			footer: '',
			getStarted: 'New Conversation',
			inputPlaceholder: 'Type your question..',
		},
	},
	poweredBy: true,
});
```

### `webhookUrl`
- **Type**: `string`
- **Required**: `true`
- **Examples**:
	- `https://yourname.app.n8n.cloud/webhook/513107b3-6f3a-4a1e-af21-659f0ed14183`
	- `http://localhost:5678/webhook/513107b3-6f3a-4a1e-af21-659f0ed14183`
- **Description**: The URL of the n8n Webhook endpoint. Should be the production URL.

### `webhookConfig`
- **Type**: `{ method: string, headers: Record<string, string> }`
- **Default**: `{ method: 'GET', headers: {} }`
- **Description**: The configuration for the Webhook request.

### `target`
- **Type**: `string`
- **Default**: `'#n8n-chat'`
- **Description**: The CSS selector of the element where the Chat window should be embedded.

### `mode`
- **Type**: `'window' | 'fullscreen'`
- **Default**: `'window'`
- **Description**: The render mode of the Chat window.
  - In `window` mode, the Chat window will be embedded in the target element as a chat toggle button and a fixed size chat window.
  - In `fullscreen` mode, the Chat will take up the entire width and height of its target container.

### `defaultLanguage`
- **Type**: `string`
- **Default**: `'en'`
- **Description**: The default language of the Chat window. Currently only `en` is supported.

### `i18n`
- **Type**: `{ [key: string]: Record<string, string> }`
- **Description**: The i18n configuration for the Chat window. Currently only `en` is supported.

### `initialMessages`
- **Type**: `string[]`
- **Description**: The initial messages to be displayed in the Chat window.

### `poweredBy`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Whether to display the "Powered by n8n" footer in the Chat window.


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

## License
n8n Chat is [fair-code](http://faircode.io) distributed under the
[**Sustainable Use License**](https://github.com/n8n-io/n8n/blob/master/packages/cli/LICENSE.md).

Proprietary licenses are available for enterprise customers. [Get in touch](mailto:license@n8n.io)

Additional information about the license model can be found in the
[docs](https://docs.n8n.io/reference/license/).
