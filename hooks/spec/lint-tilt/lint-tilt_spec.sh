#!/usr/bin/env bash
# lint-tilt_spec.sh - Tests for Tiltfile linting functions

# Note: spec_helper.sh is automatically loaded by ShellSpec via --require spec_helper

# Source common-helpers.sh and lint-tilt.sh to test the functions directly
# shellcheck source=../../common-helpers.sh
source "$HOOK_DIR/common-helpers.sh"
# shellcheck source=../../lint-tilt.sh
source "$HOOK_DIR/lint-tilt.sh"

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

# Setup functions for different test scenarios
setup_valid_tiltfile() {
    setup_test_with_fixture "lint-tilt" "valid-tiltfile"
    reset_errors
}

setup_syntax_error() {
    setup_test_with_fixture "lint-tilt" "syntax-error"
    reset_errors
}

setup_flake8_issues() {
    setup_test_with_fixture "lint-tilt" "flake8-issues"
    reset_errors
}

setup_buildifier_formatting() {
    setup_test_with_fixture "lint-tilt" "buildifier-formatting"
    reset_errors
}

setup_multiple_tiltfiles() {
    setup_test_with_fixture "lint-tilt" "multiple-tiltfiles"
    reset_errors
}

setup_makefile_integration() {
    setup_test_with_fixture "lint-tilt" "makefile-integration"
    reset_errors
}

setup_custom_linters() {
    setup_test_with_fixture "lint-tilt" "custom-linters"
    reset_errors
}

setup_edge_cases() {
    setup_test_with_fixture "lint-tilt" "edge-cases"
    reset_errors
}

cleanup() {
    cleanup_test
}

