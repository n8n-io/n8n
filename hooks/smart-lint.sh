#!/usr/bin/env bash
# smart-lint.sh - Intelligent project-aware code quality checks for Claude Code
#
# SYNOPSIS
#   Claude Code PostToolUse hook that runs linting after file edits
#
# DESCRIPTION
#   Automatically detects project type and runs ALL quality checks.
#   Every issue found is blocking - code must be 100% clean to proceed.
#   Test comment to trigger hooks.
#
# INPUT
#   JSON via stdin with PostToolUse event data
#
# OUTPUT
#   Optional JSON response for advanced control
#
# EXIT CODES
#   0 - Continue with operation
#   1 - General error (missing dependencies, etc.)
#   2 - Block operation (linting issues found)
#
# CONFIGURATION
#   Project-specific overrides can be placed in .claude-hooks-config.sh
#   See inline documentation for all available options.
#
#   Go-specific options:
#     CLAUDE_HOOKS_GO_DEADCODE_ENABLED=false  # Disable deadcode analysis (default: true)
#                                             # Note: deadcode can take 5-10 seconds on large projects

# Don't use set -e - we need to control exit codes carefully
set +e

# Source common helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common-helpers.sh"

# Initialize logging
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs"
LOG_FILE="${LOG_DIR}/smart-lint-hook.log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Function to log to file with timestamp
log_to_file() {
    local message="$1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" >> "$LOG_FILE"
}

# Debug output after sourcing helpers so we have log_debug
log_debug "smart-lint.sh started"
log_to_file "Hook execution started in directory: $(pwd)"

# ============================================================================
# PROJECT DETECTION
# ============================================================================

