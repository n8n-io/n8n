#!/usr/bin/env bash
# ntfy-notifier.sh - Send notifications to ntfy service for Claude Code events
#
# SYNOPSIS
#   ntfy-notifier.sh [--debug]
#   echo '{"event":"PostToolUse","tool":"Edit","tool_input":{"file_path":"test.go"}}' | ntfy-notifier.sh
#
# DESCRIPTION
#   Sends push notifications via ntfy service when Claude Code events occur.
#   Supports both CLI mode for testing and hook mode for actual notifications.
#
# CONFIGURATION
#   CLAUDE_HOOKS_NTFY_DISABLED  Set to "true" to disable notifications (enabled by default)
#   CLAUDE_HOOKS_NTFY_URL       Full ntfy URL (e.g., https://ntfy.sh/mytopic)
#   CLAUDE_HOOKS_NTFY_TOKEN     Optional authentication token
#
# EXAMPLES
#   # Test notification in CLI mode
#   ./ntfy-notifier.sh
#
#   # Hook mode (JSON input from stdin)
#   echo '{"event":"PostToolUse","tool":"Edit","tool_input":{"file_path":"test.go"}}' | ./ntfy-notifier.sh
#
# ERROR HANDLING
#   - Validates configuration
#   - Retries failed notifications
#   - Rate limits to prevent spam

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

# Parse command line arguments
DEBUG=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --debug)
            DEBUG=true
            shift
            ;;
        *)
            # Ignore any other arguments
            shift
            ;;
    esac
done

# Use CLAUDE_HOOKS_DEBUG environment variable or command line flag
if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]] || [[ "$DEBUG" == "true" ]]; then
    DEBUG=true
fi

# Debug logging function
log_debug() {
    if [[ "$DEBUG" == "true" ]]; then
        echo "[DEBUG] $*" >&2
    fi
}

# Check if notifications are disabled (enabled by default)
if [[ "${CLAUDE_HOOKS_NTFY_DISABLED:-}" == "true" ]]; then
    log_debug "ntfy notifications disabled (CLAUDE_HOOKS_NTFY_DISABLED == true)"
    exit 0
fi

# Try to read configuration from file if CLAUDE_HOOKS_NTFY_URL is not set
if [[ -z "${CLAUDE_HOOKS_NTFY_URL:-}" ]]; then
    CONFIG_FILE="$HOME/.config/claude-code-ntfy/config.yaml"
    if [[ -f "$CONFIG_FILE" ]]; then
        # Extract ntfy_server and ntfy_topic from config file
        NTFY_SERVER=$(grep "^ntfy_server:" "$CONFIG_FILE" 2>/dev/null | sed 's/^ntfy_server:[ ]*//' | tr -d '"' || true)
        NTFY_TOPIC=$(grep "^ntfy_topic:" "$CONFIG_FILE" 2>/dev/null | sed 's/^ntfy_topic:[ ]*//' | tr -d '"' || true)
        
        if [[ -n "$NTFY_SERVER" ]] && [[ -n "$NTFY_TOPIC" ]]; then
            export CLAUDE_HOOKS_NTFY_URL="${NTFY_SERVER}/${NTFY_TOPIC}"
            log_debug "Loaded ntfy config from $CONFIG_FILE"
            log_debug "Server: $NTFY_SERVER, Topic: $NTFY_TOPIC"
        fi
    fi
fi

# Check configuration
if [[ -z "${CLAUDE_HOOKS_NTFY_URL:-}" ]]; then
    log_debug "CLAUDE_HOOKS_NTFY_URL not configured"
    echo "CLAUDE_HOOKS_NTFY_URL not configured" >&2
    exit 0
fi

# Check if curl is available
if ! command -v curl >/dev/null 2>&1; then
    log_debug "curl not found"
    echo "curl not found" >&2
    exit 0
fi

if [[ "$DEBUG" == "true" ]]; then
    log_debug "ntfy is enabled"
    log_debug "URL: ${CLAUDE_HOOKS_NTFY_URL}"
    if [[ -n "${CLAUDE_HOOKS_NTFY_TOKEN:-}" ]]; then
        log_debug "Token: [configured]"
    fi
fi

# Rate limiting - prevent notification spam
RATE_LIMIT_FILE="/tmp/.claude-ntfy-rate-limit"
if [[ -f "$RATE_LIMIT_FILE" ]]; then
    LAST_NOTIFICATION=$(cat "$RATE_LIMIT_FILE" 2>/dev/null) || LAST_NOTIFICATION="0"
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - LAST_NOTIFICATION))
    
    # Limit to one notification per 2 seconds
    if [[ $TIME_DIFF -lt 2 ]]; then
        log_debug "Rate limit: skipping notification (last was ${TIME_DIFF}s ago)"
        exit 0
    fi
fi
date +%s > "$RATE_LIMIT_FILE"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

