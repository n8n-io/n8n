#!/usr/bin/env bash
# common-helpers_spec.sh - Tests for common-helpers.sh

# Note: spec_helper.sh is automatically loaded by ShellSpec via --require spec_helper

# Setup and cleanup functions
setup_basic() {
    TEMP_DIR=$(create_test_dir)
    cd "$TEMP_DIR" || return
    # Reset environment
    unset CLAUDE_HOOKS_DEBUG
    # Initialize error tracking arrays
    declare -gi CLAUDE_HOOKS_ERROR_COUNT=0
    declare -ga CLAUDE_HOOKS_ERRORS=()
}

setup_project_detection() {
    setup_test_with_fixture "common-helpers" "project-detection"
}

setup_ignore_patterns() {
    setup_test_with_fixture "common-helpers" "ignore-patterns"
}

setup_config_loading() {
    setup_test_with_fixture "common-helpers" "config-loading"
}

cleanup() {
    cleanup_test
}

# Source the common-helpers.sh file
source_common_helpers() {
    # shellcheck source=/dev/null
    source "$HOOK_DIR/common-helpers.sh"
}

Describe 'common-helpers.sh'
    BeforeAll 'source_common_helpers'
    
    Describe 'Color definitions'
        It 'exports color variables'
            The variable RED should be present
            The variable GREEN should be present
            The variable YELLOW should be present
            The variable BLUE should be present
            The variable CYAN should be present
            The variable NC should be present
        End
        
        It 'sets correct ANSI color codes'
            The value "$RED" should include "[0;31m"
            The value "$GREEN" should include "[0;32m"
            The value "$YELLOW" should include "[0;33m"
            The value "$BLUE" should include "[0;34m"
            The value "$CYAN" should include "[0;36m"
            The value "$NC" should include "[0m"
        End
    End
    
    Describe 'Logging functions'
        BeforeEach 'setup_basic'
        AfterEach 'cleanup'
        
        Describe 'log_debug()'
            It 'outputs nothing when debug is disabled'
                unset CLAUDE_HOOKS_DEBUG
                When call log_debug "Test message"
                The stderr should equal ""
                The status should equal 1
            End
            
            It 'outputs debug message when debug is enabled'
                export CLAUDE_HOOKS_DEBUG=1
                When call log_debug "Test message"
                The stderr should include "[DEBUG]"
                The stderr should include "Test message"
            End
        End
        
        Describe 'log_info()'
            It 'outputs info message to stderr'
                When call log_info "Info message"
                The stderr should include "[INFO]"
                The stderr should include "Info message"
            End
        End
        
        Describe 'log_error()'
            It 'outputs error message to stderr'
                When call log_error "Error message"
                The stderr should include "[ERROR]"
                The stderr should include "Error message"
            End
        End
        
        Describe 'log_success()'
            It 'outputs success message to stderr'
                When call log_success "Success message"
                The stderr should include "[OK]"
                The stderr should include "Success message"
            End
        End
    End
    
    Describe 'Utility functions'
        BeforeEach 'setup_basic'
        AfterEach 'cleanup'
        
        Describe 'command_exists()'
            It 'returns true for existing commands'
                When call command_exists "bash"
                The status should be success
            End
            
            It 'returns false for non-existing commands'
                When call command_exists "nonexistentcommand123"
                The status should be failure
            End
        End
    End
    
    Describe 'Project detection'
        BeforeEach 'setup_project_detection'
        AfterEach 'cleanup'
        
        Describe 'find_project_root()'
            It 'finds git project root'
                cd git-project/src/nested || return
                When call find_project_root
                The output should equal "$TEMP_DIR/git-project"
                The status should be success
            End
            
            It 'finds go.mod project root'
                cd go-project/pkg/util || return
                When call find_project_root
                The output should equal "$TEMP_DIR/go-project"
                The status should be success
            End
            
            It 'finds package.json project root'
                cd node-project/src/components || return
                When call find_project_root
                The output should equal "$TEMP_DIR/node-project"
                The status should be success
            End
            
            It 'finds Python project root'
                cd python-project/src/modules || return
                When call find_project_root
                The output should equal "$TEMP_DIR/python-project"
                The status should be success
            End
            
            It 'returns current directory when no project root found'
                cd standalone || return
                When call find_project_root
                The output should equal "$TEMP_DIR/standalone"
                The status should be failure
            End
        End
    End
    
    Describe 'Error tracking'
        BeforeEach 'setup_basic'
        AfterEach 'cleanup'
        
        Describe 'add_error()'
            It 'increments error count'
                The value "$CLAUDE_HOOKS_ERROR_COUNT" should equal 0
                add_error "Test error"
                The value "$CLAUDE_HOOKS_ERROR_COUNT" should equal 1
                add_error "Another error"
                The value "$CLAUDE_HOOKS_ERROR_COUNT" should equal 2
            End
            
            It 'stores error messages'
                add_error "First error"
                add_error "Second error"
                The value "${#CLAUDE_HOOKS_ERRORS[@]}" should equal 2
                The value "${CLAUDE_HOOKS_ERRORS[0]}" should include "First error"
                The value "${CLAUDE_HOOKS_ERRORS[1]}" should include "Second error"
            End
        End
        
        Describe 'print_error_summary()'
            It 'outputs nothing when no errors'
                When call print_error_summary
                The stderr should equal ""
            End
            
            It 'outputs error summary when errors exist'
                add_error "Test error"
                When call print_error_summary
                The stderr should include "issue(s)"
                The stderr should include "BLOCKING"
            End
        End
    End
    
    Describe 'Ignore patterns'
        BeforeEach 'setup_ignore_patterns'
        AfterEach 'cleanup'
        
        Describe 'should_skip_file()'
            It 'skips vendor files'
                When call should_skip_file "vendor/package.go"
                The status should be success
            End
            
            It 'skips node_modules files'
                When call should_skip_file "node_modules/test.js"
                The status should be success
            End
            
            It 'skips build files'
                When call should_skip_file "build/output.js"
                The status should be success
            End
            
            It 'does not skip src files'
                When call should_skip_file "src/main.go"
                The status should be failure
            End
            
            It 'does not skip test files'
                When call should_skip_file "test/test_file.py"
                The status should be failure
            End
            
            It 'handles generated go files'
                When call should_skip_file "test.generated.go"
                The status should be success
            End
            
            It 'handles tmp files'
                When call should_skip_file "path/to/file.tmp"
                The status should be success
            End
            
            It 'ignores comment patterns'
                When call should_skip_file "# This is a comment"
                The status should be failure
            End
            
            It 'ignores empty patterns'
                When call should_skip_file ""
                The status should be failure
            End
        End
    End
    
    Describe 'Configuration loading'
        BeforeEach 'setup_config_loading'
        AfterEach 'cleanup'
        
        Describe 'load_project_config()'
            It 'loads project configuration'
                cd project-with-config || return
                When call load_project_config
                The variable CLAUDE_HOOKS_CUSTOM_VAR should be present
                The value "$CLAUDE_HOOKS_CUSTOM_VAR" should equal "custom_value"
            End
            
            It 'does not fail when no config exists'
                cd project-without-config || return
                When call load_project_config
                The status should be success
            End
        End
    End
    
    Describe 'exit_with_success_message()'
        BeforeEach 'setup_basic'
        AfterEach 'cleanup'
        
        It 'outputs success message and exits with code 2'
            When run exit_with_success_message "Custom success message"
            The status should equal 2
            The stderr should include "Custom success message"
        End
    End
    
    Describe 'Project command discovery'
        BeforeEach 'setup_basic'
        AfterEach 'cleanup'
        
        Describe 'find_project_command_root()'
            It 'finds Makefile in current directory'
                echo 'lint:' > Makefile
                When call find_project_command_root "$TEMP_DIR"
                The output should equal "$TEMP_DIR"
                The status should be success
            End
            
            It 'finds scripts directory in current directory'
                mkdir scripts
                When call find_project_command_root "$TEMP_DIR"
                The output should equal "$TEMP_DIR"
                The status should be success
            End
            
            It 'finds Makefile in parent directory'
                mkdir -p subdir/nested
                echo 'lint:' > Makefile
                When call find_project_command_root "$TEMP_DIR/subdir/nested"
                The output should equal "$TEMP_DIR"
                The status should be success
            End
            
            It 'stops at project root markers'
                mkdir -p project/src
                touch project/go.mod
                When call find_project_command_root "$TEMP_DIR/project/src"
                The status should be failure
            End
            
            It 'returns failure when no command root found'
                mkdir -p deeply/nested/structure
                When call find_project_command_root "$TEMP_DIR/deeply/nested/structure"
                The status should be failure
            End
        End
        
        Describe 'check_make_target()'
            BeforeEach 'setup_basic'
            AfterEach 'cleanup'
            
            It 'returns success for existing target'
                cat > Makefile << 'EOF'
