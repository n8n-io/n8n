#!/usr/bin/env bash
# smart-test.sh - Automatically run tests for files edited by Claude Code
#
# SYNOPSIS
#   PostToolUse hook that runs relevant tests when files are edited
#
# DESCRIPTION
#   When Claude edits a file, this hook intelligently runs associated tests:
#   - Focused tests for the specific file
#   - Package-level tests (with optional race detection)
#   - Full project tests (optional)
#   - Integration tests (if available)
#   - Configurable per-project via .claude-hooks-config.sh
#
# CONFIGURATION
#   CLAUDE_HOOKS_TEST_ON_EDIT - Enable/disable (default: true)
#   CLAUDE_HOOKS_TEST_MODES - Comma-separated: focused,package,all,integration
#   CLAUDE_HOOKS_ENABLE_RACE - Enable race detection (default: true)
#   CLAUDE_HOOKS_FAIL_ON_MISSING_TESTS - Fail if test file missing (default: false)

# Don't use set -e as we need to control exit codes
set -uo pipefail

# Debug trap (disabled)
# trap 'echo "DEBUG: Error on line $LINENO" >&2' ERR

# Source common helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common-helpers.sh"

# Override add_error to also print immediately
add_error() {
    local message="$1"
    CLAUDE_HOOKS_ERROR_COUNT+=1
    CLAUDE_HOOKS_ERRORS+=("${RED}❌${NC} $message")
    # Print error immediately to stderr so tests can capture it
    echo -e "${RED}❌${NC} $message" >&2
}


# ============================================================================
# CONFIGURATION LOADING
# ============================================================================

load_config() {
    # Global defaults
    export CLAUDE_HOOKS_TEST_ON_EDIT="${CLAUDE_HOOKS_TEST_ON_EDIT:-true}"
    export CLAUDE_HOOKS_TEST_MODES="${CLAUDE_HOOKS_TEST_MODES:-package}"
    export CLAUDE_HOOKS_ENABLE_RACE="${CLAUDE_HOOKS_ENABLE_RACE:-true}"
    export CLAUDE_HOOKS_FAIL_ON_MISSING_TESTS="${CLAUDE_HOOKS_FAIL_ON_MISSING_TESTS:-false}"
    export CLAUDE_HOOKS_TEST_VERBOSE="${CLAUDE_HOOKS_TEST_VERBOSE:-false}"
    
    # Project command configuration
    export CLAUDE_HOOKS_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_USE_PROJECT_COMMANDS:-true}"
    export CLAUDE_HOOKS_MAKE_TEST_TARGETS="${CLAUDE_HOOKS_MAKE_TEST_TARGETS:-test}"
    export CLAUDE_HOOKS_SCRIPT_TEST_NAMES="${CLAUDE_HOOKS_SCRIPT_TEST_NAMES:-test}"
    
    # Per-language project command opt-out
    export CLAUDE_HOOKS_GO_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_GO_USE_PROJECT_COMMANDS:-true}"
    export CLAUDE_HOOKS_PYTHON_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_PYTHON_USE_PROJECT_COMMANDS:-true}"
    export CLAUDE_HOOKS_JAVASCRIPT_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_JAVASCRIPT_USE_PROJECT_COMMANDS:-true}"
    export CLAUDE_HOOKS_RUST_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_RUST_USE_PROJECT_COMMANDS:-true}"
    export CLAUDE_HOOKS_NIX_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_NIX_USE_PROJECT_COMMANDS:-true}"
    export CLAUDE_HOOKS_SHELL_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_SHELL_USE_PROJECT_COMMANDS:-true}"
    export CLAUDE_HOOKS_TILT_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_TILT_USE_PROJECT_COMMANDS:-true}"
    
    # Load project config
    load_project_config
    
    # Debug output to verify config loaded
    log_debug "After loading config, CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS='${CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS:-}'"
    
    # Quick exit if disabled
    if [[ "$CLAUDE_HOOKS_TEST_ON_EDIT" != "true" ]]; then
        log_debug "Test on edit disabled, exiting"
        exit 0
    fi
}

# ============================================================================
# ARGUMENT PARSING
# ============================================================================

# This script only works as a Claude Code hook (JSON on stdin)
JSON_INPUT=""

# This script only works as a Claude Code hook - no CLI mode support

# ============================================================================
# HOOK INPUT PARSING
# ============================================================================