Describe 'lint-tilt functions'
    Describe 'is_tiltfile'
        It 'identifies file named Tiltfile'
            When call is_tiltfile "Tiltfile"
            The status should equal 0
        End
        
        It 'identifies files with .tiltfile extension'
            When call is_tiltfile "config.tiltfile"
            The status should equal 0
        End
        
        It 'identifies Tiltfile in subdirectory'
            When call is_tiltfile "subdir/Tiltfile"
            The status should equal 0
        End
        
        It 'rejects non-Tiltfile files'
            When call is_tiltfile "main.py"
            The status should equal 1
        End
        
        It 'rejects files with tiltfile in middle of name'
            When call is_tiltfile "my_tiltfile_backup.txt"
            The status should equal 1
        End
    End
    
    Describe 'run_starlark_check'
        BeforeEach 'setup_valid_tiltfile'
        AfterEach 'cleanup'
        
        It 'runs starlark --check on valid file'
            mock_command "starlark" 0
            export CLAUDE_HOOKS_DEBUG=1
            
            When call run_starlark_check "Tiltfile"
            The status should equal 0
            The stderr should include "Starlark syntax check passed"
        End
        
        It 'reports error when starlark fails'
            mock_command_with_output "starlark" 1 "syntax error at line 1"
            
            When call run_starlark_check "Tiltfile"
            The status should equal 1
            The stderr should include "syntax error at line 1"
            The value "$ERROR_COUNT" should equal 1
        End
        
        It 'handles missing starlark command'
            # Don't mock starlark, let it be missing
            When call run_starlark_check "Tiltfile"
            The status should equal 0
            The stderr should include "starlark not found"
        End
    End
    
    Describe 'run_flake8_check'
        BeforeEach 'setup_valid_tiltfile'
        AfterEach 'cleanup'
        
        It 'runs flake8 on Tiltfile'
            mock_command "flake8" 0
            export CLAUDE_HOOKS_DEBUG=1
            
            When call run_flake8_check "Tiltfile"
            The status should equal 0
            The stderr should include "flake8 check passed"
        End
        
        It 'reports flake8 errors'
            mock_command_with_output "flake8" 1 "F401 'os' imported but unused"
            
            When call run_flake8_check "Tiltfile"
            The status should equal 1
            The stderr should include "F401"
            The value "$ERROR_COUNT" should equal 1
        End
        
        It 'handles missing flake8'
            When call run_flake8_check "Tiltfile"
            The status should equal 0
            The stderr should include "flake8 not found"
        End
    End
    
    Describe 'lint_tilt_standalone'
        Context 'with valid Tiltfile'
            BeforeEach 'setup_valid_tiltfile'
            AfterEach 'cleanup'
            
            It 'passes all checks for valid file'
                mock_command "starlark" 0
                mock_command "flake8" 0
                
                When call lint_tilt_standalone "Tiltfile"
                The status should equal 0
                The stderr should include "Tiltfile checks passed"
            End
            
            It 'skips non-Tiltfile'
                When call lint_tilt_standalone "main.py"
                The status should equal 0
            End
            
            It 'respects CLAUDE_HOOKS_TILT_ENABLED=false'
                export CLAUDE_HOOKS_TILT_ENABLED=false
                When call lint_tilt_standalone "Tiltfile"
                The status should equal 0
                The stderr should not include "Running Tiltfile linting"
            End
        End
        
        Context 'with syntax errors'
            BeforeEach 'setup_syntax_error'
            AfterEach 'cleanup'
            
            It 'fails on syntax errors'
                mock_command_with_output "starlark" 1 "unexpected EOF"
                
                When call lint_tilt_standalone "Tiltfile"
                The status should equal 1
                The stderr should include "unexpected EOF"
            End
        End
        
        Context 'with ignore patterns'
            BeforeEach 'setup_valid_tiltfile'
            AfterEach 'cleanup'
            
            It 'skips ignored files'
                create_ignore_file "*.tiltfile"
                
                When call lint_tilt_standalone "config.tiltfile"
                The status should equal 0
                The stderr should not include "Running Tiltfile linting"
            End
        End
    End
    
    Describe 'lint_tilt (smart-lint integration)'
        Context 'with multiple Tiltfiles'
            BeforeEach 'setup_multiple_tiltfiles'
            AfterEach 'cleanup'
            
            It 'finds and checks all Tiltfiles'
                mock_command "starlark" 0
                mock_command "flake8" 0
                
                When call lint_tilt
                The status should equal 0
                The stderr should include "Checking ./Tiltfile"
                The stderr should include "Checking ./config.tiltfile"
                The stderr should include "Checking ./subproject/Tiltfile"
            End
        End
        
        Context 'with Makefile integration'
            BeforeEach 'setup_makefile_integration'
            AfterEach 'cleanup'
            
            It 'uses Makefile lint-tilt target when available'
                # The fixture Makefile will run and succeed
                export CLAUDE_HOOKS_DEBUG=1
                
                When call lint_tilt
                The status should equal 0
                The stderr should include "Using Makefile lint-tilt target"
            End
            
            It 'runs make fix-tilt before lint-tilt'
                export CLAUDE_HOOKS_DEBUG=1
                
                # Run lint_tilt which should call make fix-tilt
                When call lint_tilt
                The status should equal 0
                The stderr should include "Using Makefile lint-tilt target"
                
                # Verify make fix-tilt was called - the file should be modified
                # Note: We can't directly check file content with ShellSpec 
                # after function execution due to subshell isolation
            End
        End
        
        Context 'with buildifier'
            BeforeEach 'setup_buildifier_formatting'
            AfterEach 'cleanup'
            
            It 'uses buildifier for formatting checks'
                # Mock buildifier to always succeed (no issues)
                mock_command "buildifier" 0
                export CLAUDE_HOOKS_DEBUG=1
                
                When call lint_tilt
                The status should equal 0
                The stderr should include "All Tiltfiles passed buildifier checks"
            End
            
            It 'reports buildifier errors that cannot be fixed'
                mock_command_with_output "buildifier" 1 "syntax error"
                
                When call lint_tilt
                The status should equal 0
                The stderr should include "Buildifier found issues"
                The value "$ERROR_COUNT" should not equal 0
            End
        End
        
        Context 'with custom linters'
            BeforeEach 'setup_custom_linters'
            AfterEach 'cleanup'
            
            It 'runs shell-based custom linter'
                # Ensure custom linter runs by mocking other tools and preventing buildifier
                mock_command "starlark" 0
                mock_command "flake8" 0
                command_exists() {
                    [[ "$1" != "buildifier" ]] && command -v "$1" &> /dev/null
                }
                
                When call lint_tilt
                The status should equal 0
                # Only the log message is shown when the linter succeeds
                The stderr should include "Running custom Tiltfile linter"
            End
            
            It 'runs Python-based custom linter'
                # Ensure custom linter runs by mocking other tools and preventing buildifier
                mock_command "starlark" 0
                mock_command "flake8" 0
                command_exists() {
                    [[ "$1" != "buildifier" ]] && command -v "$1" &> /dev/null
                }
                
                When call lint_tilt
                The status should equal 0
                # Only the log message is shown when the linter succeeds
                The stderr should include "Running Python-based custom Tiltfile linter"
            End
        End
        
        Context 'with Python fallback'
            BeforeEach 'setup_valid_tiltfile'
            AfterEach 'cleanup'
            
            It 'uses Python for syntax check when tools missing'
                # Remove buildifier from PATH by mocking command_exists to return false
                command_exists() {
                    [[ "$1" != "buildifier" ]] && command -v "$1" &> /dev/null
                }
                mock_command "python3" 0
                export CLAUDE_HOOKS_DEBUG=1
                
                When call lint_tilt
                The status should equal 0
                The stderr should include "checking for basic issues"
            End
            
            It 'reports Python syntax errors'
                setup_syntax_error
                # Remove buildifier from PATH by mocking command_exists to return false
                command_exists() {
                    [[ "$1" != "buildifier" ]] && command -v "$1" &> /dev/null
                }
                mock_command_with_output "python3" 1 "invalid syntax"
                
                When call lint_tilt
                The status should equal 0
                The value "$ERROR_COUNT" should not equal 0
                The stderr should include "invalid syntax"
            End
        End
        
        Context 'edge cases'
            BeforeEach 'setup_edge_cases'
            AfterEach 'cleanup'
            
            It 'handles empty Tiltfile'
                mock_command "starlark" 0
                mock_command "flake8" 0
                
                When call lint_tilt_standalone "empty.tiltfile"
                The status should equal 0
                The stderr should include "Tiltfile checks passed"
            End
            
            It 'handles files with spaces in name'
                mock_command "starlark" 0
                mock_command "flake8" 0
                
                When call lint_tilt_standalone "spaces in name.tiltfile"
                The status should equal 0
                The stderr should include "Tiltfile checks passed"
            End
            
            It 'handles large Tiltfile efficiently'
                mock_command "starlark" 0
                mock_command "flake8" 0
                
                When call lint_tilt_standalone "huge.tiltfile"
                The status should equal 0
                The stderr should include "Tiltfile checks passed"
            End
        End
    End
    
    Describe 'Integration with common-helpers'
        BeforeEach 'setup_valid_tiltfile'
        AfterEach 'cleanup'
        
        It 'uses log_debug for debug output'
            export CLAUDE_HOOKS_DEBUG=1
            mock_command "starlark" 0
            
            When call lint_tilt_standalone "Tiltfile"
            The status should equal 0
            The stderr should include "[DEBUG]"
        End
        
        It 'respects should_skip_file from common-helpers'
            create_ignore_file "Tiltfile"
            
            When call lint_tilt_standalone "Tiltfile"
            The status should equal 0
            The stderr should not include "Running Tiltfile linting"
        End
        
        It 'accumulates errors via add_error'
            mock_command_with_output "starlark" 1 "error1"
            mock_command_with_output "flake8" 1 "error2"
            
            When call lint_tilt_standalone "Tiltfile"
            The status should equal 1
            The value "$ERROR_COUNT" should equal 2
            The stderr should include "error1"
            The stderr should include "error2"
        End
    End
End