lint:
	@echo "Linting"
EOF
                When call check_make_target "lint" "$TEMP_DIR"
                The status should be success
            End
            
            It 'returns failure for non-existing target'
                cat > Makefile << 'EOF'
build:
	@echo "Building"
EOF
                When call check_make_target "lint" "$TEMP_DIR"
                The status should be failure
            End
            
            It 'handles missing Makefile gracefully'
                When call check_make_target "lint" "$TEMP_DIR"
                The status should be failure
            End
        End
        
        Describe 'check_script_exists()'
            It 'returns success for executable script'
                mkdir scripts
                echo '#!/bin/bash' > scripts/lint
                chmod +x scripts/lint
                When call check_script_exists "lint" "$TEMP_DIR/scripts"
                The status should be success
            End
            
            It 'returns failure for non-executable script'
                mkdir scripts
                echo '#!/bin/bash' > scripts/lint
                When call check_script_exists "lint" "$TEMP_DIR/scripts"
                The status should be failure
            End
            
            It 'returns failure for missing script'
                mkdir scripts
                When call check_script_exists "lint" "$TEMP_DIR/scripts"
                The status should be failure
            End
        End
        
        Describe 'calculate_relative_path()'
            It 'calculates simple relative path'
                mkdir -p project/src
                touch project/src/main.go
                When call calculate_relative_path "$TEMP_DIR/project" "$TEMP_DIR/project/src/main.go"
                The output should equal "src/main.go"
            End
            
            It 'handles same directory'
                touch main.go
                When call calculate_relative_path "$TEMP_DIR" "$TEMP_DIR/main.go"
                The output should equal "main.go"
            End
            
            It 'handles complex paths'
                mkdir -p a/b/c
                mkdir -p a/d/e
                touch a/d/e/file.txt
                When call calculate_relative_path "$TEMP_DIR/a/b/c" "$TEMP_DIR/a/d/e/file.txt"
                # Output depends on whether realpath is available
                The output should match pattern "*file.txt"
            End
        End
        
        Describe 'get_project_command_config()'
            BeforeEach 'setup_basic'
            AfterEach 'cleanup'
            
            It 'returns default lint configuration'
                When call get_project_command_config "lint"
                The line 1 of output should equal "lint"
                The line 2 of output should equal "lint"
                The status should be success
            End
            
            It 'returns default test configuration'
                When call get_project_command_config "test"
                The line 1 of output should equal "test"
                The line 2 of output should equal "test"
                The status should be success
            End
            
            It 'respects custom configuration'
                export CLAUDE_HOOKS_MAKE_LINT_TARGETS="check fmt"
                export CLAUDE_HOOKS_SCRIPT_LINT_NAMES="style.sh lint.py"
                When call get_project_command_config "lint"
                The line 1 of output should equal "check fmt"
                The line 2 of output should equal "style.sh lint.py"
            End
            
            It 'returns failure when globally disabled'
                export CLAUDE_HOOKS_USE_PROJECT_COMMANDS=false
                When call get_project_command_config "lint"
                The status should be failure
            End
            
            It 'returns failure for unknown command type'
                When call get_project_command_config "unknown"
                The status should be failure
                The stderr should include "Unknown command type: unknown"
            End
        End
    End
End