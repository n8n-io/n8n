# Self-Contained Tools

Implementation patterns for scripts, MCP servers, and subagents that make skills immediately useful.

## Philosophy

**The best skill is one where the user can start working immediately.**

| Approach | Result |
|----------|--------|
| "Here's how to build a CLIP embedder" | User spends 2 hours implementing |
| "Here's a working CLIP embedder, run it" | User is productive in 2 minutes |

Skills should encode expertise AND provide working tools to apply that expertise.

---

## Scripts

### When to Include Scripts

- Skill describes repeatable operations (analysis, validation, transformation)
- Domain has specific algorithms that should be implemented correctly
- Pre-flight checks would prevent common errors

### Script Requirements

1. **Actually work** - Not templates, not pseudocode
2. **Minimal dependencies** - Prefer stdlib, document any pip/npm installs
3. **Clear interface** - CLI args or stdin/stdout
4. **Error handling** - Graceful failures with helpful messages
5. **README** - How to install and run

### Example: Domain Analysis Script

```python
#!/usr/bin/env python3
"""
Photo Composition Analyzer
Analyzes images for composition quality using rule of thirds,
visual weight distribution, and color harmony.

Usage: python analyze_composition.py <image_path>
Dependencies: pip install pillow numpy
"""

import sys
from pathlib import Path

def analyze_composition(image_path: str) -> dict:
    """Analyze composition and return scores."""
    # Import here to give helpful error if missing
    try:
        from PIL import Image
        import numpy as np
    except ImportError:
        print("Install dependencies: pip install pillow numpy")
        sys.exit(1)

    img = Image.open(image_path)
    # ... actual implementation ...

    return {
        "rule_of_thirds": 0.85,
        "visual_balance": 0.72,
        "color_harmony": 0.91,
        "overall": 0.83
    }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <image_path>")
        sys.exit(1)

    result = analyze_composition(sys.argv[1])
    for metric, score in result.items():
        print(f"{metric}: {score:.2f}")
```

### Example: Validation Script

```bash
#!/bin/bash
# validate_skill.sh - Pre-flight checks for skill quality
# Usage: ./validate_skill.sh /path/to/skill

SKILL_DIR="$1"

if [ -z "$SKILL_DIR" ]; then
    echo "Usage: $0 <skill_directory>"
    exit 1
fi

errors=0

# Check SKILL.md exists
if [ ! -f "$SKILL_DIR/SKILL.md" ]; then
    echo "❌ Missing SKILL.md"
    ((errors++))
else
    echo "✅ SKILL.md exists"
fi

# Check line count
lines=$(wc -l < "$SKILL_DIR/SKILL.md")
if [ "$lines" -gt 500 ]; then
    echo "⚠️  SKILL.md is $lines lines (target: &lt;500)"
else
    echo "✅ SKILL.md is $lines lines"
fi

# Check for NOT clause in description
if grep -q "NOT for" "$SKILL_DIR/SKILL.md"; then
    echo "✅ Description has NOT clause"
else
    echo "❌ Missing NOT clause in description"
    ((errors++))
fi

exit $errors
```

---

## MCP Servers

### When to Build an MCP

- Skill needs external API access (GitHub, Figma, databases, etc.)
- OAuth or API key authentication required
- Stateful connections (websockets, streaming)
- Rate limiting or caching needed

### MCP Server Structure

```
mcp-server/
├── src/
│   └── index.ts       # Server implementation
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript config
└── README.md          # Installation instructions
```

### Example: Minimal MCP Server

```typescript
// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  { name: "my-skill-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Define tools
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "analyze_repo",
      description: "Analyze a GitHub repository structure",
      inputSchema: {
        type: "object",
        properties: {
          repo: { type: "string", description: "owner/repo format" }
        },
        required: ["repo"]
      }
    }
  ]
}));

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "analyze_repo") {
    // Actual implementation
    const result = await analyzeRepo(args.repo);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

### package.json

```json
{
  "name": "my-skill-mcp",
  "version": "1.0.0",
  "type": "module",
  "bin": { "my-skill-mcp": "dist/index.js" },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### README Template

```markdown
# My Skill MCP Server

MCP server for [domain] operations.

## Installation

\`\`\`bash
cd mcp-server
npm install
npm run build
\`\`\`

## Configuration

Add to your Claude Code MCP settings:

\`\`\`json
{
  "mcpServers": {
    "my-skill": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
\`\`\`

## Tools

- `analyze_repo` - Analyze a GitHub repository structure
- `fetch_issues` - Get open issues with labels
```

---

## Subagents

### When to Define Subagents

- Skill involves multi-step workflows
- Different phases need different tool access
- Orchestration logic is complex enough to warrant isolation

### Subagent Definition Format

```markdown
# agents/research-workflow.md

## Agent: Research Coordinator

### Purpose
Orchestrate multi-source research with synthesis.

### System Prompt
You are a research coordinator. Your job is to:
1. Break down research questions into searchable queries
2. Dispatch searches to appropriate sources
3. Synthesize findings into coherent answers

### Tools Required
- WebSearch
- WebFetch
- Read
- Write

### Workflow
1. Receive research question
2. Generate 3-5 search queries
3. Execute searches in parallel
4. Read and extract relevant content
5. Synthesize into final answer

### Success Criteria
- All claims have citations
- Multiple sources corroborate findings
- Contradictions are explicitly noted
```

### Multi-Agent Orchestration Pattern

```markdown
# agents/orchestrator.md

## Pipeline: Code Review

### Agents
1. **security-scanner** - Check for vulnerabilities
2. **style-checker** - Verify code style
3. **architecture-reviewer** - Assess design patterns

### Orchestration
\`\`\`
parallel:
  - security-scanner → security_report
  - style-checker → style_report
then:
  - architecture-reviewer(security_report, style_report) → final_review
\`\`\`

### Handoff Protocol
Each agent produces structured output:
- `status`: pass | warn | fail
- `findings`: list of issues
- `recommendations`: suggested fixes
```

---

## Anti-Patterns

### Phantom Tools
**What it looks like**: SKILL.md references `scripts/analyze.py` but file doesn't exist

**Why it's wrong**: Users try to run non-existent code, lose trust in skill

**Fix**: Only reference tools that actually exist and work

### Template Soup
**What it looks like**: Scripts are templates with `# TODO: implement` comments

**Why it's wrong**: User still has to do the implementation work

**Fix**: Ship working code or don't ship at all

### Dependency Hell
**What it looks like**: Script requires 15 pip packages, specific Python version, system libraries

**Why it's wrong**: Most users won't complete setup

**Fix**: Minimize dependencies, prefer stdlib, document clearly

### MCP Without Purpose
**What it looks like**: MCP server for operations that could be a simple script

**Why it's wrong**: Over-engineering; MCP has setup overhead

**Fix**: Use MCP only when you need: auth, state, external APIs, or caching

---

## Checklist: Is My Skill Self-Contained?

```
□ Can a user start using this skill immediately?
□ Are all referenced scripts/tools actually present and working?
□ Do scripts have clear installation instructions?
□ Do scripts handle errors gracefully?
□ If MCP needed, is server implementation complete?
□ If subagents needed, are prompts and workflows defined?
□ Is there a validation script to check environment?
□ Does README explain how to set everything up?
```

---

## Examples of Self-Contained Skills

| Skill | Tools Included |
|-------|----------------|
| clip-aware-embeddings | `scripts/validate_clip_usage.py` |
| site-reliability-engineer | `scripts/validate-brackets.js`, `scripts/validate-liquid.js` |
| skill-coach | `scripts/validate_skill.py` |

**Goal**: Every skill with repeatable operations should have working tools.
