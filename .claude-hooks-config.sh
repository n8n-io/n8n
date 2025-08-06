#!/usr/bin/env bash
# Claude Hooks Configuration for Continuous Lint Monitoring
# This file is sourced by the hook scripts to customize behavior

# Enable continuous lint monitoring
export CLAUDE_HOOKS_ENABLED="true"

# Enable all language linters
export CLAUDE_HOOKS_GO_ENABLED="true"
export CLAUDE_HOOKS_PYTHON_ENABLED="true"
export CLAUDE_HOOKS_JS_ENABLED="true"
export CLAUDE_HOOKS_RUST_ENABLED="true"
export CLAUDE_HOOKS_NIX_ENABLED="true"
export CLAUDE_HOOKS_SHELL_ENABLED="true"
export CLAUDE_HOOKS_TILT_ENABLED="true"

# Continuous monitoring settings
export CLAUDE_HOOKS_CONTINUOUS_LINT="true"
export CLAUDE_HOOKS_LINT_INTERVAL="300"  # 5 minutes
export CLAUDE_HOOKS_MAX_IDLE_TIME="600"  # 10 minutes

# Fail fast on errors (optional)
export CLAUDE_HOOKS_FAIL_FAST="false"

# Show timing information (optional)
export CLAUDE_HOOKS_SHOW_TIMING="false"

# Debug mode (optional)
export CLAUDE_HOOKS_DEBUG="0"