# Add Tilt project detection to the common detect_project_type function
detect_project_type_with_tilt() {
    local project_type="unknown"
    local types=()
    
    # Go project
    if [[ -f "go.mod" ]] || [[ -f "go.sum" ]] || [[ -n "$(find . -maxdepth 3 -name "*.go" -type f -print -quit 2>/dev/null)" ]]; then
        types+=("go")
    fi
    
    # Python project
    if [[ -f "pyproject.toml" ]] || [[ -f "setup.py" ]] || [[ -f "requirements.txt" ]] || [[ -n "$(find . -maxdepth 3 -name "*.py" -type f -print -quit 2>/dev/null)" ]]; then
        types+=("python")
    fi
    
    # JavaScript/TypeScript project
    if [[ -f "package.json" ]] || [[ -f "tsconfig.json" ]] || [[ -n "$(find . -maxdepth 3 \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) -type f -print -quit 2>/dev/null)" ]]; then
        types+=("javascript")
    fi
    
    # Rust project
    if [[ -f "Cargo.toml" ]] || [[ -n "$(find . -maxdepth 3 -name "*.rs" -type f -print -quit 2>/dev/null)" ]]; then
        types+=("rust")
    fi
    
    # Nix project
    if [[ -f "flake.nix" ]] || [[ -f "default.nix" ]] || [[ -f "shell.nix" ]]; then
        types+=("nix")
    fi
    
    # Shell project
    if [[ -n "$(find . -maxdepth 3 -name "*.sh" -type f -print -quit 2>/dev/null)" ]] || [[ -n "$(find . -maxdepth 3 -name "*.bash" -type f -print -quit 2>/dev/null)" ]]; then
        types+=("shell")
    fi
    
    # Tilt project
    if [[ -f "Tiltfile" ]] || [[ -n "$(find . -maxdepth 3 -name "Tiltfile" -type f -print -quit 2>/dev/null)" ]] || [[ -n "$(find . -maxdepth 3 -name "*.tiltfile" -type f -print -quit 2>/dev/null)" ]]; then
        types+=("tilt")
    fi
    
    # Return primary type or "mixed" if multiple
    if [[ ${#types[@]} -eq 1 ]]; then
        project_type="${types[0]}"
    elif [[ ${#types[@]} -gt 1 ]]; then
        project_type="mixed:$(IFS=,; echo "${types[*]}")"
    fi
    
    log_debug "Detected project type: $project_type"
    echo "$project_type"
}

# Get list of modified files (if available from git)
# Note: This function is currently unused but kept for future use
# shellcheck disable=SC2317
get_modified_files() {
    if [[ -d .git ]] && command_exists git; then
        # Get files modified in the last commit or currently staged/modified
        git diff --name-only HEAD 2>/dev/null || true
        git diff --cached --name-only 2>/dev/null || true
    fi
}

# ============================================================================
# ERROR TRACKING (extends common-helpers.sh)
# ============================================================================

# Use the CLAUDE_HOOKS_ERRORS array from common-helpers.sh but with a different name for summary
declare -a CLAUDE_HOOKS_SUMMARY=()

# Override add_error to also add to summary and print immediately
add_error() {
    local message="$1"
    CLAUDE_HOOKS_ERROR_COUNT+=1
    CLAUDE_HOOKS_ERRORS+=("${RED}❌${NC} $message")
    CLAUDE_HOOKS_SUMMARY+=("${RED}❌${NC} $message")
    # Print error immediately to stderr so tests can capture it
    echo -e "${RED}❌${NC} $message" >&2
}

print_summary() {
    if [[ $CLAUDE_HOOKS_ERROR_COUNT -gt 0 ]]; then
        # Simple one-line summary when there are errors
        echo -e "\n${RED}❌ Found $CLAUDE_HOOKS_ERROR_COUNT blocking issue(s) - fix all above${NC}" >&2
    fi
}

# ============================================================================
# CONFIGURATION LOADING
# ============================================================================

load_config() {
    # Default configuration
    export CLAUDE_HOOKS_ENABLED="${CLAUDE_HOOKS_ENABLED:-true}"
    export CLAUDE_HOOKS_FAIL_FAST="${CLAUDE_HOOKS_FAIL_FAST:-false}"
    export CLAUDE_HOOKS_SHOW_TIMING="${CLAUDE_HOOKS_SHOW_TIMING:-false}"
    
    # Language enables
    export CLAUDE_HOOKS_GO_ENABLED="${CLAUDE_HOOKS_GO_ENABLED:-true}"
    export CLAUDE_HOOKS_PYTHON_ENABLED="${CLAUDE_HOOKS_PYTHON_ENABLED:-true}"
    export CLAUDE_HOOKS_JS_ENABLED="${CLAUDE_HOOKS_JS_ENABLED:-true}"
    export CLAUDE_HOOKS_RUST_ENABLED="${CLAUDE_HOOKS_RUST_ENABLED:-true}"
    export CLAUDE_HOOKS_NIX_ENABLED="${CLAUDE_HOOKS_NIX_ENABLED:-true}"
    export CLAUDE_HOOKS_TILT_ENABLED="${CLAUDE_HOOKS_TILT_ENABLED:-true}"
    
    # Project command configuration
    export CLAUDE_HOOKS_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_USE_PROJECT_COMMANDS:-true}"
    export CLAUDE_HOOKS_MAKE_LINT_TARGETS="${CLAUDE_HOOKS_MAKE_LINT_TARGETS:-lint}"
    export CLAUDE_HOOKS_SCRIPT_LINT_NAMES="${CLAUDE_HOOKS_SCRIPT_LINT_NAMES:-lint}"
    
    # Per-language project command opt-out
    export CLAUDE_HOOKS_GO_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_GO_USE_PROJECT_COMMANDS:-true}"
    export CLAUDE_HOOKS_PYTHON_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_PYTHON_USE_PROJECT_COMMANDS:-true}"
    export CLAUDE_HOOKS_JAVASCRIPT_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_JAVASCRIPT_USE_PROJECT_COMMANDS:-true}"
    export CLAUDE_HOOKS_RUST_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_RUST_USE_PROJECT_COMMANDS:-true}"
    export CLAUDE_HOOKS_NIX_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_NIX_USE_PROJECT_COMMANDS:-true}"
    export CLAUDE_HOOKS_SHELL_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_SHELL_USE_PROJECT_COMMANDS:-true}"
    export CLAUDE_HOOKS_TILT_USE_PROJECT_COMMANDS="${CLAUDE_HOOKS_TILT_USE_PROJECT_COMMANDS:-true}"
    
    # Project-specific overrides
    if [[ -f ".claude-hooks-config.sh" ]]; then
        # shellcheck disable=SC1091
        source ".claude-hooks-config.sh" || {
            log_error "Failed to load .claude-hooks-config.sh"
            exit 2
        }
    fi
    
    # Quick exit if hooks are disabled
    if [[ "$CLAUDE_HOOKS_ENABLED" != "true" ]]; then
        log_info "Claude hooks are disabled"
        log_debug "Exiting because CLAUDE_HOOKS_ENABLED=$CLAUDE_HOOKS_ENABLED"
        if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
            exit 2  # Exit 2 in debug mode to show output
        fi
        exit 0
    fi
}

