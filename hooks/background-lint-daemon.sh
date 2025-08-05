#!/usr/bin/env bash
# background-lint-daemon.sh - Background daemon for continuous lint monitoring
#
# SYNOPSIS
#   Background process that runs lint checks every 5 minutes when Claude is active
#
# DESCRIPTION
#   Monitors activity and runs continuous lint checks based on tool usage patterns.
#   Only runs when there has been recent activity to avoid unnecessary resource usage.
#   Maintains the lint results file for Claude Code feedback system.
#
# USAGE
#   ./background-lint-daemon.sh start    # Start the daemon
#   ./background-lint-daemon.sh stop     # Stop the daemon
#   ./background-lint-daemon.sh status   # Check daemon status
#   ./background-lint-daemon.sh run      # Run once (for testing)
#
# FILES
#   development/reports/.lint-daemon-pid  # PID file for daemon process
#   development/reports/.lint-activity    # Activity tracking file
#   development/reports/lint-results.md   # Lint results output
#   logs/background-lint-daemon.log      # Daemon activity log

set +e

# Source common helpers
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common-helpers.sh"

# Initialize paths
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPORTS_DIR="${PROJECT_ROOT}/development/reports"
LINT_RESULTS_FILE="${REPORTS_DIR}/lint-results.md"
ACTIVITY_FILE="${REPORTS_DIR}/.lint-activity"
PID_FILE="${REPORTS_DIR}/.lint-daemon-pid"
LOG_FILE="${PROJECT_ROOT}/logs/background-lint-daemon.log"

# Ensure directories exist
mkdir -p "$REPORTS_DIR" "$(dirname "$LOG_FILE")"

# Configuration
LINT_INTERVAL=300  # 5 minutes
MAX_IDLE_TIME=600  # 10 minutes - stop checking if no activity
CHECK_INTERVAL=60  # Check activity every minute

# Function to log with timestamp
log_to_file() {
    local message="$1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DAEMON] $message" >> "$LOG_FILE"
}

# Function to check if daemon is running
is_daemon_running() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE" 2>/dev/null)
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            return 0  # Running
        else
            # Stale PID file
            rm -f "$PID_FILE"
            return 1  # Not running
        fi
    fi
    return 1  # Not running
}

