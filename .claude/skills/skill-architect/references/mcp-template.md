# Minimal MCP Server Template

Production-ready starter template for MCP servers.

## File Structure

```
mcp-server/
├── src/
│   └── index.ts       # Server implementation
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
└── README.md          # Installation instructions
```

## src/index.ts

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Server metadata
const server = new Server(
  {
    name: "my-skill-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Define available tools
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "example_tool",
      description: "Example tool that demonstrates the pattern",
      inputSchema: {
        type: "object",
        properties: {
          input: {
            type: "string",
            description: "Input parameter description"
          }
        },
        required: ["input"]
      }
    }
  ]
}));

// Handle tool calls
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "example_tool") {
    try {
      // Your tool implementation here
      const result = await processInput(args.input);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to process: ${error.message}`);
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Helper function (example)
async function processInput(input: string): Promise<any> {
  // Implement your logic here
  return {
    processed: input,
    timestamp: new Date().toISOString()
  };
}

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## package.json

```json
{
  "name": "my-skill-mcp",
  "version": "1.0.0",
  "description": "MCP server for [domain] operations",
  "type": "module",
  "bin": {
    "my-skill-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "watch": "tsc --watch"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## README.md

```markdown
# My Skill MCP Server

MCP server for [domain] operations.

## Features

- [Feature 1]
- [Feature 2]
- [Feature 3]

## Installation

\`\`\`bash
cd mcp-server
npm install
npm run build
\`\`\`

## Configuration

Add to your Claude Code MCP settings (`~/.config/claude/config.json`):

\`\`\`json
{
  "mcpServers": {
    "my-skill": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "API_KEY": "your-api-key-here"
      }
    }
  }
}
\`\`\`

## Tools

### example_tool

Description of what this tool does.

**Parameters**:
- `input` (string, required): Description of input parameter

**Example**:
\`\`\`json
{
  "input": "test value"
}
\`\`\`

## Development

\`\`\`bash
npm run watch  # Auto-rebuild on changes
\`\`\`

## Testing

Test the server manually:
\`\`\`bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | npm start
\`\`\`
```

## Best Practices

1. **Error Handling**: Always wrap tool implementations in try-catch
2. **Validation**: Validate inputs before processing
3. **Logging**: Use structured logging for debugging
4. **Secrets**: Use environment variables for API keys
5. **Types**: Use TypeScript for type safety
6. **Documentation**: Keep README up to date with tool changes

## Common Patterns

### Authentication

```typescript
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable required");
}
```

### Rate Limiting

```typescript
import pLimit from 'p-limit';
const limit = pLimit(5); // Max 5 concurrent requests

async function processWithLimit(items: string[]) {
  return Promise.all(
    items.map(item => limit(() => processItem(item)))
  );
}
```

### Caching

```typescript
const cache = new Map<string, any>();

async function getCached(key: string, fetcher: () => Promise<any>) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  const value = await fetcher();
  cache.set(key, value);
  return value;
}
```

## Troubleshooting

**Server won't start**:
- Check that `npm run build` completed successfully
- Verify absolute path in config.json
- Check environment variables are set

**Tool not found**:
- Ensure tool name in `tools/list` matches `tools/call` handler
- Check for typos in tool names

**Authentication errors**:
- Verify API_KEY environment variable is set correctly
- Check API key has necessary permissions
