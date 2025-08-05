#!/usr/bin/env bash
# lint-go_spec.sh - Tests for Go linting functions

# Note: spec_helper.sh is automatically loaded by ShellSpec via --require spec_helper

# Source common-helpers.sh and lint-go.sh to test the lint_go function
# shellcheck source=../../common-helpers.sh
source "$HOOK_DIR/common-helpers.sh"
# shellcheck source=../../lint-go.sh
source "$HOOK_DIR/lint-go.sh"

# Mock the add_error function from common-helpers
ERROR_COUNT=0
add_error() {
    ERROR_COUNT=$((ERROR_COUNT + 1))
    echo "Error: $1" >&2
}

# Reset error count before each test
reset_errors() {
    ERROR_COUNT=0
}

# Setup and cleanup functions
setup_clean_code() {
    setup_test_with_fixture "lint-go" "should-pass-clean-code"
}

setup_syntax_error() {
    setup_test_with_fixture "lint-go" "should-fail-syntax-error"
}

cleanup() {
    cleanup_test
}

Describe 'lint-go functions'
    Describe 'find_go_project_root'
        BeforeEach 'setup_clean_code'
        AfterEach 'cleanup'
        
        It 'finds go.mod in current directory'
            When call find_go_project_root
            The output should equal "$PWD"
            The status should equal 0
        End
        
        It 'finds go.mod in parent directory'
            mkdir -p subdir
            cd subdir
            When call find_go_project_root
            The output should equal "$(dirname "$PWD")"
            The status should equal 0
        End
        
        It 'returns current directory when no go.mod exists'
            cd "$SHELLSPEC_TMPBASE"
            mkdir -p no-go-project
            cd no-go-project
            When call find_go_project_root
            The output should equal "$PWD"
            The status should equal 1
        End
    End
    
    Describe 'lint_go function'
        BeforeEach 'reset_errors'
        
        Context 'with clean code'
            BeforeEach 'setup_clean_code'
            AfterEach 'cleanup'
            
            It 'runs successfully on clean Go code'
                # Mock gofmt and golangci-lint to succeed
                mock_command "gofmt" 0 ""
                mock_command "golangci-lint" 0 ""
                
                When call lint_go
                The variable ERROR_COUNT should equal 0
            End
        End
        
        Context 'with syntax errors'
            BeforeEach 'setup_syntax_error'
            AfterEach 'cleanup'
            
            It 'detects syntax errors'
                # Let real tools run on broken code
                When call lint_go
                The variable ERROR_COUNT should not equal 0
                The stderr should include "error"
            End
        End
    End
    
    
    Describe 'run_go_direct_lint function'
        BeforeEach 'reset_errors'
        
        Context 'with Makefile targets'
            BeforeEach 'setup_clean_code'
            AfterEach 'cleanup'
            
            It 'uses Makefile targets when available'
                # Create a Makefile with fmt and lint targets
                cat > Makefile << 'EOF'
fmt:
	@echo "Running make fmt" >&2

lint:
	@echo "Running make lint" >&2
EOF
                
                # Mock successful execution
                export CLAUDE_HOOKS_DEBUG=1
                
                When call lint_go
                The stderr should include "Using Makefile targets"
                The variable ERROR_COUNT should equal 0
            End
        End
        
        Context 'environment variables'
            BeforeEach 'setup_clean_code'
            AfterEach 'cleanup'
            
            It 'respects CLAUDE_HOOKS_GO_ENABLED'
                export CLAUDE_HOOKS_GO_ENABLED="false"
                When call lint_go
                The variable ERROR_COUNT should equal 0
                unset CLAUDE_HOOKS_GO_ENABLED
            End
            
            It 'respects CLAUDE_HOOKS_GO_DEADCODE_ENABLED'
                export CLAUDE_HOOKS_GO_DEADCODE_ENABLED="false"
                mock_command "gofmt" 0 ""
                mock_command "golangci-lint" 0 ""
                mock_command "deadcode" 0 "main.go:10:1: func unused is dead code"
                
                When call lint_go
                The stderr should not include "dead code"
                unset CLAUDE_HOOKS_GO_DEADCODE_ENABLED
            End
        End
    End
End