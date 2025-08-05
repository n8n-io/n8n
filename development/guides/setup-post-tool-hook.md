# Setup Smart Lint Hook Command

**Command for Claude Code**: When user requests smart lint setup, automatically execute the complete setup process.

## What is Smart Lint?

Smart Lint is a Claude Code PostToolUse hook that automatically runs code quality checks after file edits. It:

- **Auto-detects project type** (Go, Python, JavaScript/TypeScript, Rust, Nix, Shell, Tilt)
- **Runs appropriate linters** for each language
- **Blocks Claude** if code quality issues are found
- **Supports project-specific commands** (make targets, scripts)
- **Handles mixed-language projects**

## Claude Code Setup Instructions

When a user requests smart lint setup, Claude Code should automatically:

### 1. Copy Hook Files to Project

```bash
# Copy from the reference repository
cp -r "/Users/jeremyparker/Desktop/Claude Coding Projects/post-tool-stop-hook/hooks" ./
chmod +x hooks/smart-lint.sh
```

### 2. Create Project Configuration

Create `.claude-hooks-config.sh` with sensible defaults:

```bash
# Smart Lint Configuration
export CLAUDE_HOOKS_ENABLED="true"
export CLAUDE_HOOKS_FAIL_FAST="false"
export CLAUDE_HOOKS_SHOW_TIMING="false"
export CLAUDE_HOOKS_GO_DEADCODE_ENABLED="false"  # Disable for performance
```

### 3. Create Ignore File

Create `.claude-hooks-ignore` to exclude common directories:

```
# Test fixtures and generated files
**/fixtures/
**/test-data/
node_modules/
.git/
dist/
build/
target/
venv/
.venv/
__pycache__/
*.min.js
*.min.css
```

### 4. Test Installation

Create a test file and verify the hook works:

```bash
echo 'var x=1' > test-hook-setup.js
```

Then make an edit to trigger the hook and confirm it runs.

## User Communication

When setting up, Claude Code should:

1. **Explain what's happening**: "Setting up Smart Lint hook for automatic code quality checks..."
2. **Show progress**: Each step with clear descriptions
3. **Confirm success**: "Smart Lint hook installed successfully. It will now run after every file edit."
4. **Provide next steps**: How to configure, disable, or customize

## Advanced Setup

### Project-Specific Configuration

Create `.claude-hooks-config.sh` in your project root:

```bash
# Example configuration
export CLAUDE_HOOKS_FAIL_FAST="true"           # Stop on first error
export CLAUDE_HOOKS_SHOW_TIMING="true"         # Show execution time
export CLAUDE_HOOKS_PYTHON_ENABLED="false"     # Disable Python checks
export CLAUDE_HOOKS_GO_DEADCODE_ENABLED="false" # Disable slow deadcode analysis
```

### Project Command Integration

Smart Lint can use your existing project commands instead of built-in linters.

#### Using Make Targets

If you have a `Makefile` with lint targets:

```makefile
# Your existing Makefile
lint:
	eslint src/
	go vet ./...

lint-fix:
	eslint --fix src/
	go fmt ./...
```

Smart Lint will automatically use `make lint` when available.

#### Using Script Commands

If you have a `scripts/` directory:

```bash
# scripts/lint
#!/bin/bash
npm run lint
go vet ./...
```

Smart Lint will automatically use `scripts/lint` when available.

### Language-Specific Setup

#### JavaScript/TypeScript
- Requires `package.json` with eslint dependency
- Supports Prettier formatting
- Uses `npm run lint` if available

#### Python
- Uses `black` for formatting
- Uses `ruff` or `flake8` for linting
- Automatically applies fixes where possible

#### Go
- Uses standard Go tools (`go fmt`, `go vet`, `golangci-lint`)
- Optional deadcode analysis (can be disabled for performance)

#### Rust
- Uses `cargo fmt` and `cargo clippy`
- Enforces clippy warnings as errors

#### Shell Scripts
- Uses `shellcheck` for static analysis
- Uses `shfmt` for formatting
- Auto-detects shell scripts by extension and shebang

