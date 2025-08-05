# Claude Code Hooks

Automated code quality checks that run after Claude Code modifies files, enforcing project standards with zero tolerance for errors.

## 🚀 Quick Start

```bash
# From your project root, run:
~/.claude/hooks/integrate.sh

# Copy the generated prompt and give it to Claude
# Done! Your project now has integrated hooks
```

The `integrate.sh` script automatically:
- Detects your project's languages and structure
- Identifies monorepos and subprojects
- Generates a custom integration prompt for Claude
- Takes under 5 minutes!

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - Get started in 5 minutes
- **[INTEGRATION.md](INTEGRATION.md)** - Detailed integration guide
- **[example-Makefile](example-Makefile)** - Copy-paste Makefile template
- **[example-claude-hooks-config.sh](example-claude-hooks-config.sh)** - Configuration options

## Hook Protocol

Claude Code hooks follow a JSON-based protocol:

### Input
Hooks receive JSON via stdin when triggered by Claude Code:
```json
{
  "hook_event_name": "PostToolUse",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/path/to/file.go",
    "old_string": "...",
    "new_string": "..."
  },
  "tool_output": {
    "status": "success"
  }
}
```

### Output
Hooks can optionally output JSON for advanced control (not required):
```json
{
  "action": "block",
  "message": "Linting failed - fix issues before continuing"
}
```

### Exit Codes
- `0`: Continue with operation
- `1`: General error (missing dependencies, etc.)
- `2`: Block operation (e.g., linting/test failures)

## Hooks

### `smart-lint.sh`
Intelligent project-aware linting that automatically detects language and runs appropriate checks:
- **Go**: `gofmt`, `golangci-lint` (enforces forbidden patterns like `time.Sleep`, `panic()`, `interface{}`)
- **Python**: `black`, `ruff` or `flake8`
- **JavaScript/TypeScript**: `eslint`, `prettier`
- **Rust**: `cargo fmt`, `cargo clippy`
- **Nix**: `nixpkgs-fmt`/`alejandra`, `statix`

Features:
- Prioritizes project-specific commands (`make lint`, `scripts/lint`) over language tools
- Detects project type automatically
- Smart file filtering (only checks modified files)
- Exit code 2 means issues found - ALL must be fixed
- Configurable deadcode analysis for Go (detects unreachable functions)

#### Failure

```
> Edit operation feedback:
  - [~/.claude/hooks/smart-lint.sh]:
  🔍 Style Check - Validating code formatting...
  ────────────────────────────────────────────
  [INFO] Project type: go
  [INFO] Running Go formatting and linting...
  [INFO] Using Makefile targets

  ═══ Summary ═══
  ❌ Go linting failed (make lint)

  Found 1 issue(s) that MUST be fixed!
  ════════════════════════════════════════════
  ❌ ALL ISSUES ARE BLOCKING ❌
  ════════════════════════════════════════════
  Fix EVERYTHING above until all checks are ✅ GREEN

  🛑 FAILED - Fix all issues above! 🛑
  📋 NEXT STEPS:
    1. Fix the issues listed above
    2. Verify the fix by running the lint command again
    3. Continue with your original task
```
```

#### Success

```
> Task operation feedback:
  - [~/.claude/hooks/smart-lint.sh]:
  🔍 Style Check - Validating code formatting...
  ────────────────────────────────────────────
  [INFO] Project type: go
  [INFO] Running Go formatting and linting...
  [INFO] Using Makefile targets

  👉 Style clean. Continue with your task.
```
```

### `smart-test.sh`
Automatically runs relevant tests when files are edited:
- Detects test files for edited source files
- Runs focused tests for specific changes
- Supports multiple test modes (focused, package, all, integration)
- Language support: Go, Python, JavaScript/TypeScript, Shell, Tilt

Features:
- Smart test discovery
- Race detection for Go tests
- Configurable test modes via `.claude-hooks-config.sh`
- Skips files that typically don't need tests (main.go, migrations, etc.)

### `ntfy-notifier.sh`
Push notifications via ntfy service for Claude Code events:
- Enabled by default when installed (opt-out with `CLAUDE_HOOKS_NTFY_DISABLED=true`)
- Sends alerts when Claude uses tools (Edit, Write, Bash, etc.)
- Requires configuration via environment variables or config file:
  - Environment: `CLAUDE_HOOKS_NTFY_URL="https://ntfy.sh/mytopic"`
  - Config file: `~/.config/claude-code-ntfy/config.yaml`

## Project Integration

