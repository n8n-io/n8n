#!/usr/bin/env bash
# continuous-lint-monitor.sh - Continuous lint monitoring with file output
#
# SYNOPSIS
#   Claude Code PreToolUse hook that runs linting before tool execution
#   Also handles background continuous monitoring with 5-minute intervals
#
# DESCRIPTION
#   Runs comprehensive lint checks before every tool execution and outputs
#   results to development/reports/lint-results.md for Claude Code feedback.
#   Maintains activity tracking and runs background checks every 5 minutes.
#
# INPUT
#   JSON via stdin with PreToolUse/PostToolUse event data
#
# OUTPUT
#   Lint results written to development/reports/lint-results.md
#   JSON response for hook control
#
# EXIT CODES
#   0 - Continue with operation (lint passed or non-blocking)
#   2 - Show output to Claude (for feedback/information)

set +e

# Source common helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common-helpers.sh"

# Initialize paths
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPORTS_DIR="${PROJECT_ROOT}/development/reports"
LINT_RESULTS_FILE="${REPORTS_DIR}/lint-results.md"
ACTIVITY_FILE="${REPORTS_DIR}/.lint-activity"
LOG_DIR="${PROJECT_ROOT}/logs"
LOG_FILE="${LOG_DIR}/continuous-lint-monitor.log"

# Ensure directories exist
mkdir -p "$REPORTS_DIR" "$LOG_DIR"

# Function to log with timestamp
log_to_file() {
    local message="$1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" >> "$LOG_FILE"
}

# Track activity for continuous monitoring
track_activity() {
    echo "$(date +%s)" > "$ACTIVITY_FILE"
    log_to_file "Activity tracked: tool use detected"
}

# Check if we should run background lint (5-minute interval)
should_run_background_lint() {
    local current_time=$(date +%s)
    local last_activity=0
    local last_lint=0
    
    # Get last activity time
    if [[ -f "$ACTIVITY_FILE" ]]; then
        last_activity=$(cat "$ACTIVITY_FILE" 2>/dev/null || echo "0")
    fi
    
    # Get last lint time from results file
    if [[ -f "$LINT_RESULTS_FILE" ]]; then
        last_lint=$(stat -f %m "$LINT_RESULTS_FILE" 2>/dev/null || echo "0")
    fi
    
    # Check if it's been 5+ minutes since last lint AND there's been recent activity
    local time_since_lint=$((current_time - last_lint))
    local time_since_activity=$((current_time - last_activity))
    
    # Run if: more than 5 minutes since last lint AND activity within last 10 minutes
    if [[ $time_since_lint -gt 300 ]] && [[ $time_since_activity -lt 600 ]]; then
        log_to_file "Background lint check triggered: ${time_since_lint}s since last lint, ${time_since_activity}s since activity"
        return 0
    fi
    
    return 1
}

