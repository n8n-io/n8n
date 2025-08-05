#!/usr/bin/env bash
# lint-tilt.sh - Tiltfile/Starlark-specific linting logic for smart-lint.sh
#
# This file can be sourced by smart-lint.sh or executed standalone for testing.
# It provides the lint_tilt() function and associated helpers.

# ============================================================================
# TILT/STARLARK LINTING
# ============================================================================

# Check if file is a Tiltfile
is_tiltfile() {
    local file="$1"
    [[ "$file" =~ ^Tiltfile$ ]] || [[ "$file" =~ \.tiltfile$ ]] || [[ "$file" =~ /Tiltfile$ ]]
}

# Run Starlark syntax check
run_starlark_check() {
    local file="$1"
    
    if command_exists starlark; then
        log_debug "Running starlark --check on $file"
        local starlark_output
        if ! starlark_output=$(starlark --check "$file" 2>&1); then
            add_error "Starlark syntax error in $file"
            echo "$starlark_output" >&2
            return 1
        else
            log_debug "Starlark syntax check passed for $file"
        fi
    else
        echo "starlark not found, skipping syntax check" >&2
    fi
    
    return 0
}

# Run flake8 on Tiltfile (Python-like linting)
run_flake8_check() {
    local file="$1"
    
    if command_exists flake8; then
        log_debug "Running flake8 on $file"
        local flake8_output
        if ! flake8_output=$(flake8 "$file" 2>&1); then
            add_error "flake8 found issues in $file"
            echo "$flake8_output" >&2
            return 1
        else
            log_debug "flake8 check passed for $file"
        fi
    else
        echo "flake8 not found, skipping Python-style linting" >&2
    fi
    
    return 0
}

# Main linting function for standalone execution
lint_tilt_standalone() {
    local file="$1"
    
    if [[ "${CLAUDE_HOOKS_TILT_ENABLED:-true}" != "true" ]]; then
        log_debug "Tilt linting disabled"
        return 0
    fi
    
    if [[ -z "$file" ]] || [[ ! -f "$file" ]]; then
        log_debug "No valid file provided for Tiltfile linting"
        return 0
    fi
    
    # Check if it's actually a Tiltfile
    if ! is_tiltfile "$file"; then
        log_debug "File $file is not a Tiltfile, skipping"
        return 0
    fi
    
    # Skip if file should be ignored
    if should_skip_file "$file"; then
        log_debug "Skipping $file due to ignore patterns"
        return 0
    fi
    
    log_debug "Running Tiltfile linting on $file"
    
    # Run starlark syntax check
    run_starlark_check "$file"
    local starlark_result=$?
    
    # Run flake8 check
    run_flake8_check "$file"
    local flake8_result=$?
    
    # Return success if both checks passed
    if [[ $starlark_result -eq 0 && $flake8_result -eq 0 ]]; then
        log_debug "All Tiltfile checks passed for $file"
        # Add a message indicating that checks passed
        echo "Tiltfile checks passed for $file" >&2
        return 0
    else
        return 1
    fi
}

