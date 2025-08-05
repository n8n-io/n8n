#!/usr/bin/env bash
# test-tilt_spec.sh - Tests for test-tilt.sh functions

# Note: spec_helper.sh is automatically loaded by ShellSpec via --require spec_helper

# Setup and cleanup functions
setup_basic() {
    TEMP_DIR=$(create_test_dir)
    cd "$TEMP_DIR" || return
    export CLAUDE_HOOKS_DEBUG=0
    # Initialize error tracking
    export CLAUDE_HOOKS_ERROR_COUNT=0
    export CLAUDE_HOOKS_ERRORS=()
}

setup_valid_tiltfile() {
    setup_test_with_fixture "test-tilt" "valid-tiltfile-with-tests"
}

setup_tiltfile_no_tests() {
    setup_test_with_fixture "test-tilt" "tiltfile-without-tests"
}

setup_makefile_integration() {
    setup_test_with_fixture "test-tilt" "makefile-integration"
}

setup_syntax_error() {
    setup_test_with_fixture "test-tilt" "syntax-error"
}

setup_multiple_test_patterns() {
    setup_test_with_fixture "test-tilt" "multiple-test-patterns"
}

setup_nested_tiltfiles() {
    setup_test_with_fixture "test-tilt" "nested-tiltfiles"
}

setup_ignore_patterns() {
    setup_test_with_fixture "test-tilt" "ignore-patterns"
}

setup_pytest_tests() {
    setup_test_with_fixture "test-tilt" "pytest-tests"
}

setup_unittest_tests() {
    setup_test_with_fixture "test-tilt" "unittest-tests"
}

setup_tilt_validation() {
    setup_test_with_fixture "test-tilt" "tilt-validation"
}

setup_edge_cases() {
    setup_test_with_fixture "test-tilt" "edge-cases"
}

cleanup() {
    cleanup_test
    unset CLAUDE_HOOKS_FILE_SKIPPED
}

# Source the required files
source_test_tilt() {
    # shellcheck source=/dev/null
    source "$HOOK_DIR/common-helpers.sh"
    
    # Stub format_test_output function that's normally provided by smart-test.sh
    format_test_output() {
        local output="$1"
        # Just echo the output as-is for testing
        echo "$output"
    }
    
    # shellcheck source=/dev/null
    source "$HOOK_DIR/test-tilt.sh"
}

# Initialize error tracking for tests
init_error_tracking() {
    declare -g -i CLAUDE_HOOKS_ERROR_COUNT=0
    declare -g -a CLAUDE_HOOKS_ERRORS=()
}

# Helper to mock commands with stdout output
mock_command_stdout() {
    local command="$1"
    local exit_code="${2:-0}"
    local output="${3:-}"
    
    # Create mock directory if it doesn't exist
    local mock_dir="$TEMP_DIR/.mocks"
    mkdir -p "$mock_dir"
    
    # Create mock script
    {
        echo '#!/usr/bin/env bash'
        echo "# Mock for $command with stdout - auto-generated"
        echo 'echo "$@" >> "${0}.args"'
        # Use printf to avoid any interpretation issues
        echo "printf '%s\n' '$output'"
        echo "exit $exit_code"
    } > "${mock_dir}/${command}"
    
    chmod +x "${mock_dir}/${command}"
    
    # Add to PATH
    export PATH="${mock_dir}:$PATH"
}

