#!/usr/bin/env bash
# test-tilt.sh - Tiltfile/Starlark-specific testing logic for smart-test.sh
#
# This file is sourced by smart-test.sh when Tiltfiles are detected.
# It provides the run_tilt_tests() function and associated helpers.

# ============================================================================
# TILT/STARLARK TESTING
# ============================================================================

run_tilt_tests() {
    local file="$1"
    
    # Skip if not a Tiltfile
    if [[ ! "$file" =~ (Tiltfile|.*\.tiltfile|.*\.star|.*\.bzl)$ ]]; then
        return 0
    fi
    
    # Check if the file should be skipped
    if should_skip_file "$file"; then
        log_debug "Skipping tests for $file due to .claude-hooks-ignore"
        export CLAUDE_HOOKS_FILE_SKIPPED=true
        return 0
    fi
    
    local dir
    dir=$(dirname "$file")
    
    # Check for Makefile with test-tilt target
    if [[ -f "Makefile" ]]; then
        local has_test_tilt
        has_test_tilt=$(grep -E "^test-tilt:" Makefile 2>/dev/null || echo "")
        
        if [[ -n "$has_test_tilt" ]]; then
            log_debug "🧪 Running Tiltfile tests via Makefile..."
            
            local test_output
            if ! test_output=$(make test-tilt 2>&1); then
                echo -e "${RED}❌ Tiltfile tests failed${NC}" >&2
                echo -e "\n${RED}Failed test output:${NC}" >&2
                format_test_output "$test_output" "tilt" >&2
                add_error "Tiltfile tests failed"
                return 1
            fi
            log_debug "✅ Tiltfile tests passed"
            return 0
        fi
    fi
    
    # Check for pytest-based tests (common pattern for Starlark)
    if [[ -f "tests/test_tiltfiles.py" ]] && command_exists pytest; then
        log_debug "🧪 Running Tiltfile tests with pytest..."
        
        local test_output
        if ! test_output=$(pytest tests/test_tiltfiles.py -v 2>&1); then
            echo -e "${RED}❌ Tiltfile pytest tests failed${NC}" >&2
            echo -e "\n${RED}Failed test output:${NC}" >&2
            format_test_output "$test_output" "python" >&2
            add_error "Tiltfile pytest tests failed"
            return 1
        fi
        log_debug "✅ Tiltfile pytest tests passed"
        return 0
    fi
    
    # Use tilt alpha tiltfile-result for validation
    if command_exists tilt; then
        echo -e "${BLUE}🔍 Validating Tiltfile with 'tilt alpha tiltfile-result'...${NC}" >&2
        
        local validation_output
        if ! validation_output=$(tilt alpha tiltfile-result -f "$file" 2>&1); then
            echo -e "${RED}❌ Tiltfile validation failed${NC}" >&2
            echo -e "\n${RED}Validation output:${NC}" >&2
            format_test_output "$validation_output" "tilt" >&2
            add_error "Tiltfile validation failed: $file"
            return 1
        fi
        
        # Check if output is valid JSON
        if ! echo "$validation_output" | jq . >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  Tiltfile produces invalid JSON output${NC}" >&2
            add_error "Tiltfile produces invalid JSON: $file"
            return 1
        fi
        
        log_debug "✅ Tiltfile validation passed"
    else
        log_debug "tilt command not found, skipping validation"
    fi
    
    # Basic syntax validation using Python
    if command_exists python || command_exists python3; then
        local python_cmd
        python_cmd=$(command -v python3 || command -v python)
        
        echo -e "${BLUE}🐍 Checking Tiltfile syntax...${NC}" >&2
        local syntax_output
        if ! syntax_output=$($python_cmd -m py_compile "$file" 2>&1); then
            echo -e "${RED}❌ Tiltfile has syntax errors${NC}" >&2
            echo -e "\n${RED}Syntax check output:${NC}" >&2
            format_test_output "$syntax_output" "python" >&2
            add_error "Tiltfile syntax error: $file"
            return 1
        fi
        echo -e "${GREEN}✅ Tiltfile syntax is valid${NC}" >&2
    fi
    
    # Check for test directory with Tiltfile-specific tests
    local test_dirs=("$dir/test" "$dir/tests" "test" "tests")
    for test_dir in "${test_dirs[@]}"; do
        if [[ -d "$test_dir" ]]; then
            # Look for test files related to this Tiltfile
            local test_files
            test_files=$(find "$test_dir" -name "*tilt*.py" -o -name "*tiltfile*.py" 2>/dev/null | head -10)
            
            if [[ -n "$test_files" ]]; then
                echo -e "${BLUE}🧪 Found Tiltfile test files, running...${NC}" >&2
                
                for test_file in $test_files; do
                    local test_output
                    if command_exists pytest; then
                        if ! test_output=$(pytest "$test_file" -v 2>&1); then
                            echo -e "${RED}❌ Test failed: $test_file${NC}" >&2
                            echo -e "\n${RED}Failed test output:${NC}" >&2
                            format_test_output "$test_output" "python" >&2
                            add_error "Test failed: $test_file"
                            return 1
                        fi
                    elif command_exists python; then
                        if ! test_output=$(python -m unittest "$test_file" 2>&1); then
                            echo -e "${RED}❌ Test failed: $test_file${NC}" >&2
                            echo -e "\n${RED}Failed test output:${NC}" >&2
                            format_test_output "$test_output" "python" >&2
                            add_error "Test failed: $test_file"
                            return 1
                        fi
                    fi
                done
                
                log_debug "✅ All Tiltfile tests passed"
            fi
        fi
    done
    
    return 0
}

# Check if we should run Tiltfile tests for this project
should_run_tilt_tests() {
    local file="$1"
    
    # Always run for Tiltfiles
    if [[ "$file" =~ (Tiltfile|.*\.tiltfile|.*\.star|.*\.bzl)$ ]]; then
        return 0
    fi
    
    # Check if this is a Tilt extension
    if [[ "$file" =~ tilt/.*\.py$ ]] && [[ -f "$(dirname "$file")/Tiltfile" ]]; then
        return 0
    fi
    
    return 1
}