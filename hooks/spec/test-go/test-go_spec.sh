#!/usr/bin/env bash
# test-go_spec.sh - Tests for test-go.sh functions

# Note: spec_helper.sh is automatically loaded by ShellSpec via --require spec_helper

# Setup and cleanup functions
setup_basic() {
    TEMP_DIR=$(create_test_dir)
    cd "$TEMP_DIR" || return
    export CLAUDE_HOOKS_DEBUG=0
    export CLAUDE_HOOKS_ENABLE_RACE="false"
    unset CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS
    unset CLAUDE_HOOKS_TEST_MODES
    # Initialize error tracking
    export CLAUDE_HOOKS_ERROR_COUNT=0
    export CLAUDE_HOOKS_ERRORS=()
}

setup_go_project() {
    setup_test_with_fixture "test-go" "go-with-tests"
}

setup_go_no_tests() {
    setup_test_with_fixture "test-go" "go-no-tests"
}

setup_go_failing() {
    setup_test_with_fixture "test-go" "go-failing-tests"
}

setup_go_excluded() {
    setup_test_with_fixture "test-go" "go-excluded-tests"
}

setup_go_nested() {
    setup_test_with_fixture "test-go" "go-nested-packages"
}

cleanup() {
    cleanup_test
}

# Source the required files
source_test_go() {
    # shellcheck source=/dev/null
    source "$HOOK_DIR/common-helpers.sh"
    # shellcheck source=/dev/null
    source "$HOOK_DIR/test-go.sh"
}

Describe 'test-go.sh'
    BeforeAll 'source_test_go'
    
    Describe 'find_go_project_root()'
        BeforeEach 'setup_go_project'
        AfterEach 'cleanup'
        
        It 'finds go.mod in current directory'
            When call find_go_project_root
            The output should equal "$TEMP_DIR"
            The status should be success
        End
        
        It 'finds go.mod in parent directory'
            cd pkg/util || return
            When call find_go_project_root
            The output should equal "$TEMP_DIR"
            The status should be success
        End
        
        It 'returns current directory when no go.mod'
            rm go.mod
            When call find_go_project_root
            The output should equal "$TEMP_DIR"
            The status should be failure
        End
    End
    
    Describe 'find_go_project_root_for_file()'
        BeforeEach 'setup_go_project'
        AfterEach 'cleanup'
        
        It 'finds project root for file'
            When call find_go_project_root_for_file "pkg/util/helper.go"
            The output should equal "$TEMP_DIR"
            The status should be success
        End
        
        It 'handles relative paths'
            When call find_go_project_root_for_file "./main.go"
            The output should match pattern "*test-*"
            The status should be success
        End
        
        It 'returns failure when no go.mod found'
            rm go.mod
            When call find_go_project_root_for_file "main.go"
            The status should be failure
        End
    End
    
    Describe 'setup_go_test_command()'
        BeforeEach 'setup_basic'
        AfterEach 'cleanup'
        
        It 'configures test command'
            When call setup_go_test_command
            The variable GO_TEST_CMD should be present
            The value "$GO_TEST_CMD" should not equal ""
        End
        
        It 'adds race flag when enabled'
            export CLAUDE_HOOKS_ENABLE_RACE=true
            mock_command "go"
            When call setup_go_test_command
            The variable GO_TEST_CMD should include "-race"
        End
        
        It 'omits race flag when disabled'
            export CLAUDE_HOOKS_ENABLE_RACE=false
            mock_command "go"
            When call setup_go_test_command
            The variable GO_TEST_CMD should not include "-race"
        End
    End
    
    Describe 'run_go_tests()'
        BeforeEach 'setup_go_project'
        AfterEach 'cleanup'
        
        Context 'with passing tests'
            It 'runs tests successfully'
                mock_command "go" 0
                export CLAUDE_HOOKS_TEST_MODES="package"
                When call run_go_tests "./main.go"
                The status should be success
            End
            
            It 'runs focused tests for specific file'
                mock_command "go" 0
                export CLAUDE_HOOKS_TEST_MODES="focused"
                When call run_go_tests "main.go"
                The status should be success
            End
            
            It 'runs all project tests'
                mock_command "go" 0
                export CLAUDE_HOOKS_TEST_MODES="all"
                When call run_go_tests "./..."
                The status should be success
            End
        End
        
        Context 'with failing tests'
            BeforeEach 'setup_go_failing'
            
            It 'returns failure when tests fail'
                # Mock go test to return failure
                mock_command_with_output "go" 1 "FAIL: TestSomething"
                export CLAUDE_HOOKS_TEST_MODES="package"
                When call run_go_tests "./calculator.go"
                The status should be failure
                The stderr should include "FAIL"
            End
        End
        
        Context 'with no tests'
            BeforeEach 'setup_go_no_tests'
            
            It 'handles missing test files gracefully'
                mock_command "go" 0
                export CLAUDE_HOOKS_TEST_MODES="focused"
                When call run_go_tests "main.go"
                The status should be success
                The stderr should include "No test files found"
            End
        End
        
        Context 'with excluded patterns'
            BeforeEach 'setup_go_excluded'
            
            It 'skips tests matching exclusion patterns'
                export CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS="integration"
                export CLAUDE_HOOKS_TEST_MODES="package"
                mock_command "go" 0
                When call run_go_tests "./integration/api_test.go"
                The status should be success
                The stderr should include "Skipping tests matching exclusion pattern"
            End
            
            It 'runs tests not matching exclusion patterns'
                export CLAUDE_HOOKS_GO_TEST_EXCLUDE_PATTERNS="integration"
                export CLAUDE_HOOKS_TEST_MODES="package"
                mock_command "go" 0
                When call run_go_tests "./unit/logic_test.go"
                The status should be success
            End
        End
    End
    
    Describe 'should_skip_go_test_requirement()'
        BeforeEach 'setup_basic'
        AfterEach 'cleanup'
        
        It 'skips main.go'
            When call should_skip_go_test_requirement "main.go"
            The status should be success
        End
        
        It 'skips files matching generated pattern'
            When call should_skip_go_test_requirement "api_generated.go"
            The status should be success
        End
        
        It 'skips protobuf files'
            When call should_skip_go_test_requirement "api.pb.go"
            The status should be success
        End
        
        It 'skips test files themselves'
            When call should_skip_go_test_requirement "util_test.go"
            The status should be success
        End
        
        It 'skips files in vendor directory'
            When call should_skip_go_test_requirement "vendor/lib/util.go"
            The status should be success
        End
        
        It 'does not skip regular source files'
            When call should_skip_go_test_requirement "pkg/util/helper.go"
            The status should be failure
        End
        
        It 'does not skip service files'
            When call should_skip_go_test_requirement "internal/service/user.go"
            The status should be failure
        End
    End
    
    Describe 'format_test_output()'
        BeforeEach 'setup_basic'
        AfterEach 'cleanup'
        
        It 'handles empty output'
            When call format_test_output ""
            The output should equal "(no output captured)"
        End
        
        It 'passes through non-empty output'
            When call format_test_output "FAIL: TestSomething"
            The output should equal "FAIL: TestSomething"
        End
    End
End