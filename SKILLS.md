# SKILLS.md

Reusable tasks and procedures for n8n development. Reference these skills
when building, testing, or reviewing changes in the repository.

---

## 🧪 Testing Skills

### Validate Workflow Template JSON

Verify a workflow template JSON file has the correct structure:

```bash
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const ok = (c, m) => console.log(c ? '✅ ' + m : '❌ ' + m);
ok(typeof data.name === 'string', 'name is string');
ok(data.meta && typeof data.meta.templateId === 'string', 'meta.templateId exists');
ok(Array.isArray(data.nodes), 'nodes is array');
ok(typeof data.connections === 'object', 'connections is object');
ok(data.nodes.every(n => n.id && n.name && n.type && n.typeVersion !== undefined), 'all nodes valid');
const names = new Set(data.nodes.map(n => n.name));
const badSrc = Object.keys(data.connections).filter(n => !names.has(n));
ok(badSrc.length === 0, 'connection sources valid');
let badTgt = false;
for (const s in data.connections)
  for (const t in data.connections[s])
    for (const arr of data.connections[s][t])
      for (const c of arr)
        if (!names.has(c.node)) { console.log('  ❌ target: ' + c.node); badTgt = true; }
ok(!badTgt, 'connection targets valid');
" -- PATH_TO_JSON_FILE
```

### Run Frontend Unit Tests (vitest)

```bash
cd packages/frontend/editor-ui
pnpm test                # run all tests
pnpm test -- --run FILE  # run a single test file
```

### Run Backend Unit Tests (Jest)

```bash
cd packages/nodes-base   # or packages/cli, packages/core, etc.
pnpm test                # run all tests
pnpm test FILE           # run a single test file
```

### Run E2E Tests (Playwright)

```bash
pnpm --filter=n8n-playwright test:local
```

See `packages/testing/playwright/README.md` for details.

### Run Type Checks

```bash
cd packages/frontend/editor-ui   # or any package
pnpm typecheck
```

### Run Linter

```bash
cd packages/frontend/editor-ui   # or any package
pnpm lint
```

---

## 🏗️ Build Skills

### Build All Packages

```bash
pnpm build > build.log 2>&1
tail -n 20 build.log   # check for errors
```

### Build a Single Package

```bash
cd packages/frontend/editor-ui
pnpm build
```

---

## 📦 Template Management Skills

### Add a New Workflow Template

1. Create the JSON file in
   `packages/frontend/editor-ui/src/features/workflows/templates/utils/samples/`
2. Import it in `workflowSamples.ts`:
   ```typescript
   import myTemplateJson from './samples/my_template.json';
   ```
3. Add a getter function:
   ```typescript
   export const getMyTemplateWorkflowJson = (): WorkflowDataWithTemplateId => {
       return getWorkflowJson(myTemplateJson);
   };
   ```
4. Register in `SampleTemplates` (key must end with `Template`):
   ```typescript
   MyTemplate: getMyTemplateWorkflowJson().meta.templateId,
   ```
5. Add to `getSampleWorkflowByTemplateId` array:
   ```typescript
   getMyTemplateWorkflowJson(),
   ```
6. Run validation:
   ```bash
   cd packages/frontend/editor-ui && pnpm typecheck
   ```

### Validate Template Consistency

Check that documentation matches actual workflow capabilities:

- Sticky note text only describes features the tools support
- System message scope matches the available tool nodes
- SKILL.md and README.md describe only implemented features
- `SampleTemplates` key name follows `*Template` suffix convention

---

## 🤖 Agent Skill Management

### Add a New Agent Skill

1. Create directory: `mkdir -p agents/my-agent`
2. Create `SKILL.md` with YAML frontmatter:
   ```yaml
   ---
   name: my-agent
   description: >
     Description of what the agent does.
   model: inherit
   color: blue
   ---
   ```
3. Create `README.md` with setup instructions and usage examples
4. Register in `agents/README.md` table

### Agent Template Checklist

Before merging an agent template:

- [ ] JSON validates (name, meta.templateId, nodes, connections)
- [ ] All connection sources/targets reference valid node names
- [ ] System message scope matches available tools
- [ ] Sticky notes match actual capabilities (no phantom features)
- [ ] SKILL.md describes only implemented features
- [ ] README.md setup steps are accurate
- [ ] `SampleTemplates` key follows `*Template` suffix convention
- [ ] Template registered in `getSampleWorkflowByTemplateId`
- [ ] `pnpm typecheck` passes in `packages/frontend/editor-ui`
- [ ] Existing tests still pass

---

## 🔍 Code Review Skills

### Review Agent Workflow Template PR

1. **Structure**: Verify JSON has `name`, `meta.templateId`, `nodes`,
   `connections`
2. **Connections**: All sources and targets reference valid node names
3. **Naming**: `SampleTemplates` key ends with `Template`
4. **Consistency**: Documentation matches implemented features
5. **System Message**: Only claims capabilities supported by tools
6. **Credentials**: Uses placeholder pattern for user configuration
7. **Temperature**: Appropriate for use case (creative ~0.7, ops ~0.2–0.3)
8. **Tests**: No regressions in existing test suite

### Review TypeScript Changes

1. Run `pnpm typecheck` in affected package
2. Run `pnpm lint` in affected package
3. Run `pnpm test` in affected package
4. Check for unused imports/exports
5. Verify no `any` types introduced

---

## 🚀 CI/CD Skills

### Pre-Push Checklist

```bash
# From the affected package directory:
pnpm typecheck    # must pass
pnpm lint         # must pass
pnpm test         # must pass
```

### Verify PR is Mergeable

1. All CI checks pass (green)
2. No merge conflicts with base branch
3. Review comments addressed
4. PR title follows conventions in `.github/pull_request_title_conventions.md`