# Function to get last activity time
get_last_activity() {
    if [[ -f "$ACTIVITY_FILE" ]]; then
        cat "$ACTIVITY_FILE" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# Function to check if we should run lint
should_run_lint() {
    local current_time=$(date +%s)
    local last_activity=$(get_last_activity)
    local last_lint=0
    
    # Get last lint time from results file
    if [[ -f "$LINT_RESULTS_FILE" ]]; then
        if command -v stat >/dev/null 2>&1; then
            last_lint=$(stat -f %m "$LINT_RESULTS_FILE" 2>/dev/null || echo "0")
        else
            last_lint=$(date -r "$LINT_RESULTS_FILE" +%s 2>/dev/null || echo "0")
        fi
    fi
    
    local time_since_activity=$((current_time - last_activity))
    local time_since_lint=$((current_time - last_lint))
    
    # Run lint if:
    # 1. There's been activity within the last 10 minutes, AND
    # 2. It's been more than 5 minutes since last lint check
    if [[ $time_since_activity -lt $MAX_IDLE_TIME ]] && [[ $time_since_lint -gt $LINT_INTERVAL ]]; then
        log_to_file "Lint check needed: activity ${time_since_activity}s ago, lint ${time_since_lint}s ago"
        return 0
    fi
    
    return 1
}

# Function to run lint check
run_lint_check() {
    log_to_file "Running background lint check"
    
    cd "$PROJECT_ROOT"
    
    # Run the lint results generator
    if [[ -x "${SCRIPT_DIR}/lint-results-generator.sh" ]]; then
        "${SCRIPT_DIR}/lint-results-generator.sh" >> "$LOG_FILE" 2>&1
    else
        bash "${SCRIPT_DIR}/lint-results-generator.sh" >> "$LOG_FILE" 2>&1
    fi
    
    local exit_code=$?
    if [[ $exit_code -eq 0 ]]; then
        log_to_file "Background lint check completed successfully"
    else
        log_to_file "Background lint check completed with issues (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Function to start daemon
start_daemon() {
    if is_daemon_running; then
        echo "Daemon is already running (PID: $(cat "$PID_FILE"))"
        return 1
    fi
    
    echo "Starting background lint daemon..."
    log_to_file "Starting daemon (PID: $$)"
    
    # Write PID file
    echo $$ > "$PID_FILE"
    
    # Set up signal handlers
    trap 'cleanup_and_exit' TERM INT
    trap 'log_to_file "Received HUP signal, continuing"' HUP
    
    # Main daemon loop
    while true; do
        if should_run_lint; then
            run_lint_check
        fi
        
        # Check if we should continue running
        local current_time=$(date +%s)
        local last_activity=$(get_last_activity)
        local time_since_activity=$((current_time - last_activity))
        
        # If no activity for more than MAX_IDLE_TIME, consider stopping
        if [[ $time_since_activity -gt $MAX_IDLE_TIME ]]; then
            log_to_file "No activity for ${time_since_activity}s, but continuing to monitor"
            # Continue monitoring but less frequently when idle
            sleep $((CHECK_INTERVAL * 2))
        else
            sleep $CHECK_INTERVAL
        fi
    done
}

# Function to stop daemon
stop_daemon() {
    if ! is_daemon_running; then
        echo "Daemon is not running"
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    echo "Stopping daemon (PID: $pid)..."
    
    if kill "$pid" 2>/dev/null; then
        # Wait for graceful shutdown
        for i in {1..10}; do
            if ! kill -0 "$pid" 2>/dev/null; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            echo "Forcing daemon shutdown..."
            kill -9 "$pid" 2>/dev/null
        fi
        
        rm -f "$PID_FILE"
        echo "Daemon stopped"
        log_to_file "Daemon stopped"
    else
        echo "Failed to stop daemon"
        rm -f "$PID_FILE"  # Remove stale PID file
        return 1
    fi
}

# Function for cleanup on exit
cleanup_and_exit() {
    log_to_file "Daemon shutting down (PID: $$)"
    rm -f "$PID_FILE"
    exit 0
}

# Function to show daemon status
show_status() {
    if is_daemon_running; then
        local pid=$(cat "$PID_FILE")
        echo "Daemon is running (PID: $pid)"
        
        # Show recent activity
        local current_time=$(date +%s)
        local last_activity=$(get_last_activity)
        local time_since_activity=$((current_time - last_activity))
        
        echo "Last activity: ${time_since_activity}s ago"
        
        if [[ -f "$LINT_RESULTS_FILE" ]]; then
            local last_lint=0
            if command -v stat >/dev/null 2>&1; then
                last_lint=$(stat -f %m "$LINT_RESULTS_FILE" 2>/dev/null || echo "0")
            else
                last_lint=$(date -r "$LINT_RESULTS_FILE" +%s 2>/dev/null || echo "0")
            fi
            local time_since_lint=$((current_time - last_lint))
            echo "Last lint check: ${time_since_lint}s ago"
        else
            echo "No lint results file found"
        fi
    else
        echo "Daemon is not running"
    fi
}

# Function to run once (for testing)
run_once() {
    echo "Running single lint check..."
    log_to_file "Running single lint check (manual trigger)"
    
    # Update activity to current time
    echo "$(date +%s)" > "$ACTIVITY_FILE"
    
    run_lint_check
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        echo "Lint check completed successfully"
        echo "Results written to: $LINT_RESULTS_FILE"
    else
        echo "Lint check completed with issues"
        echo "Check results in: $LINT_RESULTS_FILE"
    fi
    
    return $exit_code
}

# Main script logic
case "${1:-}" in
    "start")
        start_daemon
        ;;
    "stop")
        stop_daemon
        ;;
    "restart")
        stop_daemon
        sleep 2
        start_daemon
        ;;
    "status")
        show_status
        ;;
    "run")
        run_once
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|run}"
        echo ""
        echo "Commands:"
        echo "  start    - Start the background lint daemon"
        echo "  stop     - Stop the background lint daemon"
        echo "  restart  - Restart the daemon"
        echo "  status   - Show daemon status"
        echo "  run      - Run lint check once (for testing)"
        echo ""
        echo "The daemon monitors for Claude Code activity and runs lint checks"
        echo "every 5 minutes when there has been recent tool usage."
        exit 1
        ;;
esac