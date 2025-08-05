# Testing Guide for Claude Code Hooks

This guide documents the testing structure and patterns for Claude Code hook scripts. Following these patterns ensures consistent, maintainable, and reliable tests.

## Directory Structure

Tests are organized by the hook script they test, with fixtures co-located for better organization:

```
spec/
├── TESTING.md                      # This guide
├── spec_helper.sh                  # Common test utilities
├── lint-go/                        # Tests for lint-go.sh
│   ├── lint-go_spec.sh            # Test specifications
│   └── fixtures/                  # Test fixtures
│       ├── should-pass-clean-code/
│       │   ├── go.mod
│       │   ├── main.go
│       │   └── README            # Explains expected behavior
│       ├── should-fail-syntax-error/
│       ├── should-fail-interface-usage/
│       └── should-ignore-vendor/
├── test-go/
│   ├── test-go_spec.sh
│   └── fixtures/
│       ├── should-find-and-run-tests/
│       ├── should-pass-all-tests/
│       └── should-fail-with-errors/
└── smart-lint/
    ├── smart-lint_spec.sh
    └── fixtures/
        └── mixed-language-project/
```

## Important: Exit Code Behavior

Claude Code hooks use specific exit codes with important meanings:

- **Exit 0**: Continue with operation (no feedback to user)
- **Exit 1**: General error (missing dependencies, etc.)
- **Exit 2**: Provide feedback to user (BOTH for errors AND success messages!)

**CRITICAL**: Many hooks exit with code 2 even on success to provide positive feedback. For example:
- `smart-lint.sh` exits with 2 and shows "👉 Style clean. Continue with your task." when successful
- `smart-test.sh` exits with 2 and shows "👉 Tests pass. Continue with your task." when successful

In ShellSpec tests:
- Use `The status should equal 2` for success cases that provide feedback
- Use `The status should equal 0` only when the hook truly exits silently
- Check stderr output to differentiate between success and failure messages

## Fixture Naming Convention

Fixture directories should be named to indicate their expected behavior:

- `should-pass-*` - Expected to succeed (may exit 0 or 2 with success message)
- `should-fail-*` - Expected to fail (exit 2 with error message)
- `should-ignore-*` - Expected to be skipped/ignored (exit 0)
- `should-warn-*` - Expected to produce warnings but pass

## Test Pattern Reference

### Basic Test Structure

```bash
#!/usr/bin/env bash

# Source the spec helper
# shellcheck disable=SC1091
source "$(dirname "$0")/../spec_helper.sh"

Describe 'hook-name.sh'
    Describe 'Feature Group'
        It 'performs expected behavior'
            # Test implementation
        End
    End
End
```

### Setting Up Fixtures

Always use a clean temporary directory for each test:

```bash
Describe 'lint-go.sh'
    BeforeEach 'setup_test_with_fixture "lint-go" "should-pass-clean-code"'
    AfterEach 'cleanup_test'
    
    It 'passes clean Go code'
        When run run_hook_with_json "lint-go.sh" "$(create_edit_json "main.go")"
        The status should equal 0
        The output should equal ""
    End
End
```

### Common Test Patterns

#### 1. Testing Hook Mode (JSON Input)

```bash
It 'processes PostToolUse Edit events'
    json=$(create_post_tool_use_json "Edit" "test.go")
    When run run_hook_with_json "lint-go.sh" "$json"
    The status should equal 0
End

It 'ignores non-Go files'
    json=$(create_post_tool_use_json "Edit" "test.py")
    When run run_hook_with_json "lint-go.sh" "$json"
    The status should equal 0
    The output should equal ""
End
```

#### 2. Testing CLI Mode

```bash
It 'accepts --debug flag'
    When run "$HOOKS_DIR/smart-test.sh" --debug
    The status should equal 0
    The stderr should include "[DEBUG]"
End
```

#### 3. Testing Error Conditions

```bash
It 'fails on syntax errors'
    When run run_hook_with_json "lint-go.sh" "$(create_edit_json "broken.go")"
    The status should equal 2
    The stderr should include "syntax error"
End
```

#### 4. Testing with Mock Commands

```bash
It 'handles missing dependencies gracefully'
    hide_command "golangci-lint"
    hide_command "gofmt"
    
    When run run_hook_with_json "lint-go.sh" "$(create_edit_json "main.go")"
    The status should equal 0
    The stderr should include "No Go linting tools available"
End
```

#### 5. Testing Configuration

```bash
It 'respects ignore patterns'
    create_ignore_file "*.generated.go"
    
    When run run_hook_with_json "lint-go.sh" "$(create_edit_json "api.generated.go")"
    The status should equal 0
End
```

### Helper Functions (from spec_helper.sh)

#### Test Setup
- `setup_test_with_fixture <hook-name> <fixture-name>` - Set up test with specific fixture
- `cleanup_test` - Clean up test environment
- `create_temp_dir` - Create isolated temporary directory

#### JSON Creation
- `create_post_tool_use_json <tool> <file>` - Create PostToolUse event JSON
- `create_edit_json <file>` - Shorthand for Edit tool JSON
- `create_write_json <file>` - Shorthand for Write tool JSON

