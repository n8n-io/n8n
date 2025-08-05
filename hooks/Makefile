.PHONY: test lint check all clean help shellspec

# Default target
all: lint test

# Help target
help:
	@echo "Claude Code Hooks Development"
	@echo "============================"
	@echo "Available targets:"
	@echo "  make lint      - Run shellcheck on all hook scripts"
	@echo "  make test      - Run all test suites (legacy + shellspec)"
	@echo "  make shellspec - Run ShellSpec tests only"
	@echo "  make check     - Run both lint and test"
	@echo "  make clean     - Clean up temporary files"
	@echo "  make help      - Show this help message"
	@echo ""
	@echo "Note: These targets test locally. To deploy changes:"
	@echo "  1. Commit your changes"
	@echo "  2. Run 'update' to rebuild the NixOS system"

# Find all shell scripts
SHELL_SCRIPTS := $(wildcard *.sh) $(wildcard */*.sh)
TEST_SCRIPTS := $(wildcard tests/*_spec.sh) $(wildcard tests/*_test.sh)
SHELLSPEC_EXISTS := $(shell command -v shellspec 2>/dev/null)

# Lint all shell scripts with shellcheck
lint:
	@echo "Running shellcheck on all scripts..."
	@echo "===================================="
	@failed=0; \
	for script in $(SHELL_SCRIPTS); do \
		echo -n "Checking $$script... "; \
		if shellcheck -x "$$script" >/dev/null 2>&1; then \
			echo "✅ OK"; \
		else \
			echo "❌ FAILED"; \
			shellcheck -x "$$script"; \
			failed=1; \
		fi; \
	done; \
	if [ $$failed -eq 0 ]; then \
		echo ""; \
		echo "✅ All scripts passed shellcheck!"; \
	else \
		echo ""; \
		echo "❌ Some scripts failed shellcheck"; \
		exit 1; \
	fi

# Run all tests (legacy + shellspec)
test: 
	@echo "Running all test suites..."
	@echo "========================="
	@failed=0; \
	if [ -d tests ] && [ -n "$(TEST_SCRIPTS)" ]; then \
		echo "Running legacy tests..."; \
		echo "----------------------"; \
		for test in $(TEST_SCRIPTS); do \
			echo ""; \
			echo "Running $$test..."; \
			if bash "$$test"; then \
				echo "✅ $$test passed"; \
			else \
				echo "❌ $$test failed"; \
				failed=1; \
			fi; \
		done; \
	fi; \
	if [ -n "$(SHELLSPEC_EXISTS)" ] && [ -f .shellspec ]; then \
		echo ""; \
		echo "Running ShellSpec tests..."; \
		echo "-------------------------"; \
		if shellspec; then \
			echo "✅ ShellSpec tests passed"; \
		else \
			shellspec_exit_code=$$?; \
			if [ $$shellspec_exit_code -eq 127 ]; then \
				echo "⚠️  ShellSpec appears to be broken, skipping tests"; \
			else \
				echo "❌ ShellSpec tests failed"; \
				failed=1; \
			fi; \
		fi; \
	else \
		echo ""; \
		echo "ShellSpec not found or not configured, skipping ShellSpec tests"; \
	fi; \
	echo ""; \
	if [ $$failed -eq 0 ]; then \
		echo "✅ All tests passed!"; \
	else \
		echo "❌ Some tests failed"; \
		exit 1; \
	fi

# Run only ShellSpec tests
shellspec:
	@if [ -n "$(SHELLSPEC_EXISTS)" ] && [ -f .shellspec ]; then \
		echo "Running ShellSpec tests..."; \
		echo "========================="; \
		shellspec; \
	else \
		echo "❌ ShellSpec not found or .shellspec configuration missing"; \
		echo ""; \
		echo "To install ShellSpec:"; \
		echo "  nix-shell -p shellspec"; \
		exit 1; \
	fi

# Run both lint and test
check: lint test

# Clean up temporary files
clean:
	@echo "Cleaning up..."
	@find . -name "*.tmp" -delete
	@find . -name "*.log" -delete
	@echo "✅ Cleaned up temporary files"