# ============================================================================
# LANGUAGE-SPECIFIC LINTERS
# ============================================================================

# Source language-specific linting functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source Go linting if available
if [[ -f "${SCRIPT_DIR}/lint-go.sh" ]]; then
    source "${SCRIPT_DIR}/lint-go.sh"
fi

# Source Tilt linting if available
if [[ -f "${SCRIPT_DIR}/lint-tilt.sh" ]]; then
    source "${SCRIPT_DIR}/lint-tilt.sh"
fi

lint_python() {
    if [[ "${CLAUDE_HOOKS_PYTHON_ENABLED:-true}" != "true" ]]; then
        log_debug "Python linting disabled"
        return 0
    fi
    
    log_debug "Running Python linters..."
    
    # Find Python files
    local py_files
    py_files=$(find . -name "*.py" -type f | grep -v -E "(venv/|\.venv/|__pycache__|\.git/)" | head -100)
    
    if [[ -z "$py_files" ]]; then
        log_debug "No Python files found"
        return 0
    fi
    
    # Filter out files that should be skipped
    local filtered_files=""
    for file in $py_files; do
        if ! should_skip_file "$file"; then
            filtered_files="$filtered_files$file "
        fi
    done
    
    if [[ -z "$filtered_files" ]]; then
        log_debug "All Python files were skipped by .claude-hooks-ignore"
        return 0
    fi
    
    # Black formatting
    if command_exists black; then
        # Check if files need formatting
        if ! echo "$filtered_files" | xargs black --check >/dev/null 2>&1; then
            # Apply formatting and capture any errors
            local format_output
            if ! format_output=$(echo "$filtered_files" | xargs black 2>&1); then
                add_error "Python formatting failed"
                echo "$format_output" >&2
            fi
        fi
    fi
    
    # Linting
    if command_exists ruff; then
        local ruff_output
        if ! ruff_output=$(echo "$filtered_files" | xargs ruff check --fix 2>&1); then
            add_error "Ruff found issues"
            echo "$ruff_output" >&2
        fi
    elif command_exists flake8; then
        local flake8_output
        if ! flake8_output=$(echo "$filtered_files" | xargs flake8 2>&1); then
            add_error "Flake8 found issues"
            echo "$flake8_output" >&2
        fi
    fi
    
    return 0
}

