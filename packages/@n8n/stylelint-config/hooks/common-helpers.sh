#!/usr/bin/env bash
# common-helpers.sh - Shared utilities for Claude Code hooks
#
# This file provides common functions, colors, and patterns used across
# multiple hooks to ensure consistency and reduce duplication.

# ============================================================================
# COLOR DEFINITIONS
# ============================================================================

export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[0;33m'
export BLUE='\033[0;34m'
export CYAN='\033[0;36m'
export NC='\033[0m' # No Color

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

log_debug() {
    [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]] && echo -e "${CYAN}[DEBUG]${NC} $*" >&2
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $*" >&2
}

# ============================================================================
# PERFORMANCE TIMING
# ============================================================================

time_start() {
    if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
        echo $(($(date +%s%N)/1000000))
    fi
}

time_end() {
    if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
        local start=$1
        local end
        end=$(($(date +%s%N)/1000000))
        local duration=$((end - start))
        log_debug "Execution time: ${duration}ms"
    fi
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# Check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Find project root by looking for common project markers
find_project_root() {
    local dir="$PWD"
    while [[ "$dir" != "/" ]]; do
        # Check for various project root indicators
        if [[ -f "$dir/.git/HEAD" ]] || [[ -d "$dir/.git" ]] || 
           [[ -f "$dir/.claude-hooks-config.sh" ]] ||
           [[ -f "$dir/go.mod" ]] || 
           [[ -f "$dir/package.json" ]] || 
           [[ -f "$dir/Cargo.toml" ]] ||
           [[ -f "$dir/setup.py" ]] ||
           [[ -f "$dir/pyproject.toml" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    # No project root found, return current directory
    echo "$PWD"
    return 1
}

# Load project configuration
load_project_config() {
    # User-level config
    # shellcheck disable=SC1091
    [[ -f "$HOME/.claude-hooks.conf" ]] && source "$HOME/.claude-hooks.conf"
    
    # Debug current directory
    log_debug "load_project_config called from PWD: $(pwd)"
    
    # Find project root and load config from there
    local project_root
    project_root=$(find_project_root)
    log_debug "Project root found: $project_root"
    
    if [[ -f "$project_root/.claude-hooks-config.sh" ]]; then
        log_debug "Found config file at: $project_root/.claude-hooks-config.sh"
        # shellcheck disable=SC1091
        source "$project_root/.claude-hooks-config.sh"
        log_debug "After sourcing project config, CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS='${CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS:-}'"
    else
        log_debug "No .claude-hooks-config.sh found at: $project_root"
    fi
    
    # Always return success
    return 0
}

# ============================================================================
# ERROR TRACKING
# ============================================================================

declare -a CLAUDE_HOOKS_ERRORS=()
declare -i CLAUDE_HOOKS_ERROR_COUNT=0

add_error() {
    local message="$1"
    CLAUDE_HOOKS_ERROR_COUNT+=1
    CLAUDE_HOOKS_ERRORS+=("${RED}❌${NC} $message")
}

print_error_summary() {
    if [[ $CLAUDE_HOOKS_ERROR_COUNT -gt 0 ]]; then
        # Concise summary for errors
        echo -e "\n${RED}❌ Found $CLAUDE_HOOKS_ERROR_COUNT issue(s) - ALL BLOCKING${NC}" >&2
    fi
}

# ============================================================================
# STANDARD HEADERS
# ============================================================================

print_style_header() {
    echo "" >&2
    echo "🔍 Style Check - Validating code formatting..." >&2
    echo "────────────────────────────────────────────" >&2
}

print_test_header() {
    echo "" >&2
    echo "🧪 Test Check - Running tests for edited file..." >&2
    echo "────────────────────────────────────────────" >&2
}

# ============================================================================
# STANDARD EXIT HANDLERS (DEPRECATED - kept for compatibility)
# ============================================================================

# Note: These functions are deprecated in favor of inline exit handling
# that properly distinguishes between hook mode and CLI mode

exit_with_success_message() {
    local message="${1:-Continue with your task.}"
    echo -e "$message" >&2
    exit 2
}

exit_with_style_failure() {
    echo -e "\n${RED}🛑 Style check failed. Fix issues and re-run.${NC}" >&2
    exit 2
}

exit_with_test_failure() {
    echo -e "${RED}⛔ BLOCKING: Must fix ALL test failures above before continuing${NC}" >&2
    exit 2
}

# ============================================================================
# FILE FILTERING
# ============================================================================

# Check if we should skip a file based on .claude-hooks-ignore
should_skip_file() {
    local file="$1"
    local project_root
    project_root=$(find_project_root)
    
    # Check .claude-hooks-ignore if it exists in project root
    if [[ -f "$project_root/.claude-hooks-ignore" ]]; then
        # Make file path relative to project root for pattern matching
        local relative_file="${file#"$project_root"/}"
        # Also get just the basename for matching
        local base_file
        base_file=$(basename "$file")
        
        while IFS= read -r pattern; do
            # Skip comments and empty lines
            [[ -z "$pattern" || "$pattern" =~ ^[[:space:]]*# ]] && continue
            
            # Check if pattern ends with /** for directory matching
            if [[ "$pattern" == */** ]]; then
                local dir_pattern="${pattern%/**}"
                if [[ "$relative_file" == "$dir_pattern"/* ]]; then
                    log_debug "Skipping $file due to .claude-hooks-ignore directory pattern: $pattern"
                    return 0
                fi
            # Check for glob patterns - use case statement for proper glob matching
            elif [[ "$pattern" == *[*?]* ]]; then
                # shellcheck disable=SC2254
                case "$relative_file" in
                    $pattern)
                        log_debug "Skipping $file due to .claude-hooks-ignore glob pattern: $pattern"
                        return 0
                        ;;
                esac
                # Also check against basename
                # shellcheck disable=SC2254
                case "$base_file" in
                    $pattern)
                        log_debug "Skipping $file due to .claude-hooks-ignore glob pattern: $pattern"
                        return 0
                        ;;
                esac
            # Exact match - check both relative path and basename
            elif [[ "$relative_file" == "$pattern" ]] || [[ "$base_file" == "$pattern" ]]; then
                log_debug "Skipping $file due to .claude-hooks-ignore pattern: $pattern"
                return 0
            fi
        done < "$project_root/.claude-hooks-ignore"
    fi
    
    # Check for inline skip comments
    if [[ -f "$file" ]] && head -n 5 "$file" 2>/dev/null | grep -q "claude-hooks-disable"; then
        log_debug "Skipping $file due to inline claude-hooks-disable comment"
        return 0
    fi
    
    return 1
}

# ============================================================================
# JSON OUTPUT HELPERS
# ============================================================================

# Output JSON response for hook control
# Usage: output_json_response "continue|block|error" "message" ["field:value" ...]
output_json_response() {
    local action="$1"
    local message="$2"
    shift 2
    
    # Start JSON object
    local json='{'
    
    # Add action field
    case "$action" in
        "continue")
            json+='"action":"continue"'
            ;;
        "block")
            json+='"action":"block"'
            ;;
        "error")
            json+='"action":"error"'
            ;;
    esac
    
    # Add message if provided
    if [[ -n "$message" ]]; then
        json+=",\"message\":\"$(echo -n "$message" | sed 's/"/\\"/g')\""
    fi
    
    # Add any additional fields
    for field in "$@"; do
        local key="${field%%:*}"
        local value="${field#*:}"
        json+=",\"$key\":\"$(echo -n "$value" | sed 's/"/\\"/g')\""
    done
    
    # Close JSON object
    json+='}'
    
    echo "$json"
}

# ============================================================================
# PROJECT COMMAND DISCOVERY
# ============================================================================

# Find project command root by looking for Makefile or scripts/ directory
# Searches upward from the given directory until it finds command files
# or reaches a project root marker (.git, go.mod, package.json, etc.)
find_project_command_root() {
    local start_dir="${1:-$PWD}"
    local dir="$start_dir"
    
    # Convert to absolute path if relative
    if [[ "$dir" != /* ]]; then
        dir="$(cd "$dir" && pwd)"
    fi
    
    while [[ "$dir" != "/" ]]; do
        # Check for Makefile or scripts/ directory
        if [[ -f "$dir/Makefile" ]] || [[ -d "$dir/scripts" ]]; then
            echo "$dir"
            return 0
        fi
        
        # Stop at project root markers - don't search beyond project boundaries
        if [[ -d "$dir/.git" ]] || [[ -f "$dir/go.mod" ]] || 
           [[ -f "$dir/package.json" ]] || [[ -f "$dir/Cargo.toml" ]] ||
           [[ -f "$dir/setup.py" ]] || [[ -f "$dir/pyproject.toml" ]]; then
            # If we're at project root but no commands found, return failure
            return 1
        fi
        
        dir="$(dirname "$dir")"
    done
    
    return 1
}

# Check if a make target exists using dry-run mode
# Returns 0 if target exists, 1 otherwise
check_make_target() {
    local target="$1"
    local makefile_dir="${2:-.}"
    
    # Use make -n (dry-run) to check if target exists
    # Redirect both stdout and stderr to avoid noise
    if (cd "$makefile_dir" && make -n "$target" >/dev/null 2>&1); then
        return 0
    else
        return 1
    fi
}

# Check if a script exists and is executable
# Looks in the specified scripts directory
check_script_exists() {
    local script_name="$1"
    local scripts_dir="${2:-./scripts}"
    
    # Check if the script exists and is executable
    [[ -x "$scripts_dir/$script_name" ]]
}

# Calculate relative path from one directory to a file
# Uses realpath if available, otherwise falls back to simple logic
calculate_relative_path() {
    local from_dir="$1"
    local to_file="$2"
    
    # Try using realpath first (most reliable)
    if command_exists realpath; then
        realpath --relative-to="$from_dir" "$to_file" 2>/dev/null || echo "$to_file"
    else
        # Fallback: simple implementation
        # Convert both to absolute paths first
        local abs_from
        abs_from=$(cd "$from_dir" && pwd)
        local abs_to
        abs_to=$(cd "$(dirname "$to_file")" && pwd)/$(basename "$to_file")
        
        # Remove common prefix
        local common_part="$abs_from"
        local result="${abs_to#"$common_part"/}"
        
        # If no common part was removed, paths might be on different branches
        if [[ "$result" == "$abs_to" ]]; then
            echo "$to_file"
        else
            echo "$result"
        fi
    fi
}

# Get project command configuration for lint or test
# Returns make targets on first line, script names on second line
get_project_command_config() {
    local command_type="$1"  # "lint" or "test"
    
    # Check global opt-out first
    if [[ "${CLAUDE_HOOKS_USE_PROJECT_COMMANDS:-true}" != "true" ]]; then
        return 1
    fi
    
    # Return configured values based on command type
    if [[ "$command_type" == "lint" ]]; then
        echo "${CLAUDE_HOOKS_MAKE_LINT_TARGETS:-lint}"
        echo "${CLAUDE_HOOKS_SCRIPT_LINT_NAMES:-lint}"
    elif [[ "$command_type" == "test" ]]; then
        echo "${CLAUDE_HOOKS_MAKE_TEST_TARGETS:-test}"
        echo "${CLAUDE_HOOKS_SCRIPT_TEST_NAMES:-test}"
    else
        log_error "Unknown command type: $command_type"
        return 1
    fi
}

# ============================================================================
# PROJECT TYPE DETECTION
# ============================================================================

detect_project_type() {
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
    
    # Return primary type or "mixed" if multiple
    if [[ ${#types[@]} -eq 1 ]]; then
        project_type="${types[0]}"
    elif [[ ${#types[@]} -gt 1 ]]; then
        project_type="mixed:$(IFS=,; echo "${types[*]}")"
    fi
    
    log_debug "Detected project type: $project_type"
    echo "$project_type"
}