# Run comprehensive lint check and output to file
run_lint_check() {
    local trigger_type="$1"  # "pre-tool", "post-tool", or "background"
    
    log_to_file "Running lint check (trigger: $trigger_type)"
    
    # Capture all lint output
    local lint_output=""
    local lint_errors=0
    local lint_warnings=0
    
    # Detect project type
    local project_type=$(detect_project_type_with_tilt)
    log_to_file "Detected project type: $project_type"
    
    # Create temporary file for capturing lint output
    local temp_output=$(mktemp)
    
    # Run the actual linting by sourcing and calling the smart-lint functions
    cd "$PROJECT_ROOT"
    
    # Source the smart-lint script functions
    source "${SCRIPT_DIR}/smart-lint.sh" 2>/dev/null || true
    
    # Capture lint output
    {
        echo "# Lint Results Report"
        echo ""
        echo "**Generated:** $(date '+%Y-%m-%d %H:%M:%S')"
        echo "**Trigger:** $trigger_type"
        echo "**Project Type:** $project_type"
        echo ""
        
        # Run linting based on project type
        if [[ "$project_type" == mixed:* ]]; then
            local type_string="${project_type#mixed:}"
            IFS=',' read -ra TYPE_ARRAY <<< "$type_string"
            
            for type in "${TYPE_ARRAY[@]}"; do
                echo "## $type Linting"
                echo ""
                case "$type" in
                    "go") 
                        if type -t lint_go &>/dev/null; then
                            if ! lint_go 2>&1; then
                                lint_errors=$((lint_errors + 1))
                            fi
                        fi
                        ;;
                    "python") 
                        if ! lint_python 2>&1; then
                            lint_errors=$((lint_errors + 1))
                        fi
                        ;;
                    "javascript") 
                        if ! lint_javascript 2>&1; then
                            lint_errors=$((lint_errors + 1))
                        fi
                        ;;
                    "rust") 
                        if ! lint_rust 2>&1; then
                            lint_errors=$((lint_errors + 1))
                        fi
                        ;;
                    "nix") 
                        if ! lint_nix 2>&1; then
                            lint_errors=$((lint_errors + 1))
                        fi
                        ;;
                    "shell") 
                        if ! lint_shell 2>&1; then
                            lint_errors=$((lint_errors + 1))
                        fi
                        ;;
                    "tilt")
                        if type -t lint_tilt &>/dev/null; then
                            if ! lint_tilt 2>&1; then
                                lint_errors=$((lint_errors + 1))
                            fi
                        fi
                        ;;
                esac
                echo ""
            done
        else
            # Single project type
            echo "## $project_type Linting"
            echo ""
            case "$project_type" in
                "go") 
                    if type -t lint_go &>/dev/null; then
                        if ! lint_go 2>&1; then
                            lint_errors=$((lint_errors + 1))
                        fi
                    fi
                    ;;
                "python") 
                    if ! lint_python 2>&1; then
                        lint_errors=$((lint_errors + 1))
                    fi
                    ;;
                "javascript") 
                    if ! lint_javascript 2>&1; then
                        lint_errors=$((lint_errors + 1))
                    fi
                    ;;
                "rust") 
                    if ! lint_rust 2>&1; then
                        lint_errors=$((lint_errors + 1))
                    fi
                    ;;
                "nix") 
                    if ! lint_nix 2>&1; then
                        lint_errors=$((lint_errors + 1))
                    fi
                    ;;
                "shell") 
                    if ! lint_shell 2>&1; then
                        lint_errors=$((lint_errors + 1))
                    fi
                    ;;
                "tilt")
                    if type -t lint_tilt &>/dev/null; then
                        if ! lint_tilt 2>&1; then
                            lint_errors=$((lint_errors + 1))
                        fi
                    fi
                    ;;
                "unknown") 
                    echo "No recognized project type detected."
                    ;;
            esac
        fi
        
        echo ""
        echo "## Summary"
        echo ""
        if [[ $lint_errors -eq 0 ]]; then
            echo "✅ **All lint checks passed**"
        else
            echo "❌ **Found $lint_errors error(s) that need attention**"
        fi
        
        echo ""
        echo "---"
        echo "*Last updated: $(date '+%Y-%m-%d %H:%M:%S')*"
        
    } > "$temp_output" 2>&1
    
    # Move temp output to final location
    mv "$temp_output" "$LINT_RESULTS_FILE"
    
    log_to_file "Lint check completed: $lint_errors errors found"
    return $lint_errors
}

# Parse JSON input
JSON_INPUT=""
if [ ! -t 0 ]; then
    JSON_INPUT=$(cat)
fi

# Ensure jq is available
if ! command_exists jq; then
    log_to_file "jq not found - cannot parse JSON input"
    exit 0
fi

# Parse hook event if JSON input provided
if [[ -n "$JSON_INPUT" ]] && echo "$JSON_INPUT" | jq . >/dev/null 2>&1; then
    EVENT=$(echo "$JSON_INPUT" | jq -r '.hook_event_name // empty')
    TOOL_NAME=$(echo "$JSON_INPUT" | jq -r '.tool_name // empty')
    
    log_to_file "Hook event: $EVENT, Tool: $TOOL_NAME"
    
    # Track activity for any tool use
    track_activity
    
    # Handle different hook events
    case "$EVENT" in
        "PreToolUse")
            # Run lint check before tool execution
            if run_lint_check "pre-tool"; then
                log_to_file "Pre-tool lint check completed successfully"
            else
                log_to_file "Pre-tool lint check found issues"
            fi
            # Always continue with tool execution
            exit 0
            ;;
        "PostToolUse")
            # Run lint check after tool execution if it was a file modification
            if [[ "$TOOL_NAME" =~ ^(Edit|Write|MultiEdit)$ ]]; then
                if run_lint_check "post-tool"; then
                    log_to_file "Post-tool lint check completed successfully"
                else
                    log_to_file "Post-tool lint check found issues"
                fi
            fi
            # Exit with 2 to show results to Claude
            exit 2
            ;;
    esac
else
    # No JSON input - check if we should run background lint
    if should_run_background_lint; then
        log_to_file "Running background lint check"
        run_lint_check "background"
    fi
fi

# Default exit
exit 0