> **📘 Quick Start**: See [INTEGRATION.md](INTEGRATION.md) for a step-by-step guide to implementing `make lint` and `make test` targets in your project.

The hooks prioritize project-specific commands over generic language tools. When a file is edited, hooks will:

### 1. Search for Project Root

Starting from the edited file's directory, the hook searches upward for:
- A `Makefile` containing `lint` or `test` targets
- A `scripts/` directory with executable `lint` or `test` scripts
- The project root (indicated by `.git/`, `go.mod`, `package.json`, etc.)

The search stops at the first match or when reaching the filesystem root.

### 2. Priority Order

For linting (`smart-lint.sh`):
1. **Make target**: If `make lint` exists, use it
2. **Script**: If `scripts/lint` is executable, use it
3. **Language tools**: Fall back to language-specific tools (golangci-lint, black, etc.)

For testing (`smart-test.sh`):
1. **Make target**: If `make test` exists, use it
2. **Script**: If `scripts/test` is executable, use it
3. **Language tools**: Fall back to language-specific test runners

### 3. File Arguments

When project commands are used, the edited file path is passed as an argument:

```bash
# For make targets:
make lint FILE="path/to/edited/file.go"

# For scripts:
scripts/lint path/to/edited/file.go
```

**Note**: It's the project's responsibility to handle these arguments appropriately. Projects can:
- Use the file argument to run focused checks
- Ignore it and run all checks
- Parse multiple files if passed

### 4. Working Directory

Commands are executed from the project root (where the Makefile or scripts directory was found), with file paths relative to that root.

### 5. Configuration

You can customize the target/script names via `.claude-hooks-config.sh`:

```bash
# Custom make target names (space-separated, checked in order)
CLAUDE_HOOKS_MAKE_LINT_TARGETS="lint check lint-all"
CLAUDE_HOOKS_MAKE_TEST_TARGETS="test test-unit tests"

# Custom script names (space-separated, checked in order)
CLAUDE_HOOKS_SCRIPT_LINT_NAMES="lint lint.sh check-style.sh"
CLAUDE_HOOKS_SCRIPT_TEST_NAMES="test test.sh run-tests.sh"

# Disable project integration for specific languages
CLAUDE_HOOKS_GO_USE_PROJECT_COMMANDS=false  # Always use golangci-lint directly
```

**Tip**: Run `~/.claude/hooks/integrate.sh` to generate the right configuration for your project!

### 6. Examples

#### Example: Go Project with Makefile

```makefile
# Project's Makefile
lint:
	@if [ -n "$(FILE)" ]; then \
		golangci-lint run $(FILE); \
	else \
		golangci-lint run ./...; \
	fi

test:
	@if [ -n "$(FILE)" ]; then \
		go test -v $$(dirname $(FILE)); \
	else \
		go test -v ./...; \
	fi
```

#### Example: Python Project with Scripts

```bash
#!/usr/bin/env bash
# scripts/lint
if [ $# -gt 0 ]; then
    # Lint specific files
    black --check "$@"
    ruff check "$@"
else
    # Lint everything
    black --check .
    ruff check .
fi
```

#### Example: Disabling for Complex Projects

If your project's make/scripts don't handle single-file arguments well:

```bash
# .claude-hooks-config.sh
# Use language tools directly instead of make targets
CLAUDE_HOOKS_USE_PROJECT_COMMANDS=false
```

## Installation

Automatically installed by Nix home-manager to `~/.claude/hooks/`

## Configuration

### Global Settings
Set environment variables or create project-specific `.claude-hooks-config.sh`:

```bash
CLAUDE_HOOKS_ENABLED=false      # Disable all hooks
CLAUDE_HOOKS_DEBUG=1            # Enable debug output (visible in Claude Code)
```

#### Debug Mode
When `CLAUDE_HOOKS_DEBUG=1` is set, hooks will:
- Output detailed debug information to help troubleshoot issues
- **Always exit with code 2** to ensure debug output is visible in Claude Code
- Show lifecycle messages like "Hook completed successfully (debug mode active)"

This is particularly useful when hooks aren't behaving as expected, as it makes all internal logging visible in the Claude Code interface.

To enable debug mode for a single session:
```bash
export CLAUDE_HOOKS_DEBUG=1
claude  # Run your Claude Code commands
```

Or add to your project's `.claude-hooks-config.sh`:
```bash
# Enable debug output for this project
export CLAUDE_HOOKS_DEBUG=1
```

### Per-Project Settings
Create `.claude-hooks-config.sh` in your project root:

