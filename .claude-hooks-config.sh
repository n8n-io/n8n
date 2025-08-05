#\!/usr/bin/env bash
# Claude Hooks Configuration for Continuous Lint Monitoring

# Enable continuous lint monitoring
export CLAUDE_HOOKS_ENABLED="true"

# Enable all language linters
export CLAUDE_HOOKS_GO_ENABLED="true"
export CLAUDE_HOOKS_PYTHON_ENABLED="true"
export CLAUDE_HOOKS_JS_ENABLED="true"
export CLAUDE_HOOKS_RUST_ENABLED="false"  # No Rust in n8n project
export CLAUDE_HOOKS_NIX_ENABLED="false"   # No Nix in n8n project
export CLAUDE_HOOKS_SHELL_ENABLED="true"
export CLAUDE_HOOKS_TILT_ENABLED="false"  # No Tilt in n8n project

# Continuous monitoring settings
export CLAUDE_HOOKS_CONTINUOUS_LINT="true"
export CLAUDE_HOOKS_LINT_INTERVAL="300"  # 5 minutes
export CLAUDE_HOOKS_MAX_IDLE_TIME="600"  # 10 minutes

# Optional settings optimized for large codebase
export CLAUDE_HOOKS_FAIL_FAST="false"     # Don't stop on first error in large codebase
export CLAUDE_HOOKS_SHOW_TIMING="false"   # Keep clean output
export CLAUDE_HOOKS_DEBUG="0"             # Set to 1 for debug output

# Performance settings for large codebase
export CLAUDE_HOOKS_GO_DEADCODE_ENABLED="false"  # Disable for speed
export CLAUDE_HOOKS_QUICK_MODE="true"            # Enable quick mode for large projects
EOF < /dev/null