lint_javascript() {
    if [[ "${CLAUDE_HOOKS_JS_ENABLED:-true}" != "true" ]]; then
        log_debug "JavaScript linting disabled"
        return 0
    fi
    
    log_debug "Running JavaScript/TypeScript linters..."
    
    # Find JS/TS files
    local js_files
    js_files=$(find . \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \) -type f | grep -v -E "(node_modules/|dist/|build/|\.git/)" | head -100)
    
    if [[ -z "$js_files" ]]; then
        log_debug "No JavaScript/TypeScript files found"
        return 0
    fi
    
    # Filter out files that should be skipped
    local filtered_files=""
    for file in $js_files; do
        if ! should_skip_file "$file"; then
            filtered_files="$filtered_files$file "
        fi
    done
    
    if [[ -z "$filtered_files" ]]; then
        log_debug "All JavaScript/TypeScript files were skipped by .claude-hooks-ignore"
        return 0
    fi
    
    # Check for ESLint
    if [[ -f "package.json" ]] && grep -q "eslint" package.json 2>/dev/null; then
        if command_exists npm; then
            local eslint_output
            local eslint_exit_code
            
            # Run npm lint and capture both output and exit code
            eslint_output=$(npm run lint --if-present 2>&1)
            eslint_exit_code=$?
            
            # Log the command execution to our log file
            log_to_file "ESLint execution: exit_code=$eslint_exit_code"
            log_to_file "ESLint output: $eslint_output"
            
            # Check if the command actually failed (non-zero exit code)
            if [[ $eslint_exit_code -ne 0 ]]; then
                add_error "ESLint found issues"
                echo "$eslint_output" >&2
            fi
        fi
    fi
    
    # Prettier
    if [[ -f ".prettierrc" ]] || [[ -f "prettier.config.js" ]] || [[ -f ".prettierrc.json" ]]; then
        if command_exists prettier; then
            # Check if files need formatting
            if ! echo "$filtered_files" | xargs prettier --check >/dev/null 2>&1; then
                # Apply formatting and capture any errors
                local format_output
                if ! format_output=$(echo "$filtered_files" | xargs prettier --write 2>&1); then
                    add_error "Prettier formatting failed"
                    echo "$format_output" >&2
                fi
            fi
        elif command_exists npx; then
            # Check if files need formatting
            if ! echo "$filtered_files" | xargs npx prettier --check >/dev/null 2>&1; then
                # Apply formatting and capture any errors
                local format_output
                if ! format_output=$(echo "$filtered_files" | xargs npx prettier --write 2>&1); then
                    add_error "Prettier formatting failed"
                    echo "$format_output" >&2
                fi
            fi
        fi
    fi
    
    return 0
}

lint_rust() {
    if [[ "${CLAUDE_HOOKS_RUST_ENABLED:-true}" != "true" ]]; then
        log_debug "Rust linting disabled"
        return 0
    fi
    
    log_debug "Running Rust linters..."
    
    # Find Rust files
    local rust_files
    rust_files=$(find . -name "*.rs" -type f | grep -v -E "(target/|\.git/)" | head -100)
    
    if [[ -z "$rust_files" ]]; then
        log_debug "No Rust files found"
        return 0
    fi
    
    # Filter out files that should be skipped
    local filtered_files=""
    for file in $rust_files; do
        if ! should_skip_file "$file"; then
            filtered_files="$filtered_files$file "
        fi
    done
    
    if [[ -z "$filtered_files" ]]; then
        log_debug "All Rust files were skipped by .claude-hooks-ignore"
        return 0
    fi
    
    if command_exists cargo; then
        local fmt_output
        if ! fmt_output=$(cargo fmt -- --check 2>&1); then
            # Apply formatting and capture any errors
            local format_output
            if ! format_output=$(cargo fmt 2>&1); then
                add_error "Rust formatting failed"
                echo "$format_output" >&2
            fi
        fi
        
        local clippy_output
        if ! clippy_output=$(cargo clippy --quiet -- -D warnings 2>&1); then
            add_error "Clippy found issues"
            echo "$clippy_output" >&2
        fi
    else
        log_debug "Cargo not found, skipping Rust checks"
    fi
    
    return 0
}