#### File Creation
- `create_go_file <name> [content]` - Create Go file with boilerplate
- `create_python_file <name> [content]` - Create Python file
- `create_ignore_file <patterns...>` - Create .claude-hooks-ignore file

#### Command Mocking
- `mock_command <name> <exit_code> [output]` - Create mock command
- `hide_command <name>` - Make command "not found"

#### Hook Execution
- `run_hook_with_json <hook> <json>` - Run hook with JSON input
- `get_hook_exit_code` - Get actual exit code (handles set -e)

## ShellSpec Syntax Quick Reference

### Assertions

```bash
# Status assertions
The status should equal 0
The status should not equal 0
The status should be success    # 0
The status should be failure    # non-zero

# Output assertions
The output should equal "expected"
The output should include "substring"
The output should match pattern "^prefix.*suffix$"
The output should be blank

# Stderr assertions  
The stderr should include "error"
The stderr should be present

# File assertions
The file "test.txt" should be exist
The file "test.txt" should be empty
The directory "src" should be exist
```

### Skipping Tests

```bash
Skip if "missing dependency" ! command_exists "go"
Pending "not implemented yet"
Todo "future test case"
```

### Parameterized Tests

```bash
Describe 'file type detection'
    Parameters
        "test.go"     "go"
        "test.py"     "python"
        "test.js"     "javascript"
    End
    
    It "detects $1 as $2"
        When call detect_file_type "$1"
        The output should equal "$2"
    End
End
```

## Creating New Test Fixtures

### 1. Minimal Go Project

```bash
mkdir -p spec/lint-go/fixtures/should-pass-clean-code
cd spec/lint-go/fixtures/should-pass-clean-code

# Create go.mod
cat > go.mod << 'EOF'
module github.com/test/example
go 1.21
EOF

# Create main.go
cat > main.go << 'EOF'
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
EOF

# Create README
cat > README << 'EOF'
This fixture contains clean Go code that should pass all linting checks.
Expected: exit 0, no output
EOF
```

### 2. Project with Test Files

```bash
mkdir -p spec/test-go/fixtures/should-pass-all-tests
cd spec/test-go/fixtures/should-pass-all-tests

# Create go.mod
cat > go.mod << 'EOF'
module github.com/test/calculator
go 1.21
EOF

# Create calculator.go
cat > calculator.go << 'EOF'
package calculator

func Add(a, b int) int {
    return a + b
}
EOF

# Create calculator_test.go
cat > calculator_test.go << 'EOF'
package calculator

import "testing"

func TestAdd(t *testing.T) {
    if Add(2, 3) != 5 {
        t.Error("2 + 3 should equal 5")
    }
}
EOF
```

## Best Practices

1. **Always use fixtures** - Don't create test files dynamically in tests
2. **Document expected behavior** - Include README in each fixture
3. **Test both success and failure** - Cover happy path and error cases
4. **Mock external commands** - Don't depend on system tools in tests
5. **Keep tests focused** - One behavior per test
6. **Use descriptive names** - Both for tests and fixtures
7. **Clean up after tests** - Always use BeforeEach/AfterEach
8. **Avoid race conditions** - Use unique names for temp files

## Common Pitfalls

1. **Don't use `set -e` in test files** - It interferes with status checking
2. **Quote JSON properly** - Use single quotes or heredocs for JSON
3. **Handle special characters** - Use printf instead of echo for mock output
4. **Check working directory** - Some tests may change directories
5. **Consider PATH changes** - Mock commands must be in PATH

## Running Tests

```bash
# Run all tests
make test

# Run specific test file
shellspec spec/lint-go/lint-go_spec.sh

# Run with documentation format
shellspec -f d

# Run specific test by pattern
shellspec -e "processes PostToolUse"

# Debug mode
SHELLSPEC_DEBUG=1 shellspec

# Run with debug formatter (shows full stdout/stderr)
shellspec spec/lint-go/lint-go_spec.sh -f debug
```

## Debugging Failed Tests

### Using the Dump Helper

When tests fail unexpectedly, use ShellSpec's `Dump` helper to see the actual output:

```bash
It 'runs tests successfully'
    When run run_hook_with_json "smart-test.sh" "$json"
    Dump  # Shows stdout, stderr, and exit status
    The status should equal 0
End
```

The `Dump` directive prints:
- The actual stdout captured
- The actual stderr captured  
- The exit status
- Any additional file descriptors used

**Important**: Sometimes adding `Dump` can affect test execution timing or state. If a test suddenly starts passing after adding `Dump`, this might indicate:
- A race condition in the test
- ShellSpec caching issues
- Stdout/stderr buffering issues

### Using Debug Logging in Hooks

For easier debugging, add strategic debug logging to hooks:

```bash
log_debug "Processing file: $FILE_PATH"
log_debug "Current directory: $(pwd)"
```

Then create a test helper to enable debug mode:

```bash
# In spec_helper.sh
run_hook_with_json_debug() {
    local hook="$1"
    local json="$2"
    echo "$json" | CLAUDE_HOOKS_DEBUG=1 "$HOOK_DIR/$hook" 2>&1
}
```

This combines stdout and stderr, making debug output visible in tests.