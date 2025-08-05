#!/usr/bin/env bash
# smart-test_spec.sh - Tests for smart testing orchestrator

# Note: spec_helper.sh is automatically loaded by ShellSpec via --require spec_helper

# Custom matcher for status that accepts 0 or 2
status_is_0_or_2() {
    [ "${status_is_0_or_2:?}" -eq 0 ] || [ "${status_is_0_or_2:?}" -eq 2 ]
}

# Setup and cleanup functions
setup_go_pass() {
    setup_test_with_fixture "smart-test" "go-tests-pass"
}

setup_go_fail() {
    setup_test_with_fixture "smart-test" "go-tests-fail"
}

setup_python_pass() {
    setup_test_with_fixture "smart-test" "python-tests-pass"
}

setup_ignore_patterns() {
    setup_test_with_fixture "smart-test" "ignore-patterns"
}

cleanup() {
    cleanup_test
}

Describe 'smart-test.sh'
    Describe 'JSON input handling'
        BeforeEach 'setup_go_pass'
        AfterEach 'cleanup'
        
        It 'processes PostToolUse Edit events'
            When run run_hook_with_json "smart-test.sh" "$(create_post_tool_use_json "Edit" "math.go")"
            The status should equal 2
            The stderr should include "Tests pass. Continue with your task."
        End
        
        It 'processes PostToolUse Write events'
            When run run_hook_with_json "smart-test.sh" "$(create_post_tool_use_json "Write" "math.go")"
            The status should equal 2
            The stderr should include "Tests pass. Continue with your task."
        End
        
        It 'processes PostToolUse MultiEdit events'
            When run run_hook_with_json "smart-test.sh" "$(create_post_tool_use_json "MultiEdit" "math.go")"
            The status should equal 2
            The stderr should include "Tests pass. Continue with your task."
        End
        
        It 'ignores non-PostToolUse events'
            When run run_hook_with_json "smart-test.sh" '{"hook_event_name":"PreToolUse","tool_name":"Edit"}'
            The status should equal 0
            The output should equal ""
        End
        
        It 'ignores non-edit tools'
            When run run_hook_with_json "smart-test.sh" "$(create_post_tool_use_json "Read" "math.go")"
            The status should equal 0
            The output should equal ""
        End
    End
    
    Describe 'Go project testing'
        Describe 'passing tests'
            BeforeEach 'setup_go_pass'
            AfterEach 'cleanup'
            
            It 'runs tests and returns 2 when tests pass'
                When run run_hook_with_json "smart-test.sh" "$(create_post_tool_use_json "Edit" "math.go")"
                The status should equal 2
                The stderr should include "Tests pass. Continue with your task."
            End
        End
        
        Describe 'failing tests'
            BeforeEach 'setup_go_fail'
            AfterEach 'cleanup'
            
            It 'runs tests and returns 2 when tests fail'
                When run run_hook_with_json "smart-test.sh" "$(create_post_tool_use_json "Edit" "broken.go")"
                The status should equal 2
                The stderr should include "FAIL"
            End
        End
    End
    
    Describe 'Python project testing'
        BeforeEach 'setup_python_pass'
        AfterEach 'cleanup'
        
        It 'detects and runs Python tests'
            When run run_hook_with_json "smart-test.sh" "$(create_post_tool_use_json "Edit" "calculator.py")"
            The status should satisfy status_is_0_or_2
            # Python tests pass, so expect success message if status is 2
            The stderr should be present
        End
    End
    
    Describe 'Ignore patterns'
        BeforeEach 'setup_ignore_patterns'
        AfterEach 'cleanup'
        
        It 'respects .claude-hooks-ignore patterns'
            When run run_hook_with_json "smart-test.sh" "$(create_post_tool_use_json "Edit" "ignored.go")"
            The status should equal 0
            The output should equal ""
        End
    End
    
    
    Describe 'Project detection'
        It 'handles projects without test files gracefully'
            cd "$SHELLSPEC_TMPBASE"
            mkdir -p no-tests
            cd no-tests
            echo "module testproject" > go.mod
            create_go_file "main.go"
            
            When run run_hook_with_json "smart-test.sh" "$(create_post_tool_use_json "Edit" "main.go")"
            The status should equal 2
            The stderr should include "Tests pass. Continue with your task."
        End
    End
    
    Describe 'Debug mode'
        BeforeEach 'setup_go_pass'
        AfterEach 'cleanup'
        
        It 'shows debug output when enabled'
            When run run_hook_with_json_debug "smart-test.sh" "$(create_post_tool_use_json "Edit" "math.go")"
            The status should equal 2
            The output should include "DEBUG:"
            The output should include "Detected language: go"
            The output should include "Tests passed (debug mode active)"
        End
        
        It 'exits with code 2 when debug mode is enabled and tests pass'
            export CLAUDE_HOOKS_DEBUG=1
            When run run_hook_with_json "smart-test.sh" "$(create_post_tool_use_json "Edit" "math.go")"
            The status should equal 2
            The stderr should include "Tests passed (debug mode active)"
            # Should also include debug logs
            The stderr should include "[DEBUG]"
        End
        
        It 'exits normally when debug mode is disabled'
            export CLAUDE_HOOKS_DEBUG=0
            When run run_hook_with_json "smart-test.sh" "$(create_post_tool_use_json "Edit" "math.go")"
            The status should equal 2
            The stderr should include "Tests pass. Continue with your task."
            The stderr should not include "(debug mode active)"
        End
        
        It 'shows debug message for skipped files in debug mode'
            export CLAUDE_HOOKS_DEBUG=1
            echo "# claude-hooks-disable" > math.go
            When run run_hook_with_json "smart-test.sh" "$(create_post_tool_use_json "Edit" "math.go")"
            The status should equal 2
            The stderr should include "File was skipped (debug mode active)"
        End
    End
    
    Describe 'Project command integration'
        Describe 'Makefile integration'
            setup_makefile() {
                setup_test_with_fixture "smart-test" "makefile-test-project"
                export CLAUDE_HOOKS_DEBUG=0
                # Mock go test to avoid actual test runs
                mock_command "go" 0
                mock_command "gotestsum" 0
            }
            
            cleanup_makefile() {
                cleanup_test
            }
            
            BeforeEach 'setup_makefile'
            AfterEach 'cleanup_makefile'
            
            It 'uses make test instead of go test'
                When run run_hook_with_json_test_mode "smart-test.sh" "$(create_post_tool_use_json "Edit" "main.go")"
                The status should equal 2
                The stderr should include "Running 'make test'"
                The stderr should include "Running project tests with FILE=main.go"
                The stderr should not include "go test"
            End
            
            It 'passes relative path to make'
                mkdir -p src
                mv main.go src/
                mv main_test.go src/
                When run run_hook_with_json_test_mode "smart-test.sh" "$(create_post_tool_use_json "Edit" "$TEMP_DIR/src/main.go")"
                The status should equal 2
                The stderr should include "FILE=src/main.go"
            End
            
            It 'can be disabled via configuration'
                export CLAUDE_HOOKS_GO_USE_PROJECT_COMMANDS=false
                When run run_hook_with_json "smart-test.sh" "$(create_post_tool_use_json "Edit" "main.go")"
                The status should equal 2
                The stderr should not include "make test"
                The stderr should include "Tests pass. Continue with your task."
            End
        End
        
        Describe 'Scripts integration'
            setup_scripts() {
                setup_test_with_fixture "smart-test" "scripts-test-project"
                export CLAUDE_HOOKS_DEBUG=0
                # Mock pytest to avoid actual test runs
                mock_command "pytest" 0
                mock_command "python" 0
            }
            
            cleanup_scripts() {
                cleanup_test
            }
            
            BeforeEach 'setup_scripts'
            AfterEach 'cleanup_scripts'
            
            It 'uses scripts/test instead of pytest'
                When run run_hook_with_json_test_mode "smart-test.sh" "$(create_post_tool_use_json "Edit" "calculator.py")"
                The status should equal 2
                The stderr should include "Running 'scripts/test'"
                The stderr should include "Running project test script"
                The stderr should not include "pytest"
            End
            
            It 'passes file argument to script'
                When run run_hook_with_json_test_mode "smart-test.sh" "$(create_post_tool_use_json "Edit" "calculator.py")"
                The status should equal 2
                The stderr should include "FILE=calculator.py"
                The stderr should include "Testing specific file: calculator.py"
            End
        End
        
        Describe 'Configuration'
            setup_config() {
                setup_test_with_fixture "smart-test" "makefile-test-project"
                export CLAUDE_HOOKS_DEBUG=0
                # Create alternative targets
                cat >> Makefile << 'EOF'

test-unit:
	@echo "Running unit tests with FILE=$(FILE)"
	@exit 0

verify:
	@echo "Running verify target with FILE=$(FILE)"
	@exit 0
EOF
            }
            
            cleanup_config() {
                cleanup_test
            }
            
            BeforeEach 'setup_config'
            AfterEach 'cleanup_config'
            
            It 'respects custom make target configuration'
                export CLAUDE_HOOKS_MAKE_TEST_TARGETS="test-unit verify"
                When run run_hook_with_json_test_mode "smart-test.sh" "$(create_post_tool_use_json "Edit" "main.go")"
                The status should equal 2
                The stderr should include "Running 'make test-unit'"
                The stderr should include "Running unit tests"
                The stderr should not include "Running 'make test'"
            End
            
            It 'tries targets in order'
                export CLAUDE_HOOKS_MAKE_TEST_TARGETS="nonexistent test"
                When run run_hook_with_json_test_mode "smart-test.sh" "$(create_post_tool_use_json "Edit" "main.go")"
                The status should equal 2
                The stderr should include "Running 'make test'"
            End
            
            It 'handles make failures'
                # Create a failing make target
                cat > Makefile << 'EOF'
test:
	@echo "Tests failed!" >&2
	@exit 1
EOF
                When run run_hook_with_json "smart-test.sh" "$(create_post_tool_use_json "Edit" "main.go")"
                The status should equal 2
                The stderr should include "Tests failed!"
                The stderr should include "Tests failed (make test)"
                The stderr should include "BLOCKING: Must fix ALL test failures"
            End
        End
    End
End