lint_nix() {
    if [[ "${CLAUDE_HOOKS_NIX_ENABLED:-true}" != "true" ]]; then
        log_debug "Nix linting disabled"
        return 0
    fi
    
    log_debug "Running Nix linters..."
    
    # Find all .nix files
    local nix_files
    nix_files=$(find . -name "*.nix" -type f | grep -v -E "(result/|/nix/store/)" | head -20)
    
    if [[ -z "$nix_files" ]]; then
        log_debug "No Nix files found"
        return 0
    fi
    
    # Filter out files that should be skipped
    local filtered_files=""
    for file in $nix_files; do
        if ! should_skip_file "$file"; then
            filtered_files="$filtered_files$file "
        fi
    done
    
    nix_files="$filtered_files"
    if [[ -z "$nix_files" ]]; then
        log_debug "All Nix files were skipped by .claude-hooks-ignore"
        return 0
    fi
    
    # Check formatting with nixpkgs-fmt or alejandra
    if command_exists nixpkgs-fmt; then
        local fmt_output
        if ! fmt_output=$(echo "$nix_files" | xargs nixpkgs-fmt --check 2>&1); then
            # Apply formatting and capture any errors
            local format_output
            if ! format_output=$(echo "$nix_files" | xargs nixpkgs-fmt 2>&1); then
                add_error "Nix formatting failed"
                echo "$format_output" >&2
            fi
        fi
    elif command_exists alejandra; then
        local fmt_output
        if ! fmt_output=$(echo "$nix_files" | xargs alejandra --check 2>&1); then
            # Apply formatting and capture any errors
            local format_output
            if ! format_output=$(echo "$nix_files" | xargs alejandra 2>&1); then
                add_error "Nix formatting failed"
                echo "$format_output" >&2
            fi
        fi
    fi
    
    # Static analysis with statix
    if command_exists statix; then
        local statix_output
        if ! statix_output=$(statix check 2>&1); then
            add_error "Statix found issues"
            echo "$statix_output" >&2
        fi
    fi
    
    return 0
}

# ============================================================================
# SHELL SCRIPT LINTING
# ============================================================================

lint_shell() {
    if [[ "${CLAUDE_HOOKS_SHELL_ENABLED:-true}" != "true" ]]; then
        log_debug "Shell linting disabled"
        return 0
    fi
    
    log_debug "Running Shell linters..."
    
    # Find all shell scripts
    local shell_files
    shell_files=$(find . -type f \( -name "*.sh" -o -name "*.bash" -o -name "*.zsh" \) | grep -v -E "(\.git/|node_modules/|venv/)" | head -50)
    
    # Also find files with bash/sh/zsh shebang
    local shebang_files
    shebang_files=$(grep -r -l "^#!.*\(bash\|sh\|zsh\)" . --include="*" | grep -v -E "(\.git/|node_modules/|venv/)" | head -50)
    
    # Combine and deduplicate
    shell_files=$(echo -e "$shell_files\n$shebang_files" | sort -u | grep -v "^$")
    
    if [[ -z "$shell_files" ]]; then
        log_debug "No shell scripts found"
        return 0
    fi
    
    # Filter out files that should be skipped
    local filtered_files=""
    for file in $shell_files; do
        if ! should_skip_file "$file"; then
            filtered_files="$filtered_files$file "
        fi
    done
    
    if [[ -z "$filtered_files" ]]; then
        log_debug "All shell scripts were skipped by .claude-hooks-ignore"
        return 0
    fi
    
    shell_files="$filtered_files"
    
    # Shellcheck
    if command_exists shellcheck; then
        log_debug "Running shellcheck..."
        local shellcheck_errors=false
        
        for file in $shell_files; do
            if ! shellcheck -x "$file" 2>&1; then
                shellcheck_errors=true
                add_error "shellcheck violations in $file"
            fi
        done
        
        if [[ "$shellcheck_errors" == "false" ]]; then
            log_success "shellcheck passed"
        fi
    else
        log_debug "shellcheck not found - skipping shell script validation"
    fi
    
    # Bash formatting with shfmt (if available)
    if command_exists shfmt; then
        log_debug "Running shfmt..."
        local format_errors=false
        
        for file in $shell_files; do
            # Check if file needs formatting
            if ! shfmt -d "$file" >/dev/null 2>&1; then
                format_errors=true
                echo -e "${RED}❌ Formatting issues in: $file${NC}" >&2
                echo "Run: shfmt -w $file" >&2
                add_error "Shell formatting issues in $file"
            fi
        done
        
        if [[ "$format_errors" == "false" ]]; then
            log_success "shfmt passed"
        fi
    else
        log_debug "shfmt not found - skipping shell formatting check"
    fi
    
    return 0
}

