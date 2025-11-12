# Claude Server

Remote collaboration server for Claude Code. This allows you to interact with Claude programmatically via HTTP API, with full access to file operations, shell commands, and code search capabilities.

## Overview

Think of this as "Claude Code as a service" - it provides an HTTP API to interact with Claude in the context of your codebase, with the same capabilities Claude Code has in interactive mode:

- Read, write, and edit files
- Execute shell commands (git, npm, pnpm, etc.)
- Search code (grep, glob patterns)
- Multi-shot conversations with context

## Quick Start

### Prerequisites

- Node.js >= 20.19
- An Anthropic API key (get one at https://console.anthropic.com/)

### Installation

```bash
# Install dependencies
pnpm install

# Set your API key
export ANTHROPIC_API_KEY=your_api_key_here

# Optional: Set default working directory (defaults to current directory)
export WORKING_DIR=/path/to/your/codebase

# Start the server
pnpm dev
```

The server will start on http://localhost:3000 by default.

## API Reference

### Send Message

Send a message to Claude. Creates a new conversation if no sessionId is provided.

**Endpoint:** `POST /api/messages`

**Request:**
```json
{
  "content": "Your message to Claude",
  "sessionId": "optional-session-id-to-continue-conversation",
  "workingDirectory": "/optional/custom/working/directory"
}
```

**Response:**
```json
{
  "sessionId": "uuid-of-session",
  "content": "Claude's response",
  "toolResults": [
    {
      "toolName": "Read",
      "input": { "file_path": "package.json" },
      "output": "file contents...",
      "isError": false
    }
  ]
}
```

### List Sessions

Get all active conversation sessions.

**Endpoint:** `GET /api/sessions`

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "createdAt": "2025-01-12T...",
      "lastActivityAt": "2025-01-12T...",
      "messageCount": 5,
      "workingDirectory": "/path/to/codebase"
    }
  ]
}
```

### Get Session Details

Get full details and message history for a session.

**Endpoint:** `GET /api/sessions/:id`

**Response:**
```json
{
  "id": "session-uuid",
  "createdAt": "2025-01-12T...",
  "lastActivityAt": "2025-01-12T...",
  "messageCount": 5,
  "workingDirectory": "/path/to/codebase",
  "messages": [...]
}
```

### Delete Session

End a conversation and free up memory.

**Endpoint:** `DELETE /api/sessions/:id`

**Response:**
```json
{
  "success": true
}
```

## Example Usage

### Using curl

```bash
# Start a new conversation
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What TypeScript files are in the src directory?"
  }'

# Continue the conversation (use sessionId from previous response)
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Read the main server file",
    "sessionId": "your-session-id-here"
  }'

# List active sessions
curl http://localhost:3000/api/sessions

# Delete a session
curl -X DELETE http://localhost:3000/api/sessions/your-session-id-here
```

### Using JavaScript/TypeScript

```typescript
async function askClaude(message: string, sessionId?: string) {
  const response = await fetch('http://localhost:3000/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message, sessionId }),
  });

  return await response.json();
}

// Start a conversation
const result1 = await askClaude('What files are in the src directory?');
console.log(result1.content);

// Continue the conversation
const result2 = await askClaude('Read the server.ts file', result1.sessionId);
console.log(result2.content);
```

## How It Works

1. **Sessions**: Each conversation is a session with its own message history (stored in memory)
2. **Tools**: Claude automatically uses tools (Read, Write, Edit, Bash, Grep, Glob) based on your requests
3. **Tool Execution**: Tools run locally on your server - only results are sent to Claude's API
4. **Context**: Sessions maintain full conversation context, just like interactive Claude Code

### Available Tools

- **Read**: Read file contents
- **Write**: Create or overwrite files
- **Edit**: Perform exact string replacements in files
- **Bash**: Execute shell commands
- **Grep**: Search file contents with regex
- **Glob**: Find files matching patterns

## Configuration

Environment variables:

- `ANTHROPIC_API_KEY` (required): Your Anthropic API key
- `PORT` (optional): Server port (default: 3000)
- `WORKING_DIR` (optional): Default working directory (default: current directory)

## Security Considerations

- **File Access**: Claude can read/write any files within the working directory
- **Command Execution**: Claude can execute arbitrary shell commands
- **API Key**: Keep your ANTHROPIC_API_KEY secure
- **Network**: Consider running behind authentication/firewall for production use

## Notes

- Sessions are stored in memory and will be lost on server restart
- Inactive sessions are automatically cleaned up after 24 hours
- All conversations use the Claude Sonnet 4.5 model
- Tool results are included in responses for transparency

## Production Deployment

For production use, consider:

1. Adding authentication (API keys, OAuth, etc.)
2. Rate limiting
3. Persistent session storage (database)
4. HTTPS/TLS
5. Monitoring and logging
6. Resource limits per session
