#!/usr/bin/env bash
# spec_helper.sh - Common test helpers and mocks for ShellSpec tests
# shellcheck disable=SC2317  # Functions are called by ShellSpec framework

# Set strict mode for tests
set -euo pipefail

# Get the directory paths
SPEC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_DIR="$(dirname "$SPEC_DIR")"

# Export common variables
export HOOK_DIR
export HOOKS_DIR="$HOOK_DIR"

# ============================================================================
# MOCK COMMANDS
# ============================================================================

# Create a temporary directory for test files
create_test_dir() {
    local tmpdir
    tmpdir=$(mktemp -d)
    echo "$tmpdir"
}

# Note: mock_command is defined later in this file to use consistent mock directory
# The definition below (around line 115) uses $TEMP_DIR/.mocks which is more
# consistent with how the tests actually use mocks

# ============================================================================
# FIXTURE MANAGEMENT
# ============================================================================

# Set up test environment with a specific fixture
setup_test_with_fixture() {
    local hook_name="$1"
    local fixture_name="$2"
    local fixture_path="$SPEC_DIR/$hook_name/fixtures/$fixture_name"
    
    # Create temp directory
    TEMP_DIR="${SHELLSPEC_TMPBASE}/test-$$-${RANDOM}"
    mkdir -p "$TEMP_DIR"
    
    # Copy fixture if it exists
    if [[ -d "$fixture_path" ]]; then
        # Use find to copy all files including hidden ones, preserving permissions
        cp -rp "$fixture_path"/. "$TEMP_DIR/"
    else
        echo "Warning: Fixture not found: $fixture_path" >&2
    fi
    
    # Change to temp directory
    cd "$TEMP_DIR" || return 1
    
    # Export for cleanup
    export TEMP_DIR
}

# Clean up test environment
cleanup_test() {
    if [[ -n "${TEMP_DIR:-}" ]] && [[ -d "$TEMP_DIR" ]]; then
        cd "$SPEC_DIR" || return
        rm -rf "$TEMP_DIR"
    fi
    unset TEMP_DIR
}

# Create a mock command that captures arguments
mock_command_with_args() {
    local command="$1"
    local mock_dir="${SHELLSPEC_TMPBASE:-/tmp/shellspec.$$}"
    local args_file="${mock_dir}/${command}.args"
    
    # Ensure mock directory exists
    [[ -d "$mock_dir" ]] || mkdir -p "$mock_dir"
    
    # Create mock script
    cat > "${mock_dir}/${command}" << 'EOF'
#!/usr/bin/env bash
echo "$@" >> "${0}.args"
exit 0
EOF
    chmod +x "${mock_dir}/${command}"
    
    # Add to PATH
    export PATH="${mock_dir}:$PATH"
    
    # Return the args file path
    echo "$args_file"
}

# Create a mock command that returns a specific exit code
mock_command() {
    local command="$1"
    local exit_code="${2:-0}"
    local output="${3:-}"
    
    # Create mock directory if it doesn't exist
    local mock_dir="$TEMP_DIR/.mocks"
    mkdir -p "$mock_dir"
    
    # Create args file path
    local args_file="${mock_dir}/${command}.args"
    
    # Create mock script
    cat > "${mock_dir}/${command}" << EOF
#!/usr/bin/env bash
# Mock for $command - auto-generated
echo "\$@" >> "$args_file"
${output:+echo "$output"}
exit $exit_code
EOF
    chmod +x "${mock_dir}/${command}"
    
    # Add to PATH - prepend to ensure mocks take precedence
    export PATH="${mock_dir}:$PATH"
}

# Create a mock command with specific output to stderr
mock_command_with_output() {
    local command="$1"
    local exit_code="$2"
    local output="$3"
    
    # Create mock directory if it doesn't exist
    local mock_dir="$TEMP_DIR/.mocks"
    mkdir -p "$mock_dir"
    
    # Create args file path
    local args_file="${mock_dir}/${command}.args"
    
    # Create mock script
    cat > "${mock_dir}/${command}" << EOF
#!/usr/bin/env bash
# Mock for $command with output - auto-generated
echo "\$@" >> "$args_file"
echo "$output" >&2
exit $exit_code
EOF
    chmod +x "${mock_dir}/${command}"
    
    # Add to PATH
    export PATH="${mock_dir}:$PATH"
}

# Create a mock command with specific output to stdout
mock_command_stdout() {
    local command="$1"
    local exit_code="${2:-0}"
    local output="${3:-}"
    
    # Create mock directory if it doesn't exist
    local mock_dir="$TEMP_DIR/.mocks"
    mkdir -p "$mock_dir"
    
    # Create args file path
    local args_file="${mock_dir}/${command}.args"
    
    # Create mock script
    {
        echo '#!/usr/bin/env bash'
        echo "# Mock for $command with stdout - auto-generated"
        echo "echo \"\$@\" >> \"$args_file\""
        # Use printf to avoid any interpretation issues
        printf "printf '%%s\\n' '%s'\n" "$output"
        echo "exit $exit_code"
    } > "${mock_dir}/${command}"
    chmod +x "${mock_dir}/${command}"
    
    # Add to PATH
    export PATH="${mock_dir}:$PATH"
}

# ============================================================================
# JSON HELPERS
# ============================================================================