## Configuration Options

### Global Settings

```bash
export CLAUDE_HOOKS_ENABLED="true"              # Enable/disable all hooks
export CLAUDE_HOOKS_FAIL_FAST="false"           # Stop on first error
export CLAUDE_HOOKS_SHOW_TIMING="false"         # Show execution timing
export CLAUDE_HOOKS_USE_PROJECT_COMMANDS="true" # Use make/script commands
```

### Language Toggles

```bash
export CLAUDE_HOOKS_GO_ENABLED="true"
export CLAUDE_HOOKS_PYTHON_ENABLED="true"
export CLAUDE_HOOKS_JS_ENABLED="true"
export CLAUDE_HOOKS_RUST_ENABLED="true"
export CLAUDE_HOOKS_NIX_ENABLED="true"
export CLAUDE_HOOKS_SHELL_ENABLED="true"
export CLAUDE_HOOKS_TILT_ENABLED="true"
```

### Project Command Control

```bash
export CLAUDE_HOOKS_MAKE_LINT_TARGETS="lint lint-fix"
export CLAUDE_HOOKS_SCRIPT_LINT_NAMES="lint check"
```

## Ignoring Files

Create `.claude-hooks-ignore` in your project root:

```
# Ignore patterns (gitignore syntax)
node_modules/
*.min.js
vendor/
target/
.git/
```

## Troubleshooting

### Debug Mode

Enable debug output:

```bash
export CLAUDE_HOOKS_DEBUG="1"
```

### Common Issues

**Hook not running:**
- Check `~/.claude/settings.json` path is correct
- Ensure hook file is executable: `chmod +x hooks/smart-lint.sh`

**Missing dependencies:**
- Install required tools: `npm install eslint`, `pip install black ruff`, etc.
- Smart Lint will skip tools that aren't available

**Performance issues:**
- Disable expensive checks: `CLAUDE_HOOKS_GO_DEADCODE_ENABLED="false"`
- Enable fail-fast mode: `CLAUDE_HOOKS_FAIL_FAST="true"`

## Integration Examples

### Node.js Project

```bash
# Copy hooks
cp -r /path/to/smart-lint-hooks/hooks/ ./

# Configure package.json
npm install --save-dev eslint prettier

# Create .claude-hooks-config.sh
echo 'export CLAUDE_HOOKS_SHOW_TIMING="true"' > .claude-hooks-config.sh
```

### Go Project

```bash
# Copy hooks
cp -r /path/to/smart-lint-hooks/hooks/ ./

# Install tools
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Create Makefile with lint target
cat > Makefile << 'EOF'
lint:
	golangci-lint run
	go vet ./...
EOF
```

### Python Project

```bash
# Copy hooks
cp -r /path/to/smart-lint-hooks/hooks/ ./

# Install tools
pip install black ruff

# Create .claude-hooks-config.sh
echo 'export CLAUDE_HOOKS_PYTHON_ENABLED="true"' > .claude-hooks-config.sh
```

## Testing Installation

Create a test file with intentional issues:

```bash
# JavaScript test
echo 'var x=1' > test.js

# Python test  
echo 'def f( ):pass' > test.py

# Go test
echo 'package main; func main(){fmt.Println("test")}' > test.go
```

When Claude Code edits these files, Smart Lint should catch and fix the formatting issues.

## Customization

### Adding New Languages

Edit `hooks/smart-lint.sh` and add:

1. Detection logic in `detect_project_type_with_tilt()`
2. Linting function (e.g., `lint_mylang()`)
3. Case handler in `main()` function

### Custom Project Commands

Smart Lint looks for:
- `make lint` targets in project root
- `scripts/lint` executables
- Configurable via `CLAUDE_HOOKS_MAKE_LINT_TARGETS` and `CLAUDE_HOOKS_SCRIPT_LINT_NAMES`

## Exit Codes

- `0`: Success, no issues found
- `1`: General error (missing dependencies, etc.)
- `2`: Blocking issues found (Claude Code will stop and show errors)

Smart Lint ensures your code maintains high quality standards automatically as you work with Claude Code.