# Check for stdin input
if [ ! -t 0 ]; then
    log_debug "Input detected on stdin"
    # We have input on stdin - check if jq is available
    if ! command_exists jq; then
        log_error "jq is required for JSON parsing but not found"
        exit 1
    fi
    
    # Read stdin input
    JSON_INPUT=$(cat)
    log_debug "Read JSON input: ${JSON_INPUT:0:100}..."
    
    # Check if it's valid JSON
    if echo "$JSON_INPUT" | jq . >/dev/null 2>&1; then
        log_debug "Valid JSON detected"
        
        # Extract relevant fields from the JSON
        EVENT=$(echo "$JSON_INPUT" | jq -r '.hook_event_name // empty')
        TOOL_NAME=$(echo "$JSON_INPUT" | jq -r '.tool_name // empty')
        TOOL_INPUT=$(echo "$JSON_INPUT" | jq -r '.tool_input // empty')
        
        log_debug "Parsed JSON - Event: $EVENT, Tool: $TOOL_NAME"
        
        # Only process edit-related tools
        if [[ "$EVENT" == "PostToolUse" ]] && [[ "$TOOL_NAME" =~ ^(Edit|Write|MultiEdit)$ ]]; then
            log_debug "Processing edit tool: $TOOL_NAME"
            # Extract file path(s) that were edited
            if [[ "$TOOL_NAME" == "MultiEdit" ]]; then
                FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')
            else
                FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')
            fi
            
            log_debug "Extracted file path: $FILE_PATH"
            
            # Skip if no file path
            if [[ -z "$FILE_PATH" ]]; then
                log_debug "No file path found, exiting"
                # Exit silently - no file to test
                exit 0
            fi
        else
            log_debug "Not an edit operation (Event: $EVENT, Tool: $TOOL_NAME), exiting"
            # Not an edit operation - exit silently
            exit 0
        fi
    else
        log_error "Invalid JSON input provided"
        exit 1
    fi
else
    log_error "No JSON input provided. This hook only works with Claude Code."
    exit 1
fi

# Store original path and directory info
export ORIGINAL_FILE_PATH="$FILE_PATH"
export ORIGINAL_DIR=""

# Change to the directory of the file being edited (if it's a file)
if [[ -n "$FILE_PATH" ]] && [[ "$FILE_PATH" != "./..." ]]; then
    log_debug "Checking if file exists: $FILE_PATH"
    if [[ -f "$FILE_PATH" ]]; then
        FILE_DIR=$(dirname "$FILE_PATH")
        ORIGINAL_DIR="$FILE_DIR"
        log_debug "Changing to directory: $FILE_DIR"
        cd "$FILE_DIR" || log_debug "Failed to change to directory: $FILE_DIR"
        log_debug "Changed to file directory: $(pwd)"
        # Update FILE_PATH to just the filename after changing directories
        FILE_PATH=$(basename "$FILE_PATH")
        log_debug "Updated FILE_PATH to basename: $FILE_PATH"
    else
        log_debug "File does not exist: $FILE_PATH"
    fi
else
    log_debug "FILE_PATH is empty or './...'"
fi

# Load configuration
load_config

# ============================================================================
# TEST EXCLUSION PATTERNS
# ============================================================================

# Note: This function is currently unused but kept for future use
# shellcheck disable=SC2317
should_skip_test_requirement() {
    local file="$1"
    local base
    base=$(basename "$file")
    local dir
    dir=$(dirname "$file")
    
    # Files that typically don't have tests
    local skip_patterns=(
        "main.go"           # Entry points
        "doc.go"            # Package documentation
        "*_generated.go"    # Generated code
        "*_string.go"       # Stringer generated
        "*.pb.go"           # Protocol buffer generated
        "*.pb.gw.go"        # gRPC gateway generated
        "bindata.go"        # Embedded assets
        "migrations/*.go"   # Database migrations
    )
    
    # Check patterns
    for pattern in "${skip_patterns[@]}"; do
        if [[ "$base" == "$pattern" ]]; then
            return 0
        fi
    done
    
    # Skip if in specific directories
    if [[ "$dir" =~ /(vendor|testdata|examples|cmd/[^/]+|gen|generated|.gen)(/|$) ]]; then
        return 0
    fi
    
    # Skip if it's a test file itself (will be handled differently)
    if [[ "$file" =~ _test\.(go|py|js|ts)$ ]]; then
        return 0
    fi
    
    return 1
}

# ============================================================================
# TEST OUTPUT FORMATTING
# ============================================================================

format_test_output() {
    local output="$1"
    # test_type parameter removed as it was unused
    
    # If output is empty, say so
    if [[ -z "$output" ]]; then
        echo "(no output captured)"
        return
    fi
    
    # Show the full output - no truncation when tests fail
    echo "$output"
}

# ============================================================================
# TEST RUNNERS BY LANGUAGE
# ============================================================================

# Source language-specific testing functions
# Use SCRIPT_DIR which was already set correctly at the top of the script