# ============================================================================
# HOOK INPUT PARSING
# ============================================================================

# This script only works as a Claude Code hook (JSON on stdin)
JSON_INPUT=""

# Ensure jq is available for JSON parsing
if ! command_exists jq; then
    log_error "jq is required for JSON parsing but not found"
    exit 1
fi

if [ ! -t 0 ]; then
    # We have input on stdin - try to read it
    log_debug "Reading JSON from stdin"
    JSON_INPUT=$(cat)
    
    # Check if it's valid JSON
    if echo "$JSON_INPUT" | jq . >/dev/null 2>&1; then
        log_debug "Valid JSON input"
        
        
        # Extract relevant fields from the JSON
        EVENT=$(echo "$JSON_INPUT" | jq -r '.hook_event_name // empty')
        TOOL_NAME=$(echo "$JSON_INPUT" | jq -r '.tool_name // empty')
        TOOL_INPUT=$(echo "$JSON_INPUT" | jq -r '.tool_input // empty')
        
        log_debug "Event: $EVENT, Tool: $TOOL_NAME"
        
        # Only process edit-related tools
        if [[ "$EVENT" == "PostToolUse" ]] && [[ "$TOOL_NAME" =~ ^(Edit|Write|MultiEdit)$ ]]; then
            log_debug "Processing $TOOL_NAME operation"
            # Extract file path(s) that were edited
            if [[ "$TOOL_NAME" == "MultiEdit" ]]; then
                FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')
            else
                FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty')
            fi
            
            # Change to the directory of the edited file
            if [[ -n "$FILE_PATH" ]] && [[ -f "$FILE_PATH" ]]; then
                FILE_DIR=$(dirname "$FILE_PATH")
                cd "$FILE_DIR" || true
                log_debug "Changed to file directory: $(pwd)"
                # Update FILE_PATH to just the basename since we've changed directories
                FILE_PATH=$(basename "$FILE_PATH")
                log_debug "FILE_PATH is now: $FILE_PATH"
            fi
        else
            # Not an edit operation - exit silently
            log_debug "Not an edit operation (Event: $EVENT, Tool: $TOOL_NAME), exiting silently"
            if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
                exit 2  # Exit 2 in debug mode to show output
            fi
            exit 0
        fi
    else
        # Invalid JSON input
        log_error "Invalid JSON input provided"
        exit 1
    fi
else
    # No input on stdin
    log_error "No JSON input provided. This hook only works with Claude Code."
    exit 1
fi

# ============================================================================
# PROJECT COMMAND INTEGRATION
# ============================================================================

