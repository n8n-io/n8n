#!/bin/bash
# Claude hooks configuration

# Export custom variables
export CLAUDE_HOOKS_CUSTOM_VAR="custom_value"
export CLAUDE_HOOKS_LINT_TIMEOUT="30"
export CLAUDE_HOOKS_TEST_PARALLEL="true"

# Custom function available to hooks
custom_hook_function() {
    echo "This is a custom function from config"
}
