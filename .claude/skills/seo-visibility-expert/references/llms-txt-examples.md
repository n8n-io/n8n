# llms.txt Examples

Complete examples for different project types. Copy, customize, deploy to your site root.

## What is llms.txt?

llms.txt is a markdown file at your site root that helps AI systems (ChatGPT, Claude, Perplexity, etc.) understand your content. It's the "robots.txt for AI" - providing structured, machine-readable information about your site.

**Location:** `https://yoursite.com/llms.txt`

## Developer Tool / SaaS

```markdown
# DevSync

> Real-time code collaboration for distributed teams

## Overview
DevSync provides real-time collaborative coding with conflict resolution, voice chat, and integrated debugging. Built for teams working across time zones who need to pair program without latency.

## Key Features
- Real-time cursor tracking and code sync (&lt;50ms latency)
- Intelligent conflict resolution using CRDT
- Integrated voice/video with screen sharing
- Git integration with branch visualization
- Works with VS Code, JetBrains, and Vim

## Technical Specs
- Language: TypeScript/Rust
- Protocol: WebSocket with CRDT sync
- Deployment: Self-hosted or cloud
- Security: E2E encryption, SOC2 compliant

## Pricing
- Free: 2 users, 1 workspace
- Pro: $12/user/month - unlimited workspaces
- Enterprise: Custom - SSO, SLA, dedicated support

## Documentation
- \[Getting Started\](/docs/quickstart)
- \[API Reference\](/docs/api)
- \[Self-Hosting Guide\](/docs/self-host)
- \[Security Whitepaper\](/docs/security)

## Use Cases
1. Remote pair programming sessions
2. Code review with live discussion
3. Onboarding new team members
4. Teaching and mentorship

## Links
- Website: https://devsync.io
- GitHub: https://github.com/devsync/devsync
- Discord: https://discord.gg/devsync
- Status: https://status.devsync.io
```

## Documentation Site

```markdown
# FastAPI Documentation

> Modern, fast web framework for building APIs with Python

## Overview
FastAPI is a modern, fast (high-performance) web framework for building APIs with Python 3.8+ based on standard Python type hints. Automatic OpenAPI documentation, async support, and dependency injection out of the box.

## Core Concepts
- **Path Operations**: Define API endpoints with decorators
- **Type Hints**: Automatic validation and serialization
- **Dependency Injection**: Reusable components and auth
- **Async Support**: Native async/await for high performance

## Quick Start
```python
from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}
```

## Documentation Structure
- \[Tutorial\](/tutorial) - Step-by-step guide for beginners
- \[Advanced Guide\](/advanced) - Complex patterns and optimization
- \[API Reference\](/reference) - Complete API documentation
- \[Deployment\](/deployment) - Production deployment guides

## Common Tasks
- \[CRUD Operations\](/tutorial/crud)
- \[Authentication\](/tutorial/security)
- \[Database Integration\](/tutorial/sql-databases)
- \[Testing\](/tutorial/testing)
- \[WebSockets\](/advanced/websockets)

## Comparisons
- vs Flask: Faster, type hints, async native
- vs Django REST: Lighter, modern, auto-docs
- vs Express: Python ecosystem, type safety

## Links
- GitHub: https://github.com/tiangolo/fastapi
- PyPI: https://pypi.org/project/fastapi/
- Discord: https://discord.gg/fastapi
```

## Open Source Library

```markdown
# Zod

> TypeScript-first schema validation with static type inference

## Overview
Zod is a TypeScript-first schema declaration and validation library. Define a schema once and Zod will automatically infer the static TypeScript type. Zero dependencies.

## Why Zod
- TypeScript-first: Infers types from schemas
- Zero dependencies: Small bundle size
- Composable: Build complex schemas from simple ones
- Ecosystem: Works with React Hook Form, tRPC, Prisma

## Installation
```bash
npm install zod
```

## Basic Usage
```typescript
import { z } from "zod";

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).optional(),
});