# Source Go testing if available
if [[ -f "${SCRIPT_DIR}/test-go.sh" ]]; then
    source "${SCRIPT_DIR}/test-go.sh"
fi

# Source Tilt testing if available
if [[ -f "${SCRIPT_DIR}/test-tilt.sh" ]]; then
    source "${SCRIPT_DIR}/test-tilt.sh"
fi


run_python_tests() {
    local file="$1"
    local dir
    dir=$(dirname "$file")
    local base
    base=$(basename "$file" .py)
    
    # Check if the file should be skipped
    if should_skip_file "$file"; then
        log_debug "Skipping tests for $file due to .claude-hooks-ignore"
        export CLAUDE_HOOKS_FILE_SKIPPED=true
        return 0
    fi
    
    # If this IS a test file, run it directly
    if [[ "$file" =~ (test_.*|.*_test)\.py$ ]]; then
        log_debug "🧪 Running test file directly: $file"
        local test_output
        if command -v pytest >/dev/null 2>&1; then
            if ! test_output=$(
                pytest -xvs "$file" 2>&1); then
                # Output test failures directly without preamble
                format_test_output "$test_output" >&2
                return 1
            fi
        elif command -v python >/dev/null 2>&1; then
            if ! test_output=$(
                python -m unittest "$file" 2>&1); then
                # Output test failures directly without preamble
                format_test_output "$test_output" >&2
                return 1
            fi
        fi
        log_debug "✅ Tests passed in $file"
        return 0
    fi
    
    # Check if we should require tests
    local require_tests=true
    # Python files that typically don't need tests
    if [[ "$base" =~ ^(__init__|__main__|setup|setup.py|conf|config|settings)$ ]]; then
        require_tests=false
    fi
    if [[ "$dir" =~ /(migrations|scripts|docs|examples)(/|$) ]]; then
        require_tests=false
    fi
    
    # Check if test finding should be relaxed
    if [[ "${CLAUDE_HOOKS_FAIL_ON_MISSING_TESTS:-false}" == "false" ]]; then
        require_tests=false
    fi
    
    # Find test file
    local test_file=""
    local test_candidates=(
        "${dir}/test_${base}.py"
        "${dir}/${base}_test.py"
        "${dir}/tests/test_${base}.py"
        "${dir}/../tests/test_${base}.py"
    )
    
    for candidate in "${test_candidates[@]}"; do
        if [[ -f "$candidate" ]]; then
            test_file="$candidate"
            break
        fi
    done
    
    local failed=0
    local tests_run=0
    
    # Parse test modes
    IFS=',' read -ra TEST_MODES <<< "$CLAUDE_HOOKS_TEST_MODES"
    
    for mode in "${TEST_MODES[@]}"; do
        mode=$(echo "$mode" | xargs)
        
        case "$mode" in
            "focused")
                if [[ -n "$test_file" ]]; then
                    log_debug "🧪 Running focused tests for $base..."
                    tests_run=$((tests_run + 1))
                    
                    local test_output
                    if command -v pytest >/dev/null 2>&1; then
                        if ! test_output=$(
                            pytest -xvs "$test_file" -k "$base" 2>&1); then
                            failed=1
                            # Output test failures directly
                            format_test_output "$test_output" >&2
                            add_error "Focused tests failed for $base"
                        fi
                    elif command -v python >/dev/null 2>&1; then
                        if ! test_output=$(
                            python -m unittest "$test_file" 2>&1); then
                            failed=1
                            # Output test failures directly
                            format_test_output "$test_output" >&2
                            add_error "Focused tests failed for $base"
                        fi
                    fi
                elif [[ "$require_tests" == "true" ]]; then
                    echo -e "${RED}❌ Missing required test file for: $file${NC}" >&2
                    echo -e "${YELLOW}📝 Expected one of: ${test_candidates[*]}${NC}" >&2
                    add_error "Missing required test file for: $file"
                    return 2
                fi
                ;;
                
            "package")
                log_debug "📦 Running package tests in $dir..."
                tests_run=$((tests_run + 1))
                
                if command -v pytest >/dev/null 2>&1; then
                    local test_output
                    if ! test_output=$(
                        pytest -xvs "$dir" 2>&1); then
                        failed=1
                        # Output test failures directly
                        format_test_output "$test_output" >&2
                        add_error "Package tests failed in $dir"
                    fi
                fi
                ;;
        esac
    done
    
    # Summary
    if [[ $tests_run -eq 0 && "$require_tests" == "true" && -z "$test_file" ]]; then
        echo -e "${RED}❌ No tests found for $file (tests required)${NC}" >&2
        add_error "No tests found for $file (tests required)"
        return 2
    elif [[ $tests_run -eq 0 && -z "$test_file" ]]; then
        echo -e "${YELLOW}⚠️  No test files found for $file${NC}" >&2
    elif [[ $failed -eq 0 && $tests_run -gt 0 ]]; then
        log_debug "All tests passed for $file"
    fi
    
    return $failed
}

