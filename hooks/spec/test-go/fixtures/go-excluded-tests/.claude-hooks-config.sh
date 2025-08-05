#!/bin/bash
# Claude hooks configuration for go-excluded-tests project

# Exclude integration tests from test-go hook
export CLAUDE_GO_TEST_EXCLUDE="integration/"

# You can also exclude specific test files or patterns:
# export CLAUDE_GO_TEST_EXCLUDE="integration/,*_integration_test.go"

# Or exclude multiple directories:
# export CLAUDE_GO_TEST_EXCLUDE="integration/,e2e/,benchmark/"