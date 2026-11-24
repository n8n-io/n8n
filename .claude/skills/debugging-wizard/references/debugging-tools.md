# Debugging Tools

## Debuggers by Language

| Language | Debugger | Start Command |
|----------|----------|---------------|
| TypeScript/JS | Node Inspector | `node --inspect` |
| Python | pdb/ipdb | `python -m pdb` |
| Go | Delve | `dlv debug` |
| Rust | rust-gdb/lldb | `rust-gdb ./target/debug/app` |
| Java | JDB/IDE | IDE debugger |

## Node.js / TypeScript

```bash
# Start with inspector
node --inspect dist/main.js

# Break on first line
node --inspect-brk dist/main.js

# With ts-node
node --inspect -r ts-node/register src/main.ts
```

```typescript
// In code
debugger; // Breakpoint

// Quick print
console.log({ variable }); // Shows name and value
console.table(arrayOfObjects); // Table format
console.trace('Called from'); // Stack trace
```

## Python

```bash
# Start debugger
python -m pdb script.py

# Post-mortem on exception
python -m pdb -c continue script.py
```

```python
# In code
breakpoint()  # Python 3.7+
import pdb; pdb.set_trace()  # Older Python

# Quick print
print(f"{variable=}")  # Python 3.8+ shows name and value

# Rich debugging
from rich import inspect
inspect(object, methods=True)
```

### pdb Commands

| Command | Action |
|---------|--------|
| `n` | Next line |
| `s` | Step into |
| `c` | Continue |
| `l` | List code |
| `p expr` | Print expression |
| `pp expr` | Pretty print |
| `w` | Where (stack) |
| `q` | Quit |

## Go

```bash
# Start delve
dlv debug ./cmd/app

# Attach to running process
dlv attach <pid>

# Debug test
dlv test ./pkg/...
```

```go
// Quick print
log.Printf("%+v", variable) // With field names
fmt.Printf("%#v\n", variable) // Go syntax representation

// Spew for complex structures
import "github.com/davecgh/go-spew/spew"
spew.Dump(variable)
```

### Delve Commands

| Command | Action |
|---------|--------|
| `break main.go:42` | Set breakpoint |
| `continue` | Continue |
| `next` | Next line |
| `step` | Step into |
| `print var` | Print variable |
| `goroutines` | List goroutines |

## VS Code Debug Config

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug TypeScript",
      "program": "${workspaceFolder}/src/main.ts",
      "preLaunchTask": "tsc: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    },
    {
      "type": "python",
      "request": "launch",
      "name": "Debug Python",
      "program": "${workspaceFolder}/main.py",
      "console": "integratedTerminal"
    }
  ]
}
```

## Quick Reference

| Need | Tool |
|------|------|
| Breakpoint in code | `debugger;` / `breakpoint()` |
| Print with name | `console.log({x})` / `print(f"{x=}")` |
| Stack trace | `console.trace()` / `traceback.print_stack()` |
| Inspect object | `console.dir(obj)` / `dir(obj)` |
| Step through | IDE debugger or CLI debugger |