# Try to use project-specific lint command (make target or script)
try_project_lint_command() {
    local file_path="$1"
    local language="$2"
    
    # Check if project commands are disabled globally
    if [[ "${CLAUDE_HOOKS_USE_PROJECT_COMMANDS:-true}" != "true" ]]; then
        log_debug "Project commands disabled globally"
        return 1
    fi
    
    # Check language-specific opt-out
    local opt_out_var="CLAUDE_HOOKS_$(echo "$language" | tr '[:lower:]' '[:upper:]')_USE_PROJECT_COMMANDS"
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
    if ! config_output=$(get_project_command_config "lint"); then
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
                
                # Output and track errors if it failed
                if [[ $make_exit_code -ne 0 ]]; then
                    log_info "🔨 Running 'make $target' from $cmd_root"
                    if [[ -n "$make_output" ]]; then
                        echo "$make_output" >&2
                    fi
                    add_error "make $target found issues"
                elif [[ "${CLAUDE_HOOKS_TEST_MODE:-0}" == "1" ]] && [[ -n "$make_output" ]]; then
                    # In test mode, show output even on success
                    log_info "🔨 Running 'make $target' from $cmd_root"
                    echo "$make_output" >&2
                fi
                
                # Return 0 to indicate project command was found and executed
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
                
                # Output and track errors if it failed
                if [[ $script_exit_code -ne 0 ]]; then
                    log_info "📜 Running 'scripts/$script' from $cmd_root"
                    if [[ -n "$script_output" ]]; then
                        echo "$script_output" >&2
                    fi
                    add_error "scripts/$script found issues"
                elif [[ "${CLAUDE_HOOKS_TEST_MODE:-0}" == "1" ]] && [[ -n "$script_output" ]]; then
                    # In test mode, show output even on success
                    log_info "📜 Running 'scripts/$script' from $cmd_root"
                    echo "$script_output" >&2
                fi
                
                # Return 0 to indicate project command was found and executed
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

# This script only works as a Claude Code hook - no CLI mode support

# Print header only in debug mode
if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
    echo "" >&2
    echo "🔍 Style Check - Validating code formatting..." >&2
    echo "────────────────────────────────────────────" >&2
fi

# Load configuration
load_config

# Start timing
START_TIME=$(time_start)

# Detect project type
PROJECT_TYPE=$(detect_project_type_with_tilt)

# Main execution
main() {
    local used_project_command=false
    
    # Handle mixed project types
    if [[ "$PROJECT_TYPE" == mixed:* ]]; then
        local type_string="${PROJECT_TYPE#mixed:}"
        IFS=',' read -ra TYPE_ARRAY <<< "$type_string"
        
        for type in "${TYPE_ARRAY[@]}"; do
            # Try project command first (only once for mixed projects)
            if [[ "$used_project_command" == "false" ]] && try_project_lint_command "$FILE_PATH" "$type"; then
                log_debug "Used project command for $type linting"
                used_project_command=true
                # Skip all remaining language processing since project command handles everything
                break
            elif [[ "$used_project_command" == "false" ]]; then
                # Fall back to language-specific linters
                case "$type" in
                    "go") lint_go ;;
                    "python") lint_python ;;
                    "javascript") lint_javascript ;;
                    "rust") lint_rust ;;
                    "nix") lint_nix ;;
                    "shell") lint_shell ;;
                    "tilt") 
                        if type -t lint_tilt &>/dev/null; then
                            lint_tilt
                        else
                            log_debug "Tilt linting function not available"
                        fi
                        ;;
                esac
            fi
            
            # Fail fast if configured
            if [[ "$CLAUDE_HOOKS_FAIL_FAST" == "true" && $CLAUDE_HOOKS_ERROR_COUNT -gt 0 ]]; then
                break
            fi
        done
    else
        # Single project type
        # Try project command first
        if [[ "$PROJECT_TYPE" != "unknown" ]] && try_project_lint_command "$FILE_PATH" "$PROJECT_TYPE"; then
            log_debug "Used project command for $PROJECT_TYPE linting"
        else
            # Fall back to language-specific linters
            case "$PROJECT_TYPE" in
                "go") lint_go ;;
                "python") lint_python ;;
                "javascript") lint_javascript ;;
                "rust") lint_rust ;;
                "nix") lint_nix ;;
                "shell") lint_shell ;;
                "tilt") 
                    if type -t lint_tilt &>/dev/null; then
                        lint_tilt
                    else
                        log_debug "Tilt linting function not available"
                    fi
                    ;;
                "unknown") 
                    log_debug "No recognized project type, skipping checks"
                    ;;
            esac
        fi
    fi
    
    # Show timing if enabled
    time_end "$START_TIME"
    
    # Print summary
    print_summary
    
    # Return exit code - any issues mean failure
    if [[ $CLAUDE_HOOKS_ERROR_COUNT -gt 0 ]]; then
        return 2
    else
        return 0
    fi
}

# Run main function
main
exit_code=$?

# Final message and exit
if [[ $exit_code -eq 2 ]]; then
    echo -e "${RED}⛔ BLOCKING: Must fix ALL errors above before continuing${NC}" >&2
    exit 2
else
    # In debug mode, always exit 2 to show debug output
    if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
        echo -e "${CYAN}[DEBUG]${NC} Hook completed successfully (debug mode active)" >&2
        exit 2
    fi
    # Always exit with 2 so Claude sees the continuation message
    exit_with_success_message "${YELLOW}👉 Style clean. Continue with your task.${NC}"
fi