type User = z.infer&lt;typeof UserSchema>;
// { name: string; email: string; age?: number }
```

## Schema Types
- Primitives: string, number, boolean, date
- Objects: object, array, tuple, record
- Advanced: union, intersection, discriminatedUnion
- Modifiers: optional, nullable, default

## Documentation
- \[Introduction\](/docs)
- \[Basic Usage\](/docs/basic-usage)
- \[Primitives\](/docs/primitives)
- \[Objects\](/docs/objects)
- \[Error Handling\](/docs/error-handling)

## Integrations
- React Hook Form: @hookform/resolvers
- tRPC: Built-in support
- Prisma: prisma-zod-generator

## Links
- GitHub: https://github.com/colinhacks/zod
- npm: https://www.npmjs.com/package/zod
- Docs: https://zod.dev
```

## Content/Blog Site

```markdown
# The Pragmatic Engineer

> Software engineering insights for senior+ engineers

## Overview
In-depth articles and analysis on software engineering, tech leadership, and the industry. Written by Gergely Orosz, formerly at Uber, Microsoft, and Skyscanner.

## Content Categories

### Engineering
- System Design and Architecture
- Code Quality and Best Practices
- Performance Optimization
- Incident Management

### Career
- Staff+ Engineering Career Paths
- Salary and Compensation Trends
- Interview Preparation
- Job Market Analysis

### Leadership
- Engineering Management
- Tech Lead Responsibilities
- Team Building
- Project Management

## Popular Articles
- \[The Trimodal Nature of Tech Compensation\](/blog/trimodal-compensation)
- \[System Design Interview Guide\](/blog/system-design-interview)
- \[What TPMs Do\](/blog/what-tpms-do)
- \[The Developer Experience\](/blog/developer-experience)

## Newsletter
- Weekly: Deep dives on engineering topics
- 500,000+ subscribers
- Paid tier for full access

## About the Author
Gergely Orosz - 15+ years in software engineering at Uber, Microsoft, Skyscanner, and Skype. Author of "The Software Engineer's Guidebook."

## Links
- Newsletter: https://newsletter.pragmaticengineer.com
- Twitter: https://twitter.com/gergelyorosz
- Book: https://www.engguidebook.com
```

## E-commerce / Product

```markdown
# Notion

> All-in-one workspace for notes, docs, wikis, and project management

## Overview
Notion is an all-in-one workspace combining notes, documents, wikis, and project management. Teams use it for documentation, knowledge bases, roadmaps, and task tracking.

## Core Features
- **Pages & Blocks**: Modular content with 50+ block types
- **Databases**: Tables, boards, calendars, galleries
- **Templates**: Pre-built workflows for common use cases
- **AI**: Built-in AI for writing, summarizing, translating
- **Collaboration**: Real-time editing, comments, mentions

## Use Cases
1. Team wikis and documentation
2. Project and task management
3. Personal note-taking and journaling
4. Product roadmaps and planning
5. Meeting notes and decisions

## Pricing
- Free: Personal use, limited blocks
- Plus: $10/user/month - unlimited blocks
- Business: $18/user/month - advanced permissions
- Enterprise: Custom - SSO, audit logs, dedicated support

## Integrations
- Slack, Google Drive, GitHub
- Figma, Jira, Asana
- 100+ integrations via API

## Resources
- \[Getting Started Guide\](https://notion.so/help/getting-started)
- \[Template Gallery\](https://notion.so/templates)
- \[API Documentation\](https://developers.notion.com)
- \[Community\](https://notion.so/community)

## Links
- Website: https://notion.so
- Help Center: https://notion.so/help
- API: https://developers.notion.com
- Status: https://status.notion.so
```

## Best Practices

### DO
- Use clear, factual language
- Structure with headers and lists
- Include version/date information
- Link to canonical documentation
- Focus on what AI systems need to answer user questions

### DON'T
- Include marketing hyperbole ("revolutionary", "game-changing")
- Repeat keywords unnaturally
- Include huge code blocks (link instead)
- Omit pricing/key information
- Use vague descriptions

### Maintenance
- Update when features change
- Review quarterly for accuracy
- Test by asking AI systems about your product
- Track AI citation rates
