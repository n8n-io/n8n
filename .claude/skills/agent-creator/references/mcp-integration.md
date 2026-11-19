# MCP Integration

Creating custom MCP servers for agents.

## Official Packages

| Package | Purpose | Install |
|---------|---------|---------|
| `@modelcontextprotocol/sdk` | Core TypeScript SDK | `npm install @modelcontextprotocol/sdk` |
| `@modelcontextprotocol/create-server` | Scaffold new servers | `npx @modelcontextprotocol/create-server my-server` |
| `@modelcontextprotocol/inspector` | Test and debug | `npx @modelcontextprotocol/inspector` |

## MCP Server Template

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  {
    name: "custom-skill-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Define tools
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "analyze_code",
        description: "Analyzes code for [specific purpose]",
        inputSchema: {
          type: "object",
          properties: {
            code: { type: "string" },
            language: { type: "string" },
          },
          required: ["code"],
        },
      },
    ],
  };
});

// Implement tool
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "analyze_code") {
    // Implementation
    return {
      content: [
        {
          type: "text",
          text: "Analysis results...",
        },
      ],
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## MCP Skill Creation Steps

### Step 1: Define the Capability

```typescript
// What unique capability does this provide?
interface SkillCapability {
  name: string;
  description: string;
  inputs: SchemaDefinition;
  outputs: SchemaDefinition;
}
```

### Step 2: Design the Interface

```typescript
// Clean, intuitive tool interface
{
  name: "analyze_quality",
  description: "Analyzes code quality metrics",
  inputSchema: {
    type: "object",
    properties: {
      code: { type: "string", description: "Code to analyze" },
      language: { type: "string", enum: ["python", "javascript", "go"] },
      focus: {
        type: "array",
        items: { type: "string" },
        description: "Aspects to focus on: complexity, security, performance"
      }
    },
    required: ["code", "language"]
  }
}
```

### Step 3: Implement Core Logic

```typescript
async function analyzeCode(
  code: string,
  language: string,
  focus: string[]
): Promise<Analysis> {
  // Implementation using appropriate tools
  // - AST parsing
  // - Pattern matching
  // - Metric calculation

  return {
    score: calculateScore(),
    issues: findIssues(),
    suggestions: generateSuggestions(),
    metrics: computeMetrics()
  };
}
```

### Step 4: Package as MCP Server

Complete server with:
- Tool registration
- Request handling
- Error management
- State management (if needed)

## Example: Performance Optimizer MCP

```typescript
// performance-optimizer-server.ts
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "analyze_bundle",
        description: "Analyzes bundle composition and suggests optimizations",
        inputSchema: {
          type: "object",
          properties: {
            bundlePath: { type: "string" },
            framework: { type: "string", enum: ["webpack", "vite", "rollup"] }
          },
          required: ["bundlePath"]
        }
      }
    ]
  };
});
```

## Testing MCP Servers

```bash
# Start inspector
npx @modelcontextprotocol/inspector

# Test tool invocation
# Use inspector UI to send requests and verify responses
```
