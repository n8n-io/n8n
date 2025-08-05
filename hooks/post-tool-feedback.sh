#!/usr/bin/env bash
# post-tool-feedback.sh - Post-tool feedback with lint results integration
#
# SYNOPSIS
#   Claude Code PostToolUse hook that provides feedback after tool execution
#   References lint results file when errors exist
#
# DESCRIPTION
#   Runs after every tool execution and provides contextual feedback to Claude.
#   If lint errors exist, points to the lint results file for details.
#   Integrates with continuous lint monitoring system.
#
# INPUT
#   JSON via stdin with PostToolUse event data
#
# OUTPUT
#   Feedback messages to Claude Code
#
# EXIT CODES
#   0 - Continue silently
#   2 - Show feedback message to Claude

set +e

# Source common helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common-helpers.sh"

# Initialize paths
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPORTS_DIR="${PROJECT_ROOT}/development/reports"
LINT_RESULTS_FILE="${REPORTS_DIR}/lint-results.md"
ACTIVITY_FILE="${REPORTS_DIR}/.lint-activity"
LOG_FILE="${PROJECT_ROOT}/logs/post-tool-feedback.log"

# Ensure directories exist
mkdir -p "$REPORTS_DIR" "$(dirname "$LOG_FILE")"

# Function to log with timestamp
log_to_file() {
    local message="$1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" >> "$LOG_FILE"
}

# Update activity timestamp
update_activity() {
    echo "$(date +%s)" > "$ACTIVITY_FILE"
    log_to_file "Activity updated: tool use detected"
}

# Check if lint results file has errors
has_lint_errors() {
    if [[ -f "$LINT_RESULTS_FILE" ]]; then
        # Check if the file contains error indicators
        if grep -q "❌" "$LINT_RESULTS_FILE" 2>/dev/null; then
            return 0  # Has errors
        fi
    fi
    return 1  # No errors or no file
}

# Get lint results summary
get_lint_summary() {
    if [[ -f "$LINT_RESULTS_FILE" ]]; then
        # Extract the summary section
        local summary=$(sed -n '/### Summary/,/---/p' "$LINT_RESULTS_FILE" | grep -E "(✅|❌|⚠️)" | head -3)
        if [[ -n "$summary" ]]; then
            echo "$summary"
        else
            echo "Lint results available in $LINT_RESULTS_FILE"
        fi
    else
        echo "No lint results available"
    fi
}

# Generate lint results if they don't exist or are stale
ensure_fresh_lint_results() {
    local current_time=$(date +%s)
    local file_age=0
    
    if [[ -f "$LINT_RESULTS_FILE" ]]; then
        if command -v stat >/dev/null 2>&1; then
            file_age=$(stat -f %m "$LINT_RESULTS_FILE" 2>/dev/null || echo "0")
        else
            file_age=$(date -r "$LINT_RESULTS_FILE" +%s 2>/dev/null || echo "0")
        fi
    fi
    
    local age_diff=$((current_time - file_age))
    
    # Generate results if file doesn't exist or is older than 2 minutes
    if [[ ! -f "$LINT_RESULTS_FILE" ]] || [[ $age_diff -gt 120 ]]; then
        log_to_file "Generating fresh lint results (age: ${age_diff}s)"
        if [[ -x "${SCRIPT_DIR}/lint-results-generator.sh" ]]; then
            "${SCRIPT_DIR}/lint-results-generator.sh" >/dev/null 2>&1
        else
            bash "${SCRIPT_DIR}/lint-results-generator.sh" >/dev/null 2>&1
        fi
    fi
}

# Parse JSON input
JSON_INPUT=""
if [ ! -t 0 ]; then
    JSON_INPUT=$(cat)
fi

# Ensure jq is available
if ! command_exists jq; then
    log_to_file "jq not found - limited functionality"
    update_activity
    exit 0
fi

# Parse hook event if JSON input provided
if [[ -n "$JSON_INPUT" ]] && echo "$JSON_INPUT" | jq . >/dev/null 2>&1; then
    EVENT=$(echo "$JSON_INPUT" | jq -r '.hook_event_name // empty')
    TOOL_NAME=$(echo "$JSON_INPUT" | jq -r '.tool_name // empty')
    TOOL_INPUT=$(echo "$JSON_INPUT" | jq -r '.tool_input // empty')
    
    log_to_file "Hook event: $EVENT, Tool: $TOOL_NAME"
    
    # Update activity tracking
    update_activity
    
    # Only process PostToolUse events
    if [[ "$EVENT" != "PostToolUse" ]]; then
        exit 0
    fi
    
    # Ensure we have fresh lint results
    ensure_fresh_lint_results
    
    # Determine feedback based on tool type and lint status
    case "$TOOL_NAME" in
        "Edit"|"Write"|"MultiEdit")
            # File modification tools - check lint status
            if has_lint_errors; then
                echo ""
                echo "⚠️  **Code Quality Alert**"
                echo ""
                echo "Recent file modifications detected. Lint check found issues:"
                echo ""
                get_lint_summary
                echo ""
                echo "📋 **Full lint report:** \`development/reports/lint-results.md\`"
                echo ""
                echo "Please review and fix any issues before continuing."
                echo ""
                log_to_file "Reported lint errors to Claude"
                exit 2
            else
                # No lint errors - provide positive feedback
                echo ""
                echo "✅ **Code quality check passed**"
                echo ""
                get_lint_summary
                echo ""
                log_to_file "Reported clean lint status to Claude"
                exit 2
            fi
            ;;
        "Read"|"Glob"|"Grep"|"LS")
            # Information gathering tools - run background lint check if due
            local current_time=$(date +%s)
            local last_lint=0
            
            if [[ -f "$LINT_RESULTS_FILE" ]]; then
                if command -v stat >/dev/null 2>&1; then
                    last_lint=$(stat -f %m "$LINT_RESULTS_FILE" 2>/dev/null || echo "0")
                else
                    last_lint=$(date -r "$LINT_RESULTS_FILE" +%s 2>/dev/null || echo "0")
                fi
            fi
            
            local time_since_lint=$((current_time - last_lint))
            
            # If it's been more than 5 minutes since last lint check, provide status
            if [[ $time_since_lint -gt 300 ]]; then
                ensure_fresh_lint_results
                
                if has_lint_errors; then
                    echo ""
                    echo "ℹ️  **Background Code Quality Check**"
                    echo ""
                    get_lint_summary
                    echo ""
                    echo "📋 **Details:** \`development/reports/lint-results.md\`"
                    echo ""
                    log_to_file "Provided background lint status with errors"
                    exit 2
                fi
            fi
            ;;
        "Bash")
            # Command execution - check if it was a build/test command
            local command=$(echo "$TOOL_INPUT" | jq -r '.command // empty')
            if [[ "$command" =~ (build|test|lint|check|compile) ]]; then
                ensure_fresh_lint_results
                
                echo ""
                echo "🔧 **Build/Test Command Completed**"
                echo ""
                get_lint_summary
                echo ""
                if has_lint_errors; then
                    echo "📋 **Lint issues detected:** \`development/reports/lint-results.md\`"
                else
                    echo "✅ **Code quality checks passing**"
                fi
                echo ""
                log_to_file "Provided post-build lint status"
                exit 2
            fi
            ;;
    esac
    
    # Default case - no specific feedback needed
    log_to_file "No specific feedback needed for $TOOL_NAME"
    exit 0
else
    # No valid JSON input - run as periodic background check
    log_to_file "Running as background check"
    update_activity
    ensure_fresh_lint_results
    exit 0
fi