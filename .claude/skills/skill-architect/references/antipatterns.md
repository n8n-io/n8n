# Skill Anti-Patterns: The Shibboleths

This document catalogs **domain-specific knowledge that separates novices from experts** - the things LLMs get wrong because their training data includes outdated patterns, oversimplified tutorials, or cargo-culted code.

## Table of Contents

1. [ML/AI Model Selection](#mlai-model-selection)
2. [Framework Evolution](#framework-evolution)
3. [Tool Architecture](#tool-architecture)
4. [Skill Design](#skill-design)

---

## ML/AI Model Selection

### Anti-Pattern: CLIP for Everything

**Novice thinking**: "CLIP is pre-trained on 400M image-text pairs and does zero-shot classification. Use it for all image-text tasks!"

**Reality**: CLIP has **fundamental geometric limitations**. Research from 2023-2025 proves it cannot simultaneously handle:

1. Basic descriptions
2. Attribute binding ("red car AND blue truck" vs "blue car AND red truck")
3. Spatial relationships ("cat left of dog" vs "dog left of cat")
4. Negation ("not a cat")

**What CLIP fails at**:
- ❌ Counting objects in images
- ❌ Fine-grained classification (celebrity ID, car models, flower species)
- ❌ Compositional reasoning
- ❌ Spatial understanding
- ❌ Handwritten text (MNIST-style)

**When to use alternatives**:

| Task | Use Instead | Why |
|------|-------------|-----|
| Counting objects | DETR, Faster R-CNN | Object detection models built for counting |
| Fine-grained classification | EfficientNet + task head | Transfer learning on specific domain |
| Compositional reasoning | DCSMs, PC-CLIP | Preserve patch/token topology |
| Spatial relationships | GQA models, SWIG | Built for spatial understanding |
| Attribute binding | PC-CLIP (pairwise) | Trained on comparative data |

**Timeline**:
- 2021: Original CLIP released
- 2022-2023: Limitations discovered in research
- 2024: DCSMs (Dense Cosine Similarity Maps) paper
- 2024: PC-CLIP (Pairwise Comparison CLIP)
- 2025: SpLiCE (Sparse Linear Concept Embeddings)

**LLM mistake**: LLMs trained on 2021-2023 data will suggest CLIP for everything because limitations weren't widely known yet.

---

### Anti-Pattern: Single Embedding Model

**Novice thinking**: "Pick one embedding model and use it everywhere"

**Expert knowledge**: Different tasks need different models:

**Text embeddings**:
- Semantic search: `text-embedding-3-large`, `voyage-2`
- Code search: `voyage-code-2`, `text-embedding-ada-002`
- Multi-lingual: `multilingual-e5-large`
- Long documents: `jina-embeddings-v2` (8k tokens)

**Image embeddings**:
- General: CLIP ViT-L/14
- Fine-grained: DINOv2
- Medical: BiomedCLIP
- Faces: ArcFace, CosFace

**Multi-modal**:
- Image-text: CLIP, BLIP-2
- Video: X-CLIP, VideoCLIP
- 3D: ULIP, PointCLIP

**Why this matters**: Embedding quality directly impacts retrieval accuracy. Using the wrong model can drop accuracy by 20-40%.

---

### Anti-Pattern: Ignoring Model Versioning

**Problem**: "We're using `text-embedding-ada-002`" (doesn't specify when)

**Why wrong**: Models evolve:
- `text-embedding-ada-002` (Dec 2022) vs `text-embedding-3-small` (Jan 2024)
- CLIP ViT-B/32 vs ViT-L/14 vs ViT-g-14
- Different training data, different capabilities

**Best practice**: Pin versions, document when you adopted them:
```python
# embeddings.py
MODEL = "text-embedding-3-large"  # Adopted: 2024-03-15
MODEL_DIMENSIONS = 3072
TRAINING_CUTOFF = "2023-09"  # Approximate
```

---

## Framework Evolution

### Anti-Pattern: Pages Router in App Router Projects

**Context**: Next.js 13 (Oct 2022) introduced App Router, fundamentally changing architecture.

**Outdated pattern** (Pages Router):
```javascript
// pages/api/users.js
export default function handler(req, res) {
  res.json({ users: [] })
}

// pages/users.js
export async function getServerSideProps() {
  return { props: { users: [] } }
}
```

**Current pattern** (App Router):
```javascript
// app/api/users/route.js
export async function GET() {
  return Response.json({ users: [] })
}

// app/users/page.js
async function UsersPage() {
  const users = await fetchUsers()  // Server Component
  return <UserList users={users} />
}
```

**Why it matters**: Pages Router patterns don't work in App Router and vice versa.

**LLM mistake**: Training data from 2020-2023 overwhelmingly shows Pages Router. LLMs will default to old patterns unless specifically prompted.

**Timeline**:
- 2016-2022: Pages Router only
- Oct 2022: App Router introduced (beta)
- May 2023: App Router stable
- 2024+: App Router is default

---

### Anti-Pattern: Redux for Everything

**Novice thinking**: "Global state needs Redux"

**Timeline**:
- 2015-2020: Redux dominated
- 2019: Context API improved in React 16.3
- 2020: Zustand, Jotai emerged
- 2023: React Server Components changed the game

**Current wisdom**:
- **Local UI state**: `useState`, `useReducer`
- **Derived state**: `useMemo`, selectors
- **Global state (simple)**: Context API
- **Global state (complex)**: Zustand, Jotai
- **Server state**: React Query, SWR
- **URL state**: Next.js searchParams
- **Redux**: Only if you need time-travel debugging or complex middleware

**Why Redux fell out of favor**:
- Boilerplate heavy
- Server Components make much state "server-native"
- Simpler alternatives emerged

**LLM mistake**: LLMs will suggest Redux by default because 80% of training data predates alternatives.

---

### Anti-Pattern: Class Components

**Timeline**:
- 2013-2018: Class components only
- Feb 2019: Hooks introduced (React 16.8)
- 2020+: Functional components are standard

**Outdated**:
```javascript
class UserProfile extends React.Component {
  state = { user: null }
  
  componentDidMount() {
    fetchUser().then(user => this.setState({ user }))
  }
  
  render() {
    return <div>{this.state.user?.name}</div>
  }
}
```

**Current**:
```javascript
function UserProfile() {
  const [user, setUser] = useState(null)
  
  useEffect(() => {
    fetchUser().then(setUser)
  }, [])
  
  return <div>{user?.name}</div>
}
```

**When class components are still valid**:
- Error boundaries (no hook equivalent yet)
- Legacy codebases

**LLM mistake**: Will generate class components for complex state management

---

## Tool Architecture

### Anti-Pattern: MCP for Everything

**Novice thinking**: "MCP is the new standard, make everything an MCP!"

**Expert reality**: MCPs have overhead. Use them strategically.

**Use MCP when**:
- ✅ External API with authentication
- ✅ Stateful connections (WebSocket, database)
- ✅ Real-time data streams
- ✅ Security boundaries (credentials, OAuth)

**Use Scripts when**:
- ✅ Local file operations
- ✅ Batch transformations
- ✅ Stateless computations
- ✅ CLI wrappers

**Example - Wrong**:
```python
# mcp_server_for_json_parsing.py - OVERKILL!
@mcp.tool()
def parse_json(file_path: str):
    with open(file_path) as f:
        return json.load(f)
```

**Example - Right**:
```python
# scripts/parse_json.py - Simple script!
import json
import sys

with open(sys.argv[1]) as f:
    data = json.load(f)
    print(json.dumps(data, indent=2))
```

**Philosophy**: "MCP's job isn't to abstract reality for the agent; its job is to manage the auth, networking, and security boundaries and then get out of the way."

---

### Anti-Pattern: Premature Abstraction

**Problem**: Building a complex MCP before understanding the use case

**Better approach**: Start with scripts, graduate to MCP when you need:
1. Auth/security boundaries
2. Multiple tools in same domain
3. State management
4. Error handling standardization

**Evolution path**:
```
Script → Multiple Scripts → Helper Library → MCP Server
```

Only promote to MCP when complexity justifies it.

---

## Skill Design

### Anti-Pattern: Skill as Documentation Dump

**Bad**:
```markdown
---
name: react-guide
description: Everything about React
---

# React Guide

React is a JavaScript library for building user interfaces...
[50 pages of tutorial content]
```

**Why wrong**: Not progressive disclosure, not actionable, not targeted.

**Good**:
```markdown
---
name: react-server-components
description: Use React Server Components correctly. Use when working with Next.js App Router, async components, or server-side data fetching.
---

# React Server Components

## Quick Decision Tree

Is your component:
- Fetching data? → Server Component
- Using hooks/events? → Client Component
- Both? → Server Component wrapper + Client Component child

## Common Anti-Pattern: Everything is 'use client'

❌ **Wrong**:
```jsx
'use client'
async function Page() {  // This doesn't work!
  const data = await fetch(...)
  return <div>{data}</div>
}
```

✅ **Right**:
```jsx
// Server Component (default)
async function Page() {
  const data = await fetchData()
  return <ClientComponent data={data} />
}

// client-component.jsx
'use client'
function ClientComponent({ data }) {
  const [count, setCount] = useState(0)
  return <div onClick={() => setCount(count + 1)}>{data}</div>
}
```

## When This Pattern Changed

- Pre-Next.js 13: All components are client-side
- Next.js 13+: Server Components by default
- LLM confusion: Will add 'use client' everywhere because older patterns

See /references/server-components-deep-dive.md for more.
```

---

### Anti-Pattern: Missing "When NOT to Use"

**Problem**: Skills activate on false positives

**Example - Without negatives**:
```yaml
description: Processes images using computer vision techniques
```
Activates for: image resizing, image generation, image editing, OCR, face detection, etc.

**Example - With negatives**:
```yaml
description: Semantic image search using CLIP embeddings. Use for finding similar images, zero-shot classification. NOT for image generation, editing, or OCR. NOT for counting objects or fine-grained classification.
```

**Pattern**: Always include "NOT for X, Y, Z" to prevent false activation.

---

### Anti-Pattern: No Validation Script

**Problem**: Skill gives instructions but no way to check correctness

**Better**: Include validation

```python
# scripts/validate.py
def validate_setup():
    """Check if environment is configured correctly."""
    checks = {
        "Node version": check_node_version(),
        "Dependencies": check_dependencies(),
        "API keys": check_api_keys(),
    }
    
    for name, passed in checks.items():
        print(f"{'✅' if passed else '❌'} {name}")
    
    return all(checks.values())
```

---

### Anti-Pattern: Overly Permissive Tools

**Bad**:
```yaml
allowed-tools: Bash
```

**Why**: Can execute ANY bash command

**Better**:
```yaml
allowed-tools: Bash(git:*,npm:run,npm:install),Read,Write
```

**Principle**: Least privilege - only grant what's needed

---

## Temporal Knowledge Patterns

When documenting anti-patterns, always include:

1. **Timeline**: When was this practice common?
2. **Why deprecated**: What replaced it and why?
3. **LLM confusion**: Why will LLMs suggest the old pattern?
4. **Migration path**: How to update from old to new?

**Template**:
```markdown
### Anti-Pattern: [Pattern Name]

**Used**: [Date range]
**Replaced by**: [New approach]
**Why deprecated**: [Reason]

**Old way**:
[code example]

**New way**:
[code example]

**LLM mistake**: [Why LLM suggests old pattern]
**How to detect**: [Validation rule]
```

---

---

## Real-World Failure Case Studies

### Case Study 1: The Photo Expert Explosion

**Skill**: `photo-expert` (v1.0)
**Problem**: Single skill for ALL photo operations

**Symptoms**:
- Activated on "photo" anywhere in query
- 800+ lines of instructions
- Slow loading, high token usage
- Wrong advice given (composition advice when user wanted color theory)

**Root Cause**: Everything Skill anti-pattern

**Resolution**: Split into 5 focused skills:
- `clip-aware-embeddings` - semantic search
- `photo-composition-critic` - aesthetic analysis
- `color-theory-palette-harmony-expert` - color science
- `collage-layout-expert` - arrangement algorithms
- `event-detection-temporal-intelligence-expert` - clustering

**Lesson**: One domain ≠ one skill. Split by expertise type.

---

### Case Study 2: The Phantom MCP

**Skill**: `github-workflow-helper` (v1.1)
**Problem**: Referenced MCP server that didn't exist

**SKILL.md said**:
```markdown
Use the included MCP server for GitHub API access.
Run: `npx github-helper-mcp`
```

**Reality**: No `mcp-server/` directory existed

**Symptoms**:
- Claude confidently told users to run non-existent commands
- Users filed bug reports
- Trust in skill ecosystem damaged

**Root Cause**: Reference Illusion anti-pattern

**Resolution**:
1. Added `check_self_contained.py` to detect phantom tools
2. Either create the MCP or remove the reference
3. Added validation to CI

**Lesson**: Don't promise tools you don't deliver.

---

### Case Study 3: The Time Bomb

**Skill**: `react-hooks-expert` (v2.0)
**Problem**: Temporal knowledge became stale

**Original content (2023)**:
```markdown
Use useEffect with empty deps for componentDidMount behavior
```

**By 2024**: This caused issues with React 18 Strict Mode double-mounting

**Symptoms**:
- Users followed advice → got bugs
- Skill became actively harmful
- No CHANGELOG to track when content was written

**Root Cause**: Missing temporal knowledge markers

**Resolution**:
```markdown
## Temporal Context
- **Pre-React 18**: useEffect with [] = componentDidMount
- **React 18+**: useEffect with [] runs TWICE in dev (Strict Mode)
- **Current best practice**: Use refs for "run once" patterns
```

**Lesson**: Date your knowledge. Update quarterly.

---

### Case Study 4: The Activation Black Hole

**Skill**: `api-design-expert` (v1.0)
**Problem**: Never activated when needed

**Description**:
```yaml
description: Expert guidance for API design
```

**Symptoms**:
- User: "How should I structure my REST endpoints?"
- Skill: *silence*
- User confused why skill existed but never helped

**Root Cause**: Missing Exclusions + no keywords

**Resolution**:
```yaml
description: REST/GraphQL API design patterns. Activate on "API design",
"endpoint structure", "REST architecture", "GraphQL schema".
NOT for API implementation, SDK generation, or documentation.
```

**Lesson**: Generic descriptions = zero activations

---

## Contributing

When you discover a new anti-pattern:

1. Document what looks right but is wrong
2. Explain the fundamental reason it's wrong
3. Show the correct approach
4. Include temporal context (when did this change?)
5. Note why LLMs make this mistake
6. Add detection/validation if possible

**Remember**: The goal is to encode the knowledge that separates "it compiles" from "it's correct" - the shibboleths that reveal expertise.
