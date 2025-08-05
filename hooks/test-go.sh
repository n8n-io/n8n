#!/usr/bin/env bash
# test-go.sh - Go-specific testing functions for Claude Code smart-test
#
# This file is sourced by smart-test.sh to provide Go testing capabilities.
# It follows the same pattern as other language-specific testers.

# ============================================================================
# GO UTILITIES
# ============================================================================

# Find the Go project root by looking for go.mod
find_go_project_root() {
    local dir="$PWD"
    while [[ "$dir" != "/" ]]; do
        if [[ -f "$dir/go.mod" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    # No go.mod found, return current directory
    echo "$PWD"
    return 1
}

# Find the Go project root for a specific file
find_go_project_root_for_file() {
    local file_path="$1"
    local dir
    dir=$(dirname "$file_path")
    
    # Convert to absolute path
    if [[ "$dir" != /* ]]; then
        dir="$PWD/$dir"
    fi
    
    while [[ "$dir" != "/" ]]; do
        if [[ -f "$dir/go.mod" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    # No go.mod found
    return 1
}

# ============================================================================
# GO TEST CONFIGURATION
# ============================================================================

# Initialize GO_TEST_CMD to empty to avoid unbound variable errors
GO_TEST_CMD=""

# Set up the Go test command based on available tools
setup_go_test_command() {
    local base_cmd=""
    local race_flag=""
    
    # Set up base command
    if command -v gotestsum >/dev/null 2>&1; then
        # Use gotestsum with dots format for clean output
        base_cmd="gotestsum --format dots --"
        if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
            echo "DEBUG: Found gotestsum at $(command -v gotestsum)" >&2
        fi
    else
        # Fall back to standard go test
        base_cmd="go test -v"
        if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
            echo "DEBUG: gotestsum not found, using go test" >&2
        fi
    fi
    
    # Add race detection if enabled
    if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
        echo "DEBUG: CLAUDE_HOOKS_ENABLE_RACE='${CLAUDE_HOOKS_ENABLE_RACE}'" >&2
    fi
    
    if [[ "${CLAUDE_HOOKS_ENABLE_RACE:-false}" == "true" ]]; then
        race_flag=" -race"
        GO_TEST_CMD="$base_cmd$race_flag"
    else
        GO_TEST_CMD="$base_cmd"
    fi
    
    if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
        echo "DEBUG: GO_TEST_CMD='$GO_TEST_CMD'" >&2
    fi
}

# ============================================================================
# GO TEST RUNNERS
# ============================================================================

run_go_tests() {
    local target="$1"
    
    # Debug: Show what we're processing
    log_debug "run_go_tests called with target: '$target'"
    log_debug "CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS='${CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS:-}'"
    
    # Initialize test command if not already done
    if [[ -z "$GO_TEST_CMD" ]]; then
        setup_go_test_command
    fi
    
    # Check if target matches any excluded test patterns
    if [[ -n "${CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS:-}" ]]; then
        log_debug "Checking exclusion patterns: '$CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS' against target: '$target'"
        IFS=',' read -ra EXCLUDE_PATTERNS <<< "$CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS"
        for pattern in "${EXCLUDE_PATTERNS[@]}"; do
            pattern=$(echo "$pattern" | xargs)  # Trim whitespace
            log_debug "Checking pattern: '$pattern' against '$target'"
            if [[ "$target" =~ $pattern ]]; then
                log_info "🚫 Skipping tests matching exclusion pattern '$pattern': $target"
                return 0
            fi
        done
    else
        log_debug "No GO_TEST_EXCLUDE_PATTERNS configured"
    fi
    
    # Determine if target is a package path or a file
    local is_package_path=false
    local dir=""
    local base=""
    local test_file=""
    
    if [[ "$target" == "./..." ]] || [[ "$target" =~ ^\.(/|$) ]] || [[ ! "$target" =~ \.go$ ]]; then
        # It's a package path (like ./..., ., ./pkg, etc.)
        is_package_path=true
        dir="$target"
    else
        # It's a Go file
        dir=$(dirname "$target")
        base=$(basename "$target" .go)
        test_file="${dir}/${base}_test.go"
        
        # Check if the file should be skipped
        if should_skip_file "$target"; then
            log_debug "Skipping tests for $target due to .claude-hooks-ignore"
            # Set global flag to indicate file was skipped
            export CLAUDE_HOOKS_FILE_SKIPPED=true
            return 0
        fi
        
        # If this IS a test file, run the package tests (not just the single file)
        if [[ "$target" =~ _test\.go$ ]]; then
            log_debug "🧪 Running package tests for edited test file: $target"
            local test_output
            # Run all tests in the package to handle inter-test dependencies
            if ! test_output=$($GO_TEST_CMD -short "$dir" 2>&1); then
                # Output test failures directly without preamble
                format_test_output "$test_output" "go" >&2
                return 1
            fi
            log_debug "✅ Tests passed in $dir"
            return 0
        fi
    fi
    
    # Check if we should require tests (only for specific files, not package paths)
    local require_tests=false
    if [[ "$is_package_path" == "false" ]] && ! should_skip_go_test_requirement "$target"; then
        require_tests=true
    fi
    
    # Parse test modes
    IFS=',' read -ra TEST_MODES <<< "$CLAUDE_HOOKS_TEST_MODES"
    
    local failed=0
    local tests_run=0
    local test_file_exists=false
    
    [[ -f "$test_file" ]] && test_file_exists=true
    
    for mode in "${TEST_MODES[@]}"; do
        mode=$(echo "$mode" | xargs)  # Trim whitespace
        
        case "$mode" in
            "focused")
                # Focused tests only make sense for specific files
                if [[ "$is_package_path" == "false" ]]; then
                    if [[ "$test_file_exists" == "true" ]]; then
                        log_debug "🧪 Running focused tests for $base..."
                        tests_run=$((tests_run + 1))
                        
                        local test_output
                        if ! test_output=$($GO_TEST_CMD -run "Test.*${base}" "$dir" 2>&1); then
                            failed=1
                            # Output test failures directly
                            format_test_output "$test_output" "go" >&2
                            add_error "Focused tests failed for $base"
                        fi
                    elif [[ "$require_tests" == "true" ]]; then
                        echo -e "${RED}❌ Missing required test file: $test_file${NC}" >&2
                        echo -e "${YELLOW}📝 This file should have tests!${NC}" >&2
                        add_error "Missing required test file: $test_file"
                        return 2
                    fi
                fi
                ;;
            
            "package")
                # Check if directory matches any excluded test patterns
                if [[ -n "${CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS:-}" ]]; then
                    local skip_dir=false
                    log_debug "Checking package exclusion patterns: '$CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS' against dir: '$dir'"
                    IFS=',' read -ra EXCLUDE_PATTERNS <<< "$CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS"
                    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
                        pattern=$(echo "$pattern" | xargs)  # Trim whitespace
                        log_debug "Checking pattern: '$pattern' against '$dir'"
                        if [[ "$dir" =~ $pattern ]]; then
                            log_info "🚫 Skipping package tests matching exclusion pattern '$pattern': $dir"
                            skip_dir=true
                            break
                        fi
                    done
                    [[ "$skip_dir" == "true" ]] && continue
                else
                    log_debug "No GO_TEST_EXCLUDE_PATTERNS configured for package tests"
                fi
                
                local race_msg=""
                if [[ "${CLAUDE_HOOKS_ENABLE_RACE:-false}" == "true" ]]; then
                    race_msg=" (with race detection)"
                fi
                log_debug "📦 Running package tests${race_msg} in $dir..."
                tests_run=$((tests_run + 1))
                
                # Debug: show the actual command being run
                if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
                    echo "DEBUG: Running command: $GO_TEST_CMD -short \"$dir\"" >&2
                fi
                
                local test_output
                if ! test_output=$($GO_TEST_CMD -short "$dir" 2>&1); then
                    failed=1
                    # Output test failures directly
                    format_test_output "$test_output" "go" >&2
                    add_error "Package tests failed in $dir"
                fi
                ;;
            
            "all")
                # Run all tests in the project
                local race_msg=""
                if [[ "${CLAUDE_HOOKS_ENABLE_RACE:-false}" == "true" ]]; then
                    race_msg=" (with race detection)"
                fi
                log_debug "🌍 Running all project tests${race_msg}..."
                tests_run=$((tests_run + 1))
                
                local test_output
                if ! test_output=$($GO_TEST_CMD -short "./..." 2>&1); then
                    failed=1
                    # Output test failures directly
                    format_test_output "$test_output" "go" >&2
                    add_error "Project tests failed"
                fi
                ;;
                
            "integration")
                # Check if integration tests exist
                if go test -tags=integration -list . "$dir" >/dev/null 2>&1; then
                    log_debug "🔗 Running integration tests..."
                    tests_run=$((tests_run + 1))
                    
                    local test_output
                    if ! test_output=$($GO_TEST_CMD -tags=integration "$dir" 2>&1); then
                        failed=1
                        # Output test failures directly
                        format_test_output "$test_output" "go" >&2
                        add_error "Integration tests failed"
                    fi
                fi
                ;;
        esac
    done
    
    # Summary
    if [[ $tests_run -eq 0 ]]; then
        if [[ "$require_tests" == "true" && "$test_file_exists" == "false" ]]; then
            echo -e "${RED}❌ No tests found for $target (tests required)${NC}" >&2
            add_error "No tests found for $target (tests required)"
            return 2
        elif [[ "$test_file_exists" == "false" ]]; then
            echo -e "${YELLOW}⚠️  No test files found for $target${NC}" >&2
        elif [[ "$CLAUDE_HOOKS_TEST_VERBOSE" == "true" ]]; then
            echo -e "${YELLOW}⚠️  No tests run for $target${NC}" >&2
        fi
    elif [[ $failed -eq 0 ]]; then
        log_debug "All tests passed for $target"
    fi
    
    return $failed
}

# ============================================================================
# TEST OUTPUT FORMATTING
# ============================================================================

format_test_output() {
    local output="$1"
    
    # If output is empty, say so
    if [[ -z "$output" ]]; then
        echo "(no output captured)"
        return
    fi
    
    # Show the full output - no truncation when tests fail
    echo "$output"
}

# ============================================================================
# GO-SPECIFIC TEST HELPERS
# ============================================================================

# Check if we should skip test requirement for this Go file
should_skip_go_test_requirement() {
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
    
    # Check patterns (using glob matching)
    for pattern in "${skip_patterns[@]}"; do
        # shellcheck disable=SC2053  # We want glob matching here
        if [[ "$base" == $pattern ]]; then
            return 0
        fi
    done
    
    # Skip if in specific directories
    if [[ "$dir" =~ (^|/)(vendor|testdata|examples|cmd/[^/]+|gen|generated|.gen)(/|$) ]]; then
        return 0
    fi
    
    # Skip if it's a test file itself
    if [[ "$file" =~ _test\.go$ ]]; then
        return 0
    fi
    
    return 1
}

