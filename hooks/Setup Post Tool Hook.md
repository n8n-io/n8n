# 🚀 Quick Start Guide for Claude Code Hooks

This guide helps you integrate Claude Code hooks into your project in under 5 minutes.

## Step 1: Analyze Your Project

Run the integration assistant from your project root:

```bash
~/.claude/hooks/integrate.sh
```

This will:
- Detect your project's languages and structure
- Generate a custom prompt for Claude
- Identify specific integration requirements

## Step 2: Copy the Generated Prompt

The script outputs a prompt specifically tailored to your project. Copy everything between:
```
=== COPY THIS PROMPT TO CLAUDE ===
...
=== END OF PROMPT ===
```

## Step 3: Give the Prompt to Claude

Start a new Claude Code session in your project and paste the prompt. Claude will:
- Create or update your Makefile
- Add appropriate `lint` and `test` targets
- Configure language-specific tools

## Step 4: Test the Integration

```bash
# Test linting
make lint

# Test testing
make test

# Test with a specific file
make lint FILE=src/main.go
```

## Common Patterns

### Monorepo with Multiple Go Modules
```makefile
lint:
	@if [ -n "$(FILE)" ]; then \
		MODULE=$$(cd $$(dirname $(FILE)) && go list -m 2>/dev/null | head -1); \
		echo "Linting module: $$MODULE"; \
		cd $$(go list -f '{{.Dir}}' $$MODULE) && golangci-lint run ./...; \
	else \
		# Lint all modules
		for mod in $$(find . -name go.mod); do \
			echo "Linting $$(dirname $$mod)"; \
			(cd $$(dirname $$mod) && golangci-lint run ./...); \
		done \
	fi
```

### Mixed Language Project
```makefile
lint:
	@echo "Running all linters..."
	@make lint-go
	@make lint-python
	@make lint-js

lint-go:
	@if [ -f go.mod ]; then \
		gofmt -l -w . && golangci-lint run ./...; \
	fi

lint-python:
	@if [ -f requirements.txt ]; then \
		black . && flake8; \
	fi
```

## Configuration

Create `.claude-hooks-config.sh` in your project root for custom settings:

```bash
# Example: Disable specific languages
export CLAUDE_HOOKS_GO_ENABLED=true
export CLAUDE_HOOKS_PYTHON_ENABLED=false

# Example: Custom make targets
export CLAUDE_HOOKS_MAKE_LINT_TARGETS="check fmt"
export CLAUDE_HOOKS_MAKE_TEST_TARGETS="test-unit test-integration"
```

## Troubleshooting

### "Make target not found"
- Ensure your Makefile has `lint` and `test` targets
- Check that targets handle the `FILE` parameter

### "Tests/lints not running for my language"
- Verify the language is detected: `~/.claude/hooks/integrate.sh`
- Check language-specific enable flags in configuration

### "Too much output"
- The hooks now show minimal output on success
- Full output only appears on failures

## Next Steps

- Read the full documentation: `~/.claude/hooks/README.md`
- See integration examples: `~/.claude/hooks/INTEGRATION.md`
- Customize behavior: `~/.claude/hooks/example-claude-hooks-config.sh`

---

💡 **Pro tip**: Run `~/.claude/hooks/integrate.sh` whenever you add new languages or restructure your project!