Describe 'test-tilt.sh'
    BeforeAll 'source_test_tilt'
    
    Describe 'run_tilt_tests()'
        Describe 'file type detection'
            setup_file_detection() {
                setup_basic
                # Mock commands to prevent actual execution
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                mock_command "python3" 0
                mock_command "python" 0
            }
            
            BeforeEach 'setup_file_detection'
            AfterEach 'cleanup'
            
            It 'processes Tiltfile'
                echo 'print("test")' > Tiltfile
                When call run_tilt_tests "Tiltfile"
                The status should be success
                The stderr should include "Validating Tiltfile"
            End
            
            It 'processes .tiltfile extension'
                echo 'print("test")' > config.tiltfile
                When call run_tilt_tests "config.tiltfile"
                The status should be success
                The stderr should include "Validating Tiltfile"
            End
            
            It 'processes .star files'
                echo 'def test(): pass' > lib.star
                When call run_tilt_tests "lib.star"
                The status should be success
                The stderr should include "Validating Tiltfile"
            End
            
            It 'processes .bzl files'
                echo 'def rule(): pass' > BUILD.bzl
                When call run_tilt_tests "BUILD.bzl"
                The status should be success
                The stderr should include "Validating Tiltfile"
            End
            
            It 'skips non-Tiltfile files'
                echo 'print("test")' > test.py
                When call run_tilt_tests "test.py"
                The status should be success
                The variable CLAUDE_HOOKS_ERROR_COUNT should eq 0
            End
        End
        
        Describe 'Makefile integration'
            setup_makefile_test() {
                setup_makefile_integration
                # Source common-helpers to get proper error tracking
                init_error_tracking
            }
            
            BeforeEach 'setup_makefile_test'
            AfterEach 'cleanup'
            
            It 'runs test-tilt target when available'
                mock_command_with_output "make" 0 "Running Tiltfile tests..."
                When call run_tilt_tests "Tiltfile"
                The status should be success
                The variable CLAUDE_HOOKS_ERROR_COUNT should eq 0
            End
            
            It 'handles failing Makefile tests'
                mock_command_with_output "make" 1 "Test failed: invalid Tiltfile"
                When call run_tilt_tests "Tiltfile"
                The status should be failure
                The stderr should include "Tiltfile tests failed"
                The variable CLAUDE_HOOKS_ERROR_COUNT should eq 1
            End
        End
        
        Describe 'pytest integration'
            setup_pytest_with_errors() {
                setup_pytest_tests
                init_error_tracking
            }
            
            BeforeEach 'setup_pytest_with_errors'
            AfterEach 'cleanup'
            
            It 'runs pytest when test files found'
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                mock_command_with_output "pytest" 0 "collected 1 item"
                When call run_tilt_tests "Tiltfile"
                The status should be success
                The variable CLAUDE_HOOKS_ERROR_COUNT should eq 0
                The stderr should include "Validating Tiltfile"
            End
            
            It 'handles pytest failures'
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                # Create a test file that will be found
                mkdir -p test
                echo "def test_fail(): assert False" > test/test_tiltfile.py
                # Mock command existence check to return pytest exists
                mock_command "command" 0
                mock_command_with_output "pytest" 1 "FAILED test_tiltfile.py::test_load"
                When call run_tilt_tests "Tiltfile"
                The status should be failure
                The stderr should include "Test failed"
                The variable CLAUDE_HOOKS_ERROR_COUNT should eq 1
            End
            
            It 'discovers tests in tests directory'
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                mock_command "pytest" 0
                When call run_tilt_tests "Tiltfile"
                The status should be success
                The stderr should include "Validating Tiltfile"
            End
        End
        
        Describe 'unittest fallback'
            setup_unittest_with_errors() {
                setup_unittest_tests
                init_error_tracking
            }
            
            BeforeEach 'setup_unittest_with_errors'
            AfterEach 'cleanup'
            
            It 'falls back to unittest when pytest not available'
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                mock_command_with_output "python" 0 "Ran 1 test"
                When call run_tilt_tests "Tiltfile"
                The status should be success
                The variable CLAUDE_HOOKS_ERROR_COUNT should eq 0
                The stderr should include "Validating Tiltfile"
            End
            
            It 'handles unittest failures'
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                # Create a test file that will be found
                mkdir -p test
                echo "import unittest; class TestFail(unittest.TestCase): pass" > test/test_tiltfile.py
                mock_command "command" 0
                mock_command_with_output "python" 1 "FAIL: test_tiltfile"
                When call run_tilt_tests "Tiltfile"
                The status should be failure
                The stderr should include "Test failed"
                The variable CLAUDE_HOOKS_ERROR_COUNT should eq 1
            End
        End
        
        Describe 'tilt alpha tiltfile-result validation'
            setup_tilt_validation_with_errors() {
                setup_tilt_validation
                init_error_tracking
            }
            
            BeforeEach 'setup_tilt_validation_with_errors'
            AfterEach 'cleanup'
            
            It 'validates Tiltfile with tilt command'
                mock_command_stdout "tilt" 0 '{"version": "1.0", "resources": []}'
                When call run_tilt_tests "Tiltfile"
                The status should be success
                The stderr should include "Validating Tiltfile"
            End
            
            It 'handles tilt validation failures'
                mock_command_stdout "tilt" 1 "Error in Tiltfile:1: undefined symbol"
                When call run_tilt_tests "Tiltfile"
                The status should be failure
                The stderr should include "Tiltfile validation failed"
                The variable CLAUDE_HOOKS_ERROR_COUNT should eq 1
            End
            
            It 'detects invalid JSON output from tilt'
                mock_command_stdout "tilt" 0 "not valid json"
                When call run_tilt_tests "Tiltfile"
                The status should be failure
                The stderr should include "invalid JSON"
                The variable CLAUDE_HOOKS_ERROR_COUNT should eq 1
            End
        End
        
        Describe 'Python syntax validation'
            setup_syntax_with_errors() {
                setup_syntax_error
                init_error_tracking
            }
            
            BeforeEach 'setup_syntax_with_errors'
            AfterEach 'cleanup'
            
            It 'validates Python syntax'
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                mock_command "python3" 0
                When call run_tilt_tests "Tiltfile"
                The status should be success
                The stderr should include "syntax is valid"
            End
            
            It 'detects syntax errors'
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                mock_command_with_output "python3" 1 "SyntaxError: invalid syntax"
                When call run_tilt_tests "Tiltfile"
                The status should be failure
                The stderr should include "syntax errors"
                The variable CLAUDE_HOOKS_ERROR_COUNT should eq 1
            End
        End
        
        Describe 'test file discovery'
            setup_test_patterns_with_errors() {
                setup_multiple_test_patterns
                init_error_tracking
            }
            
            BeforeEach 'setup_test_patterns_with_errors'
            AfterEach 'cleanup'
            
            It 'finds Tiltfile_test.py pattern'
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                mock_command "pytest" 0
                When call run_tilt_tests "Tiltfile"
                The status should be success
                The stderr should include "Validating Tiltfile"
            End
            
            It 'finds test_tiltfile.py pattern'
                # The fixture already has test_tiltfile.py
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                mock_command "pytest" 0
                When call run_tilt_tests "Tiltfile"
                The status should be success
                The stderr should include "Validating Tiltfile"
            End
            
            It 'finds tests in multiple directories'
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                mock_command "pytest" 0
                When call run_tilt_tests "Tiltfile"
                The status should be success
                The stderr should include "Validating Tiltfile"
            End
        End
        
        Describe 'ignore patterns'
            setup_ignore_with_errors() {
                setup_ignore_patterns
                init_error_tracking
                unset CLAUDE_HOOKS_FILE_SKIPPED
            }
            
            BeforeEach 'setup_ignore_with_errors'
            AfterEach 'cleanup'
            
            It 'respects .claude-hooks-ignore patterns'
                When call run_tilt_tests "vendor/Tiltfile"
                The status should be success
                The variable CLAUDE_HOOKS_FILE_SKIPPED should eq "true"
            End
            
            It 'processes non-ignored files'
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                mock_command "python3" 0
                When call run_tilt_tests "Tiltfile"
                The status should be success
                The variable CLAUDE_HOOKS_FILE_SKIPPED should be undefined
                The stderr should include "Validating Tiltfile"
            End
        End
        
        Describe 'edge cases'
            setup_edge_with_errors() {
                setup_edge_cases
                init_error_tracking
            }
            
            BeforeEach 'setup_edge_with_errors'
            AfterEach 'cleanup'
            
            It 'handles files with spaces in names'
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                mock_command "python3" 0
                When call run_tilt_tests "my tiltfile.tiltfile"
                The status should be success
                The stderr should include "Validating Tiltfile"
            End
            
            It 'handles nested directory structures'
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                mock_command "python3" 0
                When call run_tilt_tests "services/api/Tiltfile"
                The status should be success
                The stderr should include "Validating Tiltfile"
            End
            
            It 'handles missing test files gracefully'
                mock_command_stdout "tilt" 0 '{"result": {"resources": [], "manifests": []}}'
                mock_command "python3" 0
                When call run_tilt_tests "Tiltfile"
                The status should be success
                The variable CLAUDE_HOOKS_ERROR_COUNT should eq 0
                The stderr should include "Validating Tiltfile"
            End
        End
    End
    
    Describe 'should_run_tilt_tests()'
        BeforeEach 'setup_basic'
        AfterEach 'cleanup'
        
        It 'returns true for Tiltfile'
            When call should_run_tilt_tests "Tiltfile"
            The status should be success
        End
        
        It 'returns true for .tiltfile extension'
            When call should_run_tilt_tests "config.tiltfile"
            The status should be success
        End
        
        It 'returns true for .star files'
            When call should_run_tilt_tests "lib.star"
            The status should be success
        End
        
        It 'returns true for .bzl files'
            When call should_run_tilt_tests "BUILD.bzl"
            The status should be success
        End
        
        It 'returns true for Tilt extensions'
            mkdir -p tilt
            touch tilt/Tiltfile
            When call should_run_tilt_tests "tilt/extensions.py"
            The status should be success
        End
        
        It 'returns false for non-Tiltfile'
            When call should_run_tilt_tests "main.py"
            The status should be failure
        End
    End
End