run_javascript_tests() {
    local file="$1"
    local dir
    dir=$(dirname "$file")
    local base
    base=$(basename "$file" | sed 's/\.[tj]sx\?$//' | sed 's/\.(test|spec)$//')
    
    # Check if the file should be skipped
    if should_skip_file "$file"; then
        log_debug "Skipping tests for $file due to .claude-hooks-ignore"
        export CLAUDE_HOOKS_FILE_SKIPPED=true
        return 0
    fi
    
    # If this IS a test file, run it directly
    if [[ "$file" =~ \.(test|spec)\.[tj]sx?$ ]]; then
        log_debug "🧪 Running test file directly: $file"
        
        local test_output
        if [[ -f "package.json" ]] && jq -e '.scripts.test' package.json >/dev/null 2>&1; then
            if ! test_output=$(
                npm test -- "$file" 2>&1); then
                # Output test failures directly without preamble
                format_test_output "$test_output" >&2
                return 1
            fi
        elif command -v jest >/dev/null 2>&1; then
            if ! test_output=$(
                jest "$file" 2>&1); then
                # Output test failures directly without preamble
                format_test_output "$test_output" >&2
                return 1
            fi
        fi
        log_debug "✅ Tests passed in $file"
        return 0
    fi
    
    # Check if we should require tests
    local require_tests=true
    # JS/TS files that typically don't need tests
    if [[ "$base" =~ ^(index|main|app|config|setup|webpack\.config|rollup\.config|vite\.config)$ ]]; then
        require_tests=false
    fi
    if [[ "$dir" =~ /(dist|build|node_modules|coverage|docs|examples|scripts)(/|$) ]]; then
        require_tests=false
    fi
    # Skip declaration files
    if [[ "$file" =~ \.d\.ts$ ]]; then
        require_tests=false
    fi
    
    # Check if test finding should be relaxed
    if [[ "${CLAUDE_HOOKS_FAIL_ON_MISSING_TESTS:-false}" == "false" ]]; then
        require_tests=false
    fi
    
    # Find test file
    local test_file=""
    local test_candidates=(
        "${dir}/${base}.test.js"
        "${dir}/${base}.spec.js"
        "${dir}/${base}.test.ts"
        "${dir}/${base}.spec.ts"
        "${dir}/${base}.test.jsx"
        "${dir}/${base}.test.tsx"
        "${dir}/__tests__/${base}.test.js"
        "${dir}/__tests__/${base}.spec.js"
        "${dir}/__tests__/${base}.test.ts"
    )
    
    for candidate in "${test_candidates[@]}"; do
        if [[ -f "$candidate" ]]; then
            test_file="$candidate"
            break
        fi
    done
    
    local failed=0
    local tests_run=0
    
    # Check if package.json has test script
    if [[ -f "package.json" ]] && jq -e '.scripts.test' package.json >/dev/null 2>&1; then
        # Parse test modes
        IFS=',' read -ra TEST_MODES <<< "$CLAUDE_HOOKS_TEST_MODES"
        
        for mode in "${TEST_MODES[@]}"; do
            mode=$(echo "$mode" | xargs)
            
            case "$mode" in
                "focused")
                    if [[ -n "$test_file" ]]; then
                        log_debug "🧪 Running focused tests for $base..."
                        tests_run=$((tests_run + 1))
                        
                        local test_output
                        if ! test_output=$(
                            npm test -- "$test_file" 2>&1); then
                            failed=1
                            # Output test failures directly
                            format_test_output "$test_output" >&2
                            add_error "Focused tests failed for $base"
                        fi
                    elif [[ "$require_tests" == "true" ]]; then
                        echo -e "${RED}❌ Missing required test file for: $file${NC}" >&2
                        echo -e "${YELLOW}📝 Expected one of: ${test_candidates[*]}${NC}" >&2
                        add_error "Missing required test file for: $file"
                        return 2
                    fi
                    ;;
                    
                "package")
                    log_debug "📦 Running all tests..."
                    tests_run=$((tests_run + 1))
                    
                    local test_output
                    if ! test_output=$(
                        npm test 2>&1); then
                        failed=1
                        # Output test failures directly
                        format_test_output "$test_output" >&2
                        add_error "Package tests failed"
                    fi
                    ;;
            esac
        done
    elif [[ "$require_tests" == "true" && -z "$test_file" ]]; then
        if ! command -v pytest >/dev/null 2>&1 && ! command -v python >/dev/null 2>&1; then
            echo -e "${RED}❌ pytest not found and no Python interpreter available${NC}" >&2
            add_error "pytest not found and no Python interpreter available"
        else
            echo -e "${RED}❌ No test runner configured and no tests found${NC}" >&2
            add_error "No test runner configured and no tests found"
        fi
        return 2
    fi
    
    # Summary
    if [[ $tests_run -eq 0 && "$require_tests" == "true" && -z "$test_file" ]]; then
        echo -e "${RED}❌ No tests found for $file (tests required)${NC}" >&2
        add_error "No tests found for $file (tests required)"
        return 2
    elif [[ $tests_run -eq 0 && -z "$test_file" ]]; then
        echo -e "${YELLOW}⚠️  No test files found for $file${NC}" >&2
    elif [[ $failed -eq 0 && $tests_run -gt 0 ]]; then
        log_debug "All tests passed for $file"
    fi
    
    return $failed
}