```bash
# Language-specific options
CLAUDE_HOOKS_GO_ENABLED=false
CLAUDE_HOOKS_GO_COMPLEXITY_THRESHOLD=30
CLAUDE_HOOKS_PYTHON_ENABLED=false

# Exclude specific test patterns (e.g., E2E tests requiring special context)
CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS="e2e,integration_test"

# See example-claude-hooks-config.sh for all options
```

### Excluding Files

#### Using .claude-hooks-ignore
Create `.claude-hooks-ignore` in your project root to exclude files from all hooks. This file uses gitignore syntax with support for:
- Glob patterns (`*.pb.go`, `*_generated.go`)
- Directory patterns (`vendor/**`, `node_modules/**`)
- Specific files (`legacy/old_api.go`)

**Example .claude-hooks-ignore:**
```gitignore
# Generated files that shouldn't be linted
*.pb.go
*_generated.go
*.min.js
dist/**
build/**

# Third-party code
vendor/**
node_modules/**

# Files with special formatting
migrations/*.sql
testdata/**
*.golden

# Temporary exclusions (document why!)
# TODO: Remove after migration (ticket #123)
legacy/old_api.go
```

Create `.claude-hooks-ignore` in your project root using gitignore syntax:
```gitignore
# Generated code
*.pb.go
*_generated.go

# Vendor dependencies
vendor/**
node_modules/**

# Legacy code being refactored
legacy/**
```

See `example-claude-hooks-ignore` for a comprehensive template with detailed explanations.

#### Inline Exclusions
Add a comment to the first 5 lines of any file to skip it:
```go
// claude-hooks-disable - Legacy code, will be removed in v2.0
package old
```

Language-specific comments:
- Go: `// claude-hooks-disable`
- Python: `# claude-hooks-disable`
- JavaScript: `// claude-hooks-disable`
- Rust: `// claude-hooks-disable`
- Tilt: `# claude-hooks-disable`

**Always document WHY** the file is excluded!

#### Important: Use Exclusions Sparingly!
The goal is 100% clean code. Only exclude:
- **Generated code** - Protocol buffers, code generators
- **Vendor directories** - Third-party code you don't control
- **Test fixtures** - Intentionally malformed code for testing
- **Database migrations** - Often have different formatting standards
- **Legacy code** - Only with a clear migration plan

**Never exclude** to avoid fixing issues:
- ❌ Your source code
- ❌ Test files (they should meet standards too)
- ❌ New features you're writing
- ❌ Code you're too lazy to fix

The `.claude-hooks-ignore` is for code you **can't** fix, not code you **won't** fix.

## Usage

```bash
./smart-lint.sh           # Auto-runs after Claude edits
./smart-lint.sh --debug   # Debug mode
```

### Exit Codes
- `0`: All checks passed ✅
- `1`: General error (missing dependencies)
- `2`: Issues found - must fix ALL

## Dependencies

Hooks work best with these tools installed:
- **Go**: `golangci-lint`
- **Python**: `black`, `ruff`
- **JavaScript**: `eslint`, `prettier` 
- **Rust**: `cargo fmt`, `cargo clippy`
- **Nix**: `nixpkgs-fmt`, `alejandra`, `statix`
- **Tilt/Starlark**: `buildifier`, `tilt` (optional)

Hooks gracefully degrade if tools aren't installed.

## Tilt/Starlark Support

The hooks automatically detect and handle Tilt projects by looking for:
- `Tiltfile` in the root or subdirectories
- Files with `.tiltfile` extension
- Files with `.star` or `.bzl` extensions (Starlark files)

### Tilt Linting

When Tiltfiles are detected, smart-lint will:
1. Check for `make lint-tilt` target and use it if available
2. Run buildifier for formatting and linting (if installed)
3. Validate syntax using Python
4. Run custom linters (`scripts/lint-tiltfiles.sh` or `scripts/tiltfile-custom-lint.py`)
5. Check for hardcoded secrets and AWS account IDs

### Tilt Testing

When Tiltfiles are edited, smart-test will:
1. Check for `make test-tilt` target and use it if available
2. Look for and run pytest tests (e.g., `tests/test_tiltfiles.py`)
3. Validate Tiltfile with `tilt alpha tiltfile-result` (if tilt is installed)
4. Run basic syntax validation

### Installing Tilt Tools

```bash
# Install buildifier (recommended)
go install github.com/bazelbuild/buildtools/buildifier@latest
# or on macOS
brew install buildifier

# Install Tilt (optional, for validation)
curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash
```
