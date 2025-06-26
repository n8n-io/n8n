# ChatTrigger Local Development

This guide explains how to set up local development for the ChatTrigger node when working with the chat bundle.

## Prerequisites

Since the chat bundle is loaded via `<script type="module">`, it needs to be served over HTTPS for local development.

## Setup Instructions

### 1. Install HTTP Server

Install the http-server globally:

```bash
npm install -g http-server
```

### 2. Generate SSL Certificate

Generate a self-signed certificate for HTTPS:

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### 3. Build the Chat Bundle

Navigate to the chat package and build it:

```bash
cd packages/frontend/@n8n/chat && pnpm run build 
```

### 4. Start HTTPS Server

Run the HTTPS server to serve the chat bundle:

```bash
http-server packages/frontend/@n8n/chat/dist -g -S -C cert.pem -K key.pem --port 8443 --cors
```

### 5. Update Import Paths

Modify the import paths in `templates.ts` to point to your local server:

```html
<script type="module">
    import { createChat } from 'https://127.0.0.1:8443/chat.bundle.es.js';
```

```html
<link href="https://127.0.0.1:8443/style.css" rel="stylesheet" />
```