run_shell_tests() {
    local file="$1"
    local dir
    dir=$(dirname "$file")
    local base
    base=$(basename "$file" .sh)
    
    # Check if the file should be skipped
    if should_skip_file "$file"; then
        log_debug "Skipping tests for $file due to .claude-hooks-ignore"
        export CLAUDE_HOOKS_FILE_SKIPPED=true
        return 0
    fi
    
    # If this IS a test file, run it directly
    if [[ "$file" =~ \.(test|spec)\.sh$ ]] || [[ "$file" =~ _test\.sh$ ]]; then
        log_debug "🧪 Running test file directly: $file"
        local test_output
        
        # Check if it's a shellspec test
        if [[ -f ".shellspec" ]] && command -v shellspec >/dev/null 2>&1; then
            if ! test_output=$(shellspec "$file" 2>&1); then
                format_test_output "$test_output" >&2
                return 1
            fi
        else
            # Run as regular shell script test
            if ! test_output=$(bash "$file" 2>&1); then
                format_test_output "$test_output" >&2
                return 1
            fi
        fi
        log_debug "✅ Tests passed in $file"
        return 0
    fi
    
    # Check if we should require tests
    local require_tests=true
    # Shell files that typically don't need tests
    if [[ "$base" =~ ^(install|setup|init|config|.*\.config)$ ]]; then
        require_tests=false
    fi
    # Check using original directory path if available
    log_debug "Checking if tests required - ORIGINAL_DIR='$ORIGINAL_DIR', dir='$dir'"
    if [[ -n "$ORIGINAL_DIR" ]] && [[ "$ORIGINAL_DIR" =~ (scripts|bin|examples|docs|hooks)(/|$) ]]; then
        log_debug "Tests not required - file is in $ORIGINAL_DIR"
        require_tests=false
        echo -e "${YELLOW}⚠️  Scripts don't require tests${NC}" >&2
    elif [[ "$dir" =~ /(scripts|bin|examples|docs|hooks)(/|$) ]]; then
        log_debug "Tests not required - file is in $dir" 
        require_tests=false
        echo -e "${YELLOW}⚠️  Scripts don't require tests${NC}" >&2
    fi
    
    # Check if test finding should be relaxed
    if [[ "${CLAUDE_HOOKS_FAIL_ON_MISSING_TESTS:-false}" == "false" ]]; then
        require_tests=false
    fi
    
    # Find test file
    local test_file=""
    local test_candidates=(
        "${dir}/${base}_test.sh"
        "${dir}/${base}.test.sh"
        "${dir}/test_${base}.sh"
        "${dir}/spec/${base}_spec.sh"
        "${dir}/tests/${base}_test.sh"
        "${dir}/../tests/${base}_test.sh"
    )
    
    for candidate in "${test_candidates[@]}"; do
        if [[ -f "$candidate" ]]; then
            test_file="$candidate"
            break
        fi
    done
    
    local failed=0
    local tests_run=0
    
    # Parse test modes
    IFS=',' read -ra TEST_MODES <<< "$CLAUDE_HOOKS_TEST_MODES"
    
    for mode in "${TEST_MODES[@]}"; do
        mode=$(echo "$mode" | xargs)
        
        case "$mode" in
            "focused")
                if [[ -n "$test_file" ]]; then
                    log_debug "🧪 Running focused tests for $base..."
                    tests_run=$((tests_run + 1))
                    
                    local test_output
                    # Check if it's a shellspec test
                    if [[ -f ".shellspec" ]] && command -v shellspec >/dev/null 2>&1; then
                        if ! test_output=$(shellspec "$test_file" 2>&1); then
                            failed=1
                            format_test_output "$test_output" >&2
                            add_error "Focused tests failed for $base"
                        fi
                    else
                        # Run as regular shell script test
                        if ! test_output=$(bash "$test_file" 2>&1); then
                            failed=1
                            format_test_output "$test_output" >&2
                            add_error "Focused tests failed for $base"
                        fi
                    fi
                elif [[ "$require_tests" == "true" ]]; then
                    echo -e "${RED}❌ Missing required test file for: $file${NC}" >&2
                    echo -e "${YELLOW}📝 Expected one of: ${test_candidates[*]}${NC}" >&2
                    add_error "Missing required test file for: $file"
                    return 2
                fi
                ;;
                
            "package")
                # For shell scripts, run all tests in the directory
                if [[ -f ".shellspec" ]] && command -v shellspec >/dev/null 2>&1; then
                    log_debug "📦 Running all shellspec tests..."
                    tests_run=$((tests_run + 1))
                    
                    local test_output
                    if ! test_output=$(shellspec 2>&1); then
                        failed=1
                        format_test_output "$test_output" >&2
                        add_error "Package tests failed"
                    fi
                elif [[ -d "${dir}/tests" ]] || [[ -d "${dir}/spec" ]]; then
                    log_debug "📦 Running all tests in test directory..."
                    tests_run=$((tests_run + 1))
                    
                    local test_dir="${dir}/tests"
                    [[ -d "${dir}/spec" ]] && test_dir="${dir}/spec"
                    
                    local test_output
                    if ! test_output=$(
                        find "$test_dir" -name "*_test.sh" -o -name "*_spec.sh" -o -name "*.test.sh" | \
                        while read -r test; do
                            echo "Running: $test" >&2
                            bash "$test" || exit 1
                        done 2>&1
                    ); then
                        failed=1
                        format_test_output "$test_output" >&2
                        add_error "Package tests failed"
                    fi
                fi
                ;;
        esac
    done
    
    # Summary
    if [[ $tests_run -eq 0 && "$require_tests" == "true" && -z "$test_file" ]]; then
        echo -e "${RED}❌ No tests found for $file (tests required)${NC}" >&2
        add_error "No tests found for $file (tests required)"
        return 2
    elif [[ $tests_run -eq 0 && -z "$test_file" ]]; then
        echo -e "${YELLOW}⚠️  No test files found for $file${NC}" >&2
    elif [[ $failed -eq 0 && $tests_run -gt 0 ]]; then
        log_debug "All tests passed for $file"
    fi
    
    return $failed
}

