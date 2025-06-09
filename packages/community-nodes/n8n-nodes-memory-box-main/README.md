<p align="center">
  <img src="https://storage.googleapis.com/amotivv-public/memory-box-logo.png" alt="Memory Box Logo" width="200"/>
</p>

<h1 align="center">n8n Memory Box Node</h1>

<p align="center">
  n8n community node for Memory Box API integration - store, search, and manage semantic memories
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
</p>

This is an n8n community node for integrating with the Memory Box API. It provides a seamless interface to store, search, and manage memories in Memory Box directly from n8n workflows.

Memory Box is a semantic memory storage and retrieval system powered by vector embeddings. This node allows you to store and retrieve information from Memory Box using n8n workflows.

## Features

- Store new memories in Memory Box
- Search for memories using semantic search
- Retrieve all memories
- Get memories from a specific bucket
- List all available buckets

## Installation

Follow these steps to install the node in your n8n instance:

### Community Nodes (Recommended)

For users on n8n v0.187+:

1. Go to **Settings > Community Nodes**
2. Click **Install**
3. Enter `n8n-nodes-memory-box` and confirm
4. Restart n8n

### Manual Installation

If you prefer to manually install the node:

```bash
# Navigate to your n8n installation directory
cd ~/.n8n

# Install the node
npm install n8n-nodes-memory-box
```

## Configuration

To use this node, you'll need:

1. **Memory Box API Token** - Used for authentication with the Memory Box API
2. **API URL** - The URL of the Memory Box API (e.g., https://memorybox.amotivv.ai/api)

In the n8n Credentials Manager, create new credentials of type "Memory Box API" and configure:
- **API Token**: Your user-specific token from Memory Box
- **API URL**: The base URL of the Memory Box API

## Operations

### Memory Operations

1. **Store Memory**
   - Store a new memory in Memory Box
   - Requires: Memory Text
   - Optional: Bucket ID

2. **Search Memories**
   - Search for memories using semantic search
   - Requires: Query text
   - Optional: Debug Mode (provides additional search details)

3. **Get All Memories**
   - Retrieve all memories for the user

4. **Get From Bucket**
   - Get all memories from a specific bucket
   - Requires: Bucket ID

### Bucket Operations

1. **Get All Buckets**
   - Retrieve all buckets for the user

## Example Usage

### Store a Memory

This example demonstrates how to store information from an incoming webhook:

1. **Webhook Node** - To receive data
2. **Memory Box Node**:
   - Set Resource to "Memory"
   - Set Operation to "Store Memory"
   - Set Memory Text to `{{$json.body}}`
   - Optionally set Bucket ID

### Generic Integration Example

This example demonstrates a workflow for processing data from various sources:

1. **HTTP Request Node** - Fetch data from an external API
2. **Function Node** - Process and format the data:
   ```javascript
   // Example function to process and format data
   const data = $input.item.json;
   
   // Extract key information
   const title = data.title || "Untitled";
   const content = data.content || data.description || data.text;
   
   // Format with today's date for Memory Box
   const today = new Date();
   const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD
   
   // Return formatted memory
   return {
     json: {
       memoryText: `${formattedDate}\n\n${title}\n\n${content}`,
       bucketId: "apiData"
     }
   };
   ```
3. **Memory Box Node**:
   - Set Resource to "Memory"
   - Set Operation to "Store Memory"
   - Set Memory Text to `{{$json.memoryText}}`
   - Set Bucket ID to `{{$json.bucketId}}`

## License

[MIT](LICENSE)