# Function to clean terminal title
clean_terminal_title() {
    local title="$1"
    # Remove Claude icons and control characters
    echo "$title" | sed -E 's/[✅🤖⚡✨🔮💫☁️🌟🚀🎯🔍🛡️📝🧠🖨️🔐📤⏳❌⚠️]//g' | sed 's/[[:cntrl:]]//g' | xargs
}

# Get terminal title with improved detection
get_terminal_title() {
    local title=""
    
    if [[ "${TERM_PROGRAM:-}" == "tmux" ]] && command -v tmux >/dev/null 2>&1; then
        # In tmux, get the current pane's info
        if [[ -n "${TMUX:-}" ]]; then
            # Get the current pane's window name
            local window_name
            window_name=$(tmux display-message -p '#W' 2>/dev/null || echo "")
            local pane_title
            pane_title=$(tmux display-message -p '#{pane_title}' 2>/dev/null || echo "")
            
            if [[ -n "$window_name" ]]; then
                title="$window_name"
                [[ -n "$pane_title" && "$pane_title" != "$window_name" ]] && title="$title - $pane_title"
            fi
        else
            # Not in a tmux session, just get the shell's tty
            title="tty: $(tty 2>/dev/null | xargs basename)"
        fi
    elif [[ "${TERM_PROGRAM:-}" == "kitty" ]] && command -v kitty >/dev/null 2>&1; then
        # Kitty: Get window title using kitty remote control
        title=$(kitty @ ls | jq -r '.[] | select(.is_focused) | .tabs[] | select(.is_focused) | .title' 2>/dev/null || echo "")
        if [[ -z "$title" ]]; then
            # Fallback: get from environment if remote control is disabled
            title="${KITTY_WINDOW_TITLE:-Kitty}"
        fi
    elif [[ "$(uname)" == "Darwin" ]] && command -v osascript >/dev/null 2>&1; then
        # macOS: Get Terminal or iTerm2 window title
        if [[ "${TERM_PROGRAM:-}" == "iTerm.app" ]]; then
            title=$(osascript -e 'tell application "iTerm2" to name of current window' 2>/dev/null || echo "")
        elif [[ "${TERM_PROGRAM:-}" == "Apple_Terminal" ]]; then
            title=$(osascript -e 'tell application "Terminal" to name of front window' 2>/dev/null || echo "")
        fi
    elif [[ -n "${DISPLAY:-}" ]] && command -v xprop >/dev/null 2>&1; then
        # Linux with X11: Get window title
        local window_id
        window_id=$(xprop -root _NET_ACTIVE_WINDOW 2>/dev/null | awk '{print $5}')
        if [[ -n "$window_id" && "$window_id" != "0x0" ]]; then
            title=$(xprop -id "$window_id" WM_NAME 2>/dev/null | cut -d'"' -f2 || echo "")
        fi
    elif [[ -n "${WAYLAND_DISPLAY:-}" ]] && command -v swaymsg >/dev/null 2>&1; then
        # Wayland with Sway: Get focused window title
        title=$(swaymsg -t get_tree | jq -r '.. | select(.focused? == true) | .name' 2>/dev/null || echo "")
    fi
    
    clean_terminal_title "$title"
}

# Get context information
get_context() {
    local cwd_basename
    cwd_basename=$(basename "$PWD")
    local term_title
    term_title=$(get_terminal_title)
    
    local context="Claude Code: $cwd_basename"
    if [[ -n "$term_title" ]]; then
        context="$context - $term_title"
    fi
    echo "$context"
}

# Function to send notification with retry
send_notification() {
    local title="$1"
    local message="$2"
    local max_retries=2
    local retry_count=0
    
    log_debug "send_notification called with title: $title, message: $message"
    
    while [[ $retry_count -lt $max_retries ]]; do
        local curl_args=(-s --max-time 5 -X POST)
        
        # Add title header
        curl_args+=(-H "Title: $title")
        
        # Add authentication if token is configured
        if [[ -n "${CLAUDE_HOOKS_NTFY_TOKEN:-}" ]]; then
            curl_args+=(-H "Authorization: Bearer ${CLAUDE_HOOKS_NTFY_TOKEN}")
        fi
        
        # Add message and URL
        curl_args+=(-d "$message" "$CLAUDE_HOOKS_NTFY_URL")
        
        # Log curl args but hide the auth token
        local safe_args=()
        for arg in "${curl_args[@]}"; do
            if [[ "$arg" == "Authorization: Bearer"* ]]; then
                safe_args+=("Authorization: Bearer [REDACTED]")
            else
                safe_args+=("$arg")
            fi
        done
        log_debug "Attempting curl with args: ${safe_args[*]}"
        
        if curl "${curl_args[@]}" >/dev/null 2>&1; then
            log_debug "Notification sent successfully"
            return 0
        else
            log_debug "Curl failed (attempt $((retry_count + 1))/$max_retries)"
        fi
        
        retry_count=$((retry_count + 1))
        [[ $retry_count -lt $max_retries ]] && sleep 1
    done
    
    log_debug "Failed to send notification after $max_retries attempts"
    echo "Failed to send notification after $max_retries attempts" >&2
    return 1
}