# ============================================================================
# RUST TEST SUPPORT
# ============================================================================

run_rust_tests() {
    local file="$1"
    local dir
    dir=$(dirname "$file")
    local base
    base=$(basename "$file" .rs)
    
    # Check if the file should be skipped
    if should_skip_file "$file"; then
        log_debug "Skipping tests for $file due to .claude-hooks-ignore"
        export CLAUDE_HOOKS_FILE_SKIPPED=true
        return 0
    fi
    
    # If this IS a test file, run it directly
    if [[ "$file" =~ _test\.rs$ ]] || [[ "$file" =~ /tests/.*\.rs$ ]]; then
        log_debug "🧪 Running test file directly: $file"
        local test_output
        if ! test_output=$(cargo test --manifest-path "$dir/Cargo.toml" 2>&1); then
            format_test_output "$test_output" >&2
            return 1
        fi
        log_debug "✅ Tests passed in $file"
        return 0
    fi
    
    # Check if we should require tests
    local require_tests=true
    # Rust files that typically don't need tests
    if [[ "$base" =~ ^(main|build|lib)$ ]]; then
        require_tests=false
    fi
    if [[ "$dir" =~ /(target|examples|benches)(/|$) ]]; then
        require_tests=false
    fi
    
    local failed=0
    local tests_run=0
    
    # Parse test modes
    IFS=',' read -ra TEST_MODES <<< "$CLAUDE_HOOKS_TEST_MODES"
    
    for mode in "${TEST_MODES[@]}"; do
        mode=$(echo "$mode" | xargs)
        
        case "$mode" in
            "focused")
                # For Rust, run tests in the current package
                if [[ -f "Cargo.toml" ]]; then
                    log_debug "🧪 Running focused tests for $base..."
                    tests_run=$((tests_run + 1))
                    
                    local test_output
                    if ! test_output=$(cargo test 2>&1); then
                        failed=1
                        format_test_output "$test_output" >&2
                        add_error "Focused tests failed for $base"
                    fi
                fi
                ;;
                
            "package")
                log_debug "📦 Running package tests..."
                tests_run=$((tests_run + 1))
                
                if [[ -f "Cargo.toml" ]]; then
                    local test_output
                    if ! test_output=$(cargo test 2>&1); then
                        failed=1
                        format_test_output "$test_output" >&2
                        add_error "Package tests failed"
                    fi
                fi
                ;;
        esac
    done
    
    # Summary
    if [[ $tests_run -eq 0 && "$require_tests" == "true" ]]; then
        echo -e "${RED}❌ No tests found for $file (tests required)${NC}" >&2
        add_error "No tests found for $file (tests required)"
        return 2
    elif [[ $tests_run -eq 0 ]]; then
        echo -e "${YELLOW}⚠️  No test files found for $file${NC}" >&2
    elif [[ $failed -eq 0 && $tests_run -gt 0 ]]; then
        log_debug "All tests passed for $file"
    fi
    
    return $failed
}