# Original function for compatibility with smart-lint.sh
lint_tilt() {
    if [[ "${CLAUDE_HOOKS_TILT_ENABLED:-true}" != "true" ]]; then
        log_debug "Tilt linting disabled"
        return 0
    fi
    
    log_debug "Running Tiltfile/Starlark linters..."
    
    # Check if we're in a project with Tiltfiles
    local tiltfiles
    tiltfiles=$(find . -name "Tiltfile" -o -name "*.tiltfile" -not -path "./vendor/*" -not -path "./.git/*" -not -path "./node_modules/*" | head -20)
    
    if [[ -z "$tiltfiles" ]]; then
        log_debug "No Tiltfiles found"
        return 0
    fi
    
    # Filter out files that should be skipped
    local filtered_files=""
    for file in $tiltfiles; do
        if ! should_skip_file "$file"; then
            filtered_files="$filtered_files$file "
        fi
    done
    
    tiltfiles="$filtered_files"
    if [[ -z "$tiltfiles" ]]; then
        log_debug "All Tiltfiles were skipped by .claude-hooks-ignore"
        return 0
    fi
    
    # Check for Makefile with lint-tilt target
    if [[ -f "Makefile" ]]; then
        local has_lint_tilt
        has_lint_tilt=$(grep -E "^lint-tilt:" Makefile 2>/dev/null || echo "")
        local has_fix_tilt
        has_fix_tilt=$(grep -E "^fix-tilt:" Makefile 2>/dev/null || echo "")
        
        if [[ -n "$has_lint_tilt" ]]; then
            log_debug "Using Makefile lint-tilt target"
            
            # First try to fix issues
            if [[ -n "$has_fix_tilt" ]]; then
                local fix_output
                # Suppress output unless there's an error
                if ! fix_output=$(make fix-tilt 2>&1); then
                    # Only log on error
                    log_debug "make fix-tilt failed: $fix_output"
                fi
            fi
            
            # Then run lint
            local lint_output
            if ! lint_output=$(make lint-tilt 2>&1); then
                add_error "Tiltfile linting failed (make lint-tilt)"
                # Only show output on failure
                echo "$lint_output" >&2
            fi
            return 0
        fi
    fi
    
    # Check each Tiltfile individually
    for tiltfile in $tiltfiles; do
        echo "Checking $tiltfile" >&2
        run_starlark_check "$tiltfile"
        run_flake8_check "$tiltfile"
    done
    
    # Check for buildifier
    if command_exists buildifier; then
        log_debug "Using buildifier for Tiltfile formatting"
        
        # First, try to auto-fix formatting issues
        # Disable loadTop to prevent moving loads to top (but allow sorting)
        local fixed_count=0
        for tiltfile in $tiltfiles; do
            log_debug "Checking $tiltfile with buildifier"
            
            # Check if file needs formatting
            if ! buildifier --mode=check --type=default "$tiltfile" &>/dev/null; then
                # Try to fix it, but don't move loads to top
                if buildifier --mode=fix --lint=fix --type=default -buildifier_disable=loadTop "$tiltfile" 2>/dev/null; then
                    ((fixed_count++))
                    log_debug "Fixed formatting in $tiltfile"
                fi
            fi
        done
        
        if [[ $fixed_count -gt 0 ]]; then
            log_info "Auto-fixed formatting in $fixed_count Tiltfile(s)"
        fi
        
        # Now check if any issues remain
        local has_issues=false
        for tiltfile in $tiltfiles; do
            local lint_output
            if ! lint_output=$(buildifier --mode=check --lint=warn --type=default -buildifier_disable=loadTop "$tiltfile" 2>&1); then
                has_issues=true
                add_error "Buildifier found issues in $tiltfile"
                echo "$lint_output" >&2
            fi
        done
        
        if [[ "$has_issues" == "false" ]]; then
            log_debug "All Tiltfiles passed buildifier checks"
        fi
    else
        log_debug "buildifier not found, checking for basic issues"
        
        # Basic syntax check using Python (since Starlark is Python-like)
        if command_exists python || command_exists python3; then
            local python_cmd
            python_cmd=$(command -v python3 || command -v python)
            
            for tiltfile in $tiltfiles; do
                local syntax_output
                if ! syntax_output=$($python_cmd -m py_compile "$tiltfile" 2>&1); then
                    add_error "Syntax error in $tiltfile"
                    echo "$syntax_output" >&2
                fi
            done
        fi
    fi
    
    # Check for custom linter script
    if [[ -f "scripts/lint-tiltfiles.sh" ]] && [[ -x "scripts/lint-tiltfiles.sh" ]]; then
        log_info "Running custom Tiltfile linter"
        local custom_output
        if ! custom_output=$(./scripts/lint-tiltfiles.sh 2>&1); then
            add_error "Custom Tiltfile linter found issues"
            echo "$custom_output" >&2
        fi
    fi
    
    # Check for Python-based custom linter
    if [[ -f "scripts/tiltfile-custom-lint.py" ]] && [[ -x "scripts/tiltfile-custom-lint.py" ]]; then
        log_info "Running Python-based custom Tiltfile linter"
        local custom_output
        if ! custom_output=$(./scripts/tiltfile-custom-lint.py 2>&1); then
            add_error "Custom Python linter found issues"
            echo "$custom_output" >&2
        fi
    fi
    
    return 0
}