# Create a PostToolUse JSON event
create_post_tool_use_json() {
    local tool="${1:-Edit}"
    local file_path="${2:-test.go}"
    local extra_fields="${3:-}"
    
    # If file_path is relative and the file exists, convert to absolute
    if [[ -n "$file_path" ]] && [[ ! "$file_path" =~ ^/ ]] && [[ -f "$file_path" ]]; then
        file_path=$(realpath "$file_path")
    fi
    
    local json='{"hook_event_name":"PostToolUse","tool_name":"'$tool'"'
    
    if [[ -n "$file_path" ]]; then
        json+=',"tool_input":{"file_path":"'$file_path'"'
        if [[ -n "$extra_fields" ]]; then
            json+=",$extra_fields"
        fi
        json+='}'
    elif [[ -n "$extra_fields" ]]; then
        json+=',"tool_input":{'$extra_fields'}'
    else
        json+=',"tool_input":{}'
    fi
    
    json+='}'
    echo "$json"
}

# Create a non-PostToolUse JSON event
create_other_json_event() {
    local event="${1:-PreToolUse}"
    echo '{"hook_event_name":"'"$event"'","tool_name":"Edit","tool_input":{"file_path":"test.go"}}'
}

# ============================================================================
# FILE CREATION HELPERS
# ============================================================================

# Create a test file with given content
create_test_file() {
    local file="$1"
    local content="${2:-# test file}"
    
    local dir
    dir=$(dirname "$file")
    [[ -d "$dir" ]] || mkdir -p "$dir"
    
    echo "$content" > "$file"
}

# Create a Go test file
create_go_file() {
    local file="${1:-main.go}"
    cat > "$file" << 'EOF'
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
EOF
}

# Create a Python test file
create_python_file() {
    local file="${1:-main.py}"
    cat > "$file" << 'EOF'
def main():
    print("Hello, World!")

if __name__ == "__main__":
    main()
EOF
}

# Create a shell script
create_shell_file() {
    local file="${1:-script.sh}"
    cat > "$file" << 'EOF'
#!/usr/bin/env bash
echo "Hello, World!"
EOF
    chmod +x "$file"
}

# ============================================================================
# CONFIGURATION HELPERS
# ============================================================================

# Create a .claude-hooks-config.sh file
create_config_file() {
    local content="${1:-}"
    echo "$content" > .claude-hooks-config.sh
}

# Create a .claude-hooks-ignore file
create_ignore_file() {
    local content="${1:-}"
    echo "$content" > .claude-hooks-ignore
}

# ============================================================================
# ASSERTION HELPERS
# ============================================================================

# Check if output contains ANSI color codes
has_ansi_colors() {
    # Check for ANSI escape sequences (without the ESC character)
    [[ "${1:-}" =~ \[[0-9\;]+m ]] && return 0
    # Also check for the ESC character version
    [[ "${1:-}" =~ $'\033'\[[0-9\;]+m ]] && return 0
    return 1
}

# Strip ANSI color codes from output
strip_ansi() {
    local text="$1"
    # Use printf and sed for POSIX compatibility
    printf '%s\n' "$text" | sed 's/\x1b\[[0-9;]*m//g'
}

# ============================================================================
# HOOK EXECUTION HELPERS
# ============================================================================

# Run a hook with JSON input
run_hook_with_json() {
    local hook="$1"
    local json="$2"
    echo "$json" | "$HOOK_DIR/$hook"
}

# Run a hook with JSON input and debug enabled
run_hook_with_json_debug() {
    local hook="$1"
    local json="$2"
    echo "$json" | CLAUDE_HOOKS_DEBUG=1 "$HOOK_DIR/$hook" 2>&1
}

# Run a hook with JSON input in test mode (shows output even on success)
run_hook_with_json_test_mode() {
    local hook="$1"
    local json="$2"
    echo "$json" | CLAUDE_HOOKS_TEST_MODE=1 "$HOOK_DIR/$hook"
}

# Run a hook in CLI mode
run_hook_cli() {
    local hook="$1"
    shift
    "$HOOK_DIR/$hook" "$@" 2>&1 || true
}

# Get exit code from hook execution
get_hook_exit_code() {
    local hook="$1"
    local input="${2:-}"
    local exit_code
    
    # Temporarily disable set -e to capture exit codes
    set +e
    if [[ -n "$input" ]]; then
        echo "$input" | "$HOOK_DIR/$hook" >/dev/null 2>&1
        exit_code=$?
    else
        "$HOOK_DIR/$hook" >/dev/null 2>&1
        exit_code=$?
    fi
    set -e
    
    printf '%s\n' "$exit_code"
}

# ============================================================================
# CLEANUP
# ============================================================================

# Hide a command by creating a mock that fails
hide_command() {
    local command="$1"
    local mock_dir="${SHELLSPEC_TMPBASE:-/tmp/shellspec.$$}"
    
    # Ensure mock directory exists
    [[ -d "$mock_dir" ]] || mkdir -p "$mock_dir"
    
    # Create a mock that fails
    {
        echo '#!/usr/bin/env bash'
        echo "echo \"$command not found\" >&2"
        echo "exit 127"
    } > "${mock_dir}/${command}"
    chmod +x "${mock_dir}/${command}"
    
    # Add to PATH
    export PATH="${mock_dir}:$PATH"
}

# Clean up function to be called after each test
cleanup_test_env() {
    # Remove any mock commands from PATH
    local mock_dir="${SHELLSPEC_TMPBASE:-/tmp/shellspec.$$}"
    if [[ -n "$mock_dir" ]] && [[ "$PATH" == *"$mock_dir"* ]]; then
        export PATH="${PATH//${mock_dir}:/}"
    fi
    
    # Reset environment variables
    unset CLAUDE_HOOKS_DEBUG
    unset CLAUDE_HOOKS_LINT_ON_EDIT
    unset CLAUDE_HOOKS_TEST_ON_EDIT
    unset CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS
    unset CLAUDE_HOOKS_GO_DEADCODE_ENABLED
    
    # Return to spec directory
    cd "$SPEC_DIR" || true
}