# Format notification message for different tools
format_notification() {
    local tool="$1"
    local tool_input="$2"
    
    case "$tool" in
        "Edit"|"Write"|"MultiEdit")
            if command -v jq >/dev/null 2>&1; then
                local file_path
                file_path=$(echo "$tool_input" | jq -r '.file_path // empty' 2>/dev/null)
                if [[ -n "$file_path" ]]; then
                    # Truncate long paths
                    if [[ ${#file_path} -gt 50 ]]; then
                        file_path="...${file_path: -47}"
                    fi
                    echo "$tool: $file_path"
                else
                    echo "$tool"
                fi
            else
                echo "$tool"
            fi
            ;;
        "Bash")
            if command -v jq >/dev/null 2>&1; then
                local command
                command=$(echo "$tool_input" | jq -r '.command // empty' 2>/dev/null)
                if [[ -n "$command" ]]; then
                    # Truncate long commands
                    if [[ ${#command} -gt 50 ]]; then
                        command="${command:0:47}..."
                    fi
                    echo "$tool: $command"
                else
                    echo "$tool"
                fi
            else
                echo "$tool"
            fi
            ;;
        "Read")
            # Ignore Read tool notifications
            log_debug "Ignoring Read tool"
            return 1
            ;;
        *)
            log_debug "Formatting notification for tool: $tool"
            echo "$tool"
            ;;
    esac
}

# ============================================================================
# MAIN LOGIC
# ============================================================================

# Check if we have JSON input (hook mode)
if [[ ! -t 0 ]]; then
    # Read JSON input
    JSON_INPUT=$(cat)
    
    # Log raw JSON input for debugging
    log_debug "Raw JSON input: $JSON_INPUT"
    
    # Ensure jq is available for JSON parsing
    if ! command -v jq >/dev/null 2>&1; then
        log_debug "jq not available for JSON parsing"
        exit 0
    fi
    
    # Parse JSON input
    if echo "$JSON_INPUT" | jq . >/dev/null 2>&1; then
        EVENT=$(echo "$JSON_INPUT" | jq -r '.hook_event_name // empty' 2>/dev/null)
        TOOL_NAME=$(echo "$JSON_INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
        TOOL_INPUT=$(echo "$JSON_INPUT" | jq -r '.tool_input // "{}"' 2>/dev/null)
        TOOL_RESPONSE=$(echo "$JSON_INPUT" | jq -r '.tool_response // "{}"' 2>/dev/null)
        
        log_debug "Parsed event: $EVENT"
        log_debug "Tool name: $TOOL_NAME"
        log_debug "Tool input: $TOOL_INPUT"
        log_debug "Tool response: $TOOL_RESPONSE"
        
        # Get context for all notification types
        CONTEXT=$(get_context)
        
        # Process different event types
        if [[ "$EVENT" == "PostToolUse" ]]; then
            # Format notification message
            if MESSAGE=$(format_notification "$TOOL_NAME" "$TOOL_INPUT"); then
                log_debug "Sending notification: $MESSAGE"
                send_notification "$CONTEXT" "$MESSAGE"
            else
                log_debug "Ignoring tool: $TOOL_NAME"
                exit 0
            fi
        elif [[ "$EVENT" == "Stop" ]] || [[ "$EVENT" == "SubagentStop" ]]; then
            # Handle Stop events
            log_debug "Processing Stop event: $EVENT"
            MESSAGE="Claude finished responding"
            send_notification "$CONTEXT" "$MESSAGE"
        elif [[ "$EVENT" == "Notification" ]]; then
            # Handle Notification events
            MESSAGE=$(echo "$JSON_INPUT" | jq -r '.message // "Notification"' 2>/dev/null)
            log_debug "Processing Notification event: $MESSAGE"
            send_notification "$CONTEXT" "$MESSAGE"
        else
            log_debug "Ignoring unknown event: $EVENT"
            exit 0
        fi
    else
        log_debug "Invalid JSON input"
        # Log the raw input for debugging
        log_debug "Raw input was: $JSON_INPUT"
        echo "Invalid JSON input received by ntfy-notifier.sh" >&2
        exit 0
    fi
else
    # CLI mode - send test notification
    CONTEXT=$(get_context)
    MESSAGE="Test notification from CLI"
    log_debug "Sending test notification"
    send_notification "$CONTEXT" "$MESSAGE"
fi

# Clean up old rate limit files (older than 1 hour)
find /tmp -name ".claude-ntfy-rate-limit" -mmin +60 -delete 2>/dev/null || true