# ============================================================================
# PROJECT COMMAND INTEGRATION
# ============================================================================

# Try to use project-specific test command (make target or script)
try_project_test_command() {
    local file_path="$1"
    local language="$2"
    
    # Check if project commands are disabled globally
    if [[ "${CLAUDE_HOOKS_USE_PROJECT_COMMANDS:-true}" != "true" ]]; then
        log_debug "Project commands disabled globally"
        return 1
    fi
    
    # Check language-specific opt-out
    local opt_out_var="CLAUDE_HOOKS_${language^^}_USE_PROJECT_COMMANDS"
    if [[ "${!opt_out_var:-true}" != "true" ]]; then
        log_debug "Project commands disabled for $language"
        return 1
    fi
    
    # Get file directory (absolute path)
    local file_dir
    # Since we already cd'd to the file directory, file_path is just the basename
    # So we need to use PWD as the file directory
    file_dir="$PWD"
    
    # Find command root (Makefile or scripts/)
    local cmd_root
    cmd_root=$(find_project_command_root "$file_dir")
    if [[ -z "$cmd_root" ]]; then
        log_debug "No project command root found"
        return 1
    fi
    
    log_debug "Found project command root: $cmd_root"
    
    # Calculate relative path from command root to file
    local rel_path
    # Since we're already in the file's directory, file_path is just the basename
    # We need to calculate the path from command root to the current directory + filename
    if [[ "$cmd_root" == "$PWD" ]]; then
        # Command root is the current directory, just use the filename
        rel_path="$file_path"
    else
        # Calculate relative path from command root to current directory
        local dir_rel_path
        dir_rel_path=$(calculate_relative_path "$cmd_root" "$PWD")
        if [[ "$dir_rel_path" == "." ]]; then
            rel_path="$file_path"
        else
            rel_path="$dir_rel_path/$file_path"
        fi
    fi
    
    log_debug "Relative path from command root: $rel_path"
    
    # Get configured targets/scripts
    local config_output
    if ! config_output=$(get_project_command_config "test"); then
        log_debug "Failed to get project command config"
        return 1
    fi
    
    local make_targets
    local script_names
    make_targets=$(echo "$config_output" | head -1)
    script_names=$(echo "$config_output" | tail -1)
    
    # Try make targets first
    if [[ -f "$cmd_root/Makefile" ]]; then
        log_debug "Checking make targets: $make_targets"
        for target in $make_targets; do
            if check_make_target "$target" "$cmd_root"; then
                # Run make command with FILE argument
                local make_output
                local make_exit_code
                
                # Change to command root and run make
                if make_output=$(cd "$cmd_root" && make "$target" FILE="$rel_path" 2>&1); then
                    make_exit_code=0
                    log_debug "Make command succeeded"
                else
                    make_exit_code=$?
                    log_debug "Make command failed with exit code: $make_exit_code"
                fi
                
                # Output information if it failed OR if in test mode
                if [[ $make_exit_code -ne 0 ]] || [[ "${CLAUDE_HOOKS_TEST_MODE:-0}" == "1" ]]; then
                    log_info "🔨 Running 'make $target' from $cmd_root"
                    if [[ -n "$make_output" ]]; then
                        echo "$make_output" >&2
                    fi
                    if [[ $make_exit_code -ne 0 ]]; then
                        add_error "Tests failed (make $target)"
                    fi
                fi
                
                # Return 0 to indicate we found and ran the command (even if tests failed)
                return 0
            fi
        done
    fi
    
    # Try scripts if no make target worked
    if [[ -d "$cmd_root/scripts" ]]; then
        log_debug "Checking scripts: $script_names"
        for script in $script_names; do
            if check_script_exists "$script" "$cmd_root/scripts"; then
                # Run script with file argument
                local script_output
                local script_exit_code
                
                # Change to command root and run script
                if script_output=$(cd "$cmd_root" && "./scripts/$script" "$rel_path" 2>&1); then
                    script_exit_code=0
                    log_debug "Script succeeded"
                else
                    script_exit_code=$?
                    log_debug "Script failed with exit code: $script_exit_code"
                fi
                
                # Output information if it failed OR if in test mode
                if [[ $script_exit_code -ne 0 ]] || [[ "${CLAUDE_HOOKS_TEST_MODE:-0}" == "1" ]]; then
                    log_info "📜 Running 'scripts/$script' from $cmd_root"
                    if [[ -n "$script_output" ]]; then
                        echo "$script_output" >&2
                    fi
                    if [[ $script_exit_code -ne 0 ]]; then
                        add_error "Tests failed (scripts/$script)"
                    fi
                fi
                
                # Return 0 to indicate we found and ran the command (even if tests failed)
                return 0
            fi
        done
    fi
    
    log_debug "No project commands found"
    return 1
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

# Determine file type and run appropriate tests
main() {
    # Print header only in debug mode
    if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
        print_test_header
    fi
    
    local failed=0
    
    # Don't set CLAUDE_HOOKS_FILE_SKIPPED initially - only set to true when skipping
    unset CLAUDE_HOOKS_FILE_SKIPPED
    
    log_debug "Starting main() with FILE_PATH: $FILE_PATH"
    log_debug "Current directory: $(pwd)"
    
    # Determine the language based on file extension
    local language=""
    if [[ "$FILE_PATH" =~ \.go$ ]] || { [[ "$FILE_PATH" == "./..." ]] && [[ -n "$(find . -name "*.go" -type f -print -quit 2>/dev/null)" ]]; }; then
        language="go"
    elif [[ "$FILE_PATH" =~ \.py$ ]]; then
        language="python"
    elif [[ "$FILE_PATH" =~ \.[jt]sx?$ ]]; then
        language="javascript"
    elif [[ "$FILE_PATH" =~ \.sh$ ]]; then
        language="shell"
    elif [[ "$FILE_PATH" =~ \.rs$ ]]; then
        language="rust"
    elif [[ "$FILE_PATH" =~ (Tiltfile|.*\.tiltfile|.*\.star|.*\.bzl)$ ]]; then
        language="tilt"
    elif type -t should_run_tilt_tests &>/dev/null && should_run_tilt_tests "$FILE_PATH"; then
        language="tilt"
    else
        # No tests for this file type - exit silently with success
        log_debug "No test runner for file type: $FILE_PATH"
        exit 0
    fi
    
    log_debug "Detected language: $language"
    
    # Try project command first
    if try_project_test_command "$FILE_PATH" "$language"; then
        log_debug "Used project command for $language testing"
        # Note: try_project_test_command handles errors internally and returns 0 if it ran a command
    else
        # Fall back to language-specific test runners
        case "$language" in
            "go")
                # Check if Go testing function is available
                if type -t run_go_tests &>/dev/null; then
                    log_debug "Running Go tests"
                    run_go_tests "$FILE_PATH" || failed=1
                else
                    log_debug "Go testing function not available"
                fi
                ;;
            "python")
                run_python_tests "$FILE_PATH" || failed=1
                ;;
            "javascript")
                run_javascript_tests "$FILE_PATH" || failed=1
                ;;
            "shell")
                run_shell_tests "$FILE_PATH" || failed=1
                ;;
            "rust")
                run_rust_tests "$FILE_PATH" || failed=1
                ;;
            "tilt")
                # Check if Tilt testing function is available
                if type -t run_tilt_tests &>/dev/null; then
                    run_tilt_tests "$FILE_PATH" || failed=1
                else
                    log_debug "Tilt testing function not available"
                fi
                ;;
        esac
    fi
    
    # Check both failed flag and error count (project commands use error count)
    if [[ $failed -ne 0 ]] || [[ ${CLAUDE_HOOKS_ERROR_COUNT:-0} -gt 0 ]]; then
        # Exit 2 blocks the operation with error message
        echo -e "${RED}⛔ BLOCKING: Must fix ALL test failures above before continuing${NC}" >&2
        exit 2
    elif [[ "${CLAUDE_HOOKS_FILE_SKIPPED:-}" == "true" ]]; then
        # File was skipped - exit 0 silently unless debug mode
        if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
            echo -e "${CYAN}[DEBUG]${NC} File was skipped (debug mode active)" >&2
            exit 2
        fi
        log_debug "File was skipped, exiting with 0"
        exit 0
    else
        # In debug mode, always exit 2 to show debug output
        if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
            echo -e "${CYAN}[DEBUG]${NC} Tests passed (debug mode active)" >&2
            exit 2
        fi
        # Exit 2 with success message per Claude Code documentation
        exit_with_success_message "${YELLOW}👉 Tests pass. Continue with your task.${NC}"
    fi
}

# Run main
main