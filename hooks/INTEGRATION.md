# Claude Code Hooks - Project Integration Guide

This guide shows how to integrate your project with Claude Code's smart-lint and smart-test hooks by implementing `make lint` and `make test` targets.

## 🚀 Automated Integration

The easiest way to integrate hooks into your project:

```bash
cd /path/to/your/project
~/.claude/hooks/integrate.sh
```

This will analyze your project and generate a custom integration prompt for Claude!

## For Claude: Quick Summary

When you edit files, these hooks automatically run. To integrate a project:
1. Check if `make lint` and `make test` exist
2. If not, create them using the examples below
3. The hooks pass `FILE=relative/path/to/edited/file.ext`
4. Exit 0 = success, Exit 1+ = failure (blocks further edits)

## Manual Integration

### 1. Create a Makefile

Add these targets to your project's Makefile:

```makefile
# Lint target - receives FILE= argument with relative path to edited file
lint:
	@if [ -n "$(FILE)" ]; then \
		echo "Linting specific file: $(FILE)"; \
		# Your file-specific linting command here \
	else \
		echo "Linting all files"; \
		# Your project-wide linting command here \
	fi

# Test target - receives FILE= argument with relative path to edited file  
test:
	@if [ -n "$(FILE)" ]; then \
		echo "Testing specific file: $(FILE)"; \
		# Your file-specific testing command here \
	else \
		echo "Testing all files"; \
		# Your project-wide testing command here \
	fi
```

### 2. How It Works

When Claude edits a file, the hooks will:
1. Search upward from the edited file for a Makefile
2. If found, run `make lint FILE=relative/path/to/file.ext`
3. Pass the relative path from the Makefile's directory to the edited file
4. Use the exit code to determine if the operation should be blocked

## Examples by Language

### Go Project

```makefile
lint:
	@if [ -n "$(FILE)" ]; then \
		golangci-lint run $(FILE); \
		gofmt -w $(FILE); \
	else \
		golangci-lint run ./...; \
		gofmt -w .; \
	fi

test:
	@if [ -n "$(FILE)" ]; then \
		go test -v -race $(dir $(FILE)); \
	else \
		go test -v -race ./...; \
	fi
```

### Python Project

```makefile
lint:
	@if [ -n "$(FILE)" ]; then \
		black $(FILE); \
		ruff check --fix $(FILE); \
		mypy $(FILE); \
	else \
		black .; \
		ruff check --fix .; \
		mypy .; \
	fi

test:
	@if [ -n "$(FILE)" ]; then \
		pytest -xvs $(FILE) || pytest -xvs $(dir $(FILE)); \
	else \
		pytest -xvs; \
	fi
```

### TypeScript/JavaScript Project

```makefile
lint:
	@if [ -n "$(FILE)" ]; then \
		npx eslint --fix $(FILE); \
		npx prettier --write $(FILE); \
	else \
		npm run lint; \
		npm run format; \
	fi

test:
	@if [ -n "$(FILE)" ]; then \
		npx jest $(FILE); \
	else \
		npm test; \
	fi
```

### Mixed-Language Project

```makefile
# Detect file type and run appropriate linter
lint:
	@if [ -n "$(FILE)" ]; then \
		case "$(FILE)" in \
			*.go) golangci-lint run $(FILE) ;; \
			*.py) black $(FILE) && ruff check $(FILE) ;; \
			*.ts|*.js) npx eslint --fix $(FILE) ;; \
			*.sh) shellcheck $(FILE) ;; \
			*) echo "No linter for $(FILE)" ;; \
		esac \
	else \
		$(MAKE) lint-all; \
	fi

lint-all:
	@golangci-lint run ./...
	@black .
	@npm run lint
	@shellcheck **/*.sh

test:
	@if [ -n "$(FILE)" ]; then \
		case "$(FILE)" in \
			*.go) go test -v $(dir $(FILE)) ;; \
			*.py) pytest -xvs $(FILE) ;; \
			*.spec.ts|*.test.js) npx jest $(FILE) ;; \
			*) echo "No tests for $(FILE)" ;; \
		esac \
	else \
		$(MAKE) test-all; \
	fi

test-all:
	@go test -v ./...
	@pytest
	@npm test
```

## Alternative: Shell Scripts

If you prefer shell scripts over Makefiles, create a `scripts/` directory:

```bash
#!/usr/bin/env bash
# scripts/lint

FILE="$1"

if [ -n "$FILE" ]; then
    echo "Linting specific file: $FILE"
    # Your file-specific linting commands
else
    echo "Linting all files"
    # Your project-wide linting commands
fi
```

Make the script executable:
```bash
chmod +x scripts/lint scripts/test
```

## Key Requirements

### Exit Codes
- **Exit 0**: Linting/testing passed, Claude can continue
- **Exit 1+**: Linting/testing failed, Claude must fix issues before continuing

### Output
- Send all linting/testing output to stdout/stderr
- The hooks will capture and display this to the user
- Be specific about what failed and why

### Working Directory
- The make command is run from the directory containing the Makefile
- The `$(FILE)` argument is relative to that directory
- Use `$(realpath $(FILE))` if you need an absolute path

## Configuration

### Disable Project Commands

To disable project command integration and use language tools directly:

```bash
# In .claude-hooks-config.sh
export CLAUDE_HOOKS_USE_PROJECT_COMMANDS=false

# Or disable for specific languages
export CLAUDE_HOOKS_GO_USE_PROJECT_COMMANDS=false
export CLAUDE_HOOKS_PYTHON_USE_PROJECT_COMMANDS=false
```

### Custom Target Names

If your project uses different target names:

```bash
# In .claude-hooks-config.sh
export CLAUDE_HOOKS_MAKE_LINT_TARGETS="check validate lint"
export CLAUDE_HOOKS_MAKE_TEST_TARGETS="test test-unit test-all"
```

### Custom Script Names

For shell script discovery:

```bash
# In .claude-hooks-config.sh
export CLAUDE_HOOKS_SCRIPT_LINT_NAMES="check.sh validate.sh lint"
export CLAUDE_HOOKS_SCRIPT_TEST_NAMES="test.sh run-tests"
```

## Best Practices

1. **Fast Feedback**: When `FILE` is provided, run only the relevant checks for that file
2. **Clear Output**: Make errors obvious with clear messages about what failed
3. **Idempotent**: Running lint should fix issues when possible (formatters, auto-fixers)
4. **Graceful Fallback**: Handle missing tools gracefully with helpful error messages
5. **Respect .gitignore**: Don't lint/test files that are gitignored

## Testing Your Integration

Test your Makefile targets manually:

```bash
# Test file-specific linting
make lint FILE=src/main.go

# Test project-wide linting
make lint

# Test with nested paths
make lint FILE=internal/service/handler.go
```

## Troubleshooting

### Hooks Not Finding Your Makefile
- Ensure the Makefile is in a parent directory of edited files
- Check that the directory is within a project root (has .git, go.mod, package.json, etc.)

### FILE Argument Not Working
- The `$(FILE)` variable is passed by the hooks
- Ensure you're using `$(FILE)` not `${FILE}` in Makefiles
- For debugging, add `@echo "FILE=$(FILE)"` to your target

### Commands Not Found
- The hooks run in a minimal environment
- Use full paths or ensure tools are in standard locations
- Consider using `command -v` to check for tools first

## Common Questions

- **Multiple Makefiles?** The hooks use the nearest Makefile (searching upward from the edited file)
- **Disable hooks?** Set `CLAUDE_HOOKS_ENABLED=false` in `.claude-hooks-config.sh`
- **Different file types?** Use case statements in your Makefile (see Mixed-Language example)