#!/usr/bin/env bash
# ntfy-notifier_spec.sh - Tests for ntfy-notifier.sh

# Note: spec_helper.sh is automatically loaded by ShellSpec via --require spec_helper

# Setup and cleanup functions
setup_basic() {
    TEMP_DIR=$(create_test_dir)
    cd "$TEMP_DIR" || return
    export CLAUDE_HOOKS_DEBUG=0
    unset CLAUDE_HOOKS_NTFY_ENABLED
    unset CLAUDE_HOOKS_NTFY_URL
    unset CLAUDE_HOOKS_NTFY_TOKEN
    # Clean up any rate limit files
    rm -f /tmp/.claude-ntfy-rate-limit
    # Override HOME to prevent reading actual config file
    export HOME="$TEMP_DIR"
    # Mock curl to prevent actual network calls
    mock_command "curl" 0
}

setup_with_config() {
    setup_basic
    export CLAUDE_HOOKS_NTFY_ENABLED="true"
    export CLAUDE_HOOKS_NTFY_URL="https://ntfy.sh/test-topic"
}

setup_with_auth() {
    setup_with_config
    export CLAUDE_HOOKS_NTFY_TOKEN="secret-token"
}

cleanup() {
    cleanup_test
    # Clean up rate limit file
    rm -f /tmp/.claude-ntfy-rate-limit
}

# Note: We don't source ntfy-notifier.sh because it has set -euo pipefail
# and is designed as a standalone script. We'll test it by running it directly.

# Helper to mock jq with specific behavior for ntfy tests
mock_jq_for_ntfy() {
    local mock_dir="${SHELLSPEC_TMPBASE:-/tmp/shellspec.$$}"
    mkdir -p "$mock_dir"
    
    cat > "${mock_dir}/jq" << 'EOF'
#!/usr/bin/env bash
# Mock jq for ntfy tests
input=$(cat)
if [[ "$1" == "." ]]; then
    # Just validate JSON
    echo "$input"
    exit 0
elif [[ "$1" == "-r" ]]; then
    case "$2" in
        ".hook_event_name // empty")
            echo "PostToolUse"
            ;;
        ".tool_name // empty")
            # Extract tool from input
            if echo "$input" | grep -q '"tool_name":"Edit"'; then
                echo "Edit"
            elif echo "$input" | grep -q '"tool_name":"Write"'; then
                echo "Write"
            elif echo "$input" | grep -q '"tool_name":"MultiEdit"'; then
                echo "MultiEdit"
            elif echo "$input" | grep -q '"tool_name":"Bash"'; then
                echo "Bash"
            elif echo "$input" | grep -q '"tool_name":"Read"'; then
                echo "Read"
            else
                echo "CustomTool"
            fi
            ;;
        ".tool_input // \"{}\"")
            # Extract tool_input JSON object from input
            tool_input=$(echo "$input" | sed -n 's/.*"tool_input":\({[^}]*}\).*/\1/p')
            if [[ -n "$tool_input" ]]; then
                echo "$tool_input"
            else
                echo "{}"
            fi
            ;;
        ".file_path // empty")
            # Extract file path from JSON
            file_path=$(echo "$input" | sed -n 's/.*"file_path":"\([^"]*\)".*/\1/p')
            if [[ -n "$file_path" ]]; then
                echo "$file_path"
            fi
            ;;
        ".command // empty")
            # Extract command from JSON
            command=$(echo "$input" | sed -n 's/.*"command":"\([^"]*\)".*/\1/p')
            if [[ -n "$command" ]]; then
                echo "$command"
            fi
            ;;
    esac
fi
EOF
    chmod +x "${mock_dir}/jq"
    export PATH="${mock_dir}:$PATH"
}

Describe 'ntfy-notifier.sh'
    Describe 'Configuration validation'
        BeforeEach 'setup_basic'
        AfterEach 'cleanup'
        
        It 'exits silently when ntfy is not enabled'
            json=$(create_post_tool_use_json "Edit" "test.go")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            The output should equal ""
            The stderr should equal "CLAUDE_HOOKS_NTFY_URL not configured"
        End
        
        It 'exits silently when explicitly disabled'
            export CLAUDE_HOOKS_NTFY_ENABLED="false"
            json=$(create_post_tool_use_json "Edit" "test.go")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            The output should equal ""
            The stderr should equal "CLAUDE_HOOKS_NTFY_URL not configured"
        End
        
        It 'requires ntfy URL when enabled'
            export CLAUDE_HOOKS_NTFY_ENABLED="true"
            # CLAUDE_HOOKS_NTFY_URL not set
            
            json=$(create_post_tool_use_json "Edit" "test.go")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            The stderr should include "CLAUDE_HOOKS_NTFY_URL not configured"
        End
        
        It 'works with valid configuration'
            export CLAUDE_HOOKS_NTFY_ENABLED="true"
            export CLAUDE_HOOKS_NTFY_URL="https://ntfy.sh/mytopic"
            mock_command "curl" 0
            
            json=$(create_post_tool_use_json "Edit" "test.go")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
        End
        
        It 'handles missing curl command'
            export CLAUDE_HOOKS_NTFY_ENABLED="true"
            export CLAUDE_HOOKS_NTFY_URL="https://ntfy.sh/test-topic"
            # Override command to simulate curl not being available
            command() {
                if [[ "$1" == "-v" ]] && [[ "$2" == "curl" ]]; then
                    return 1
                fi
                builtin command "$@"
            }
            export -f command
            
            json=$(create_post_tool_use_json "Edit" "test.go")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            The stderr should include "curl not found"
        End
    End
    
    Describe 'JSON input processing'
        BeforeEach 'setup_with_config'
        AfterEach 'cleanup'
        
        It 'processes PostToolUse events'
            mock_command "curl" 0
            
            json=$(create_post_tool_use_json "Edit" "main.go")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
        End
        
        It 'ignores non-PostToolUse events'
            mock_command "curl" 0
            
            json=$(create_other_json_event "PreToolUse")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            The output should equal ""
        End
        
        It 'handles invalid JSON gracefully'
            When run run_hook_with_json "ntfy-notifier.sh" "not valid json"
            The status should be success
            The stderr should include "Invalid JSON input received by ntfy-notifier.sh"
        End
        
        It 'handles missing jq gracefully'
            # Remove jq from PATH
            PATH=$(echo "$PATH" | sed "s|$TEMP_DIR/.mocks:||g")
            unset -f jq 2>/dev/null || true
            
            json=$(create_post_tool_use_json "Edit" "test.go")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
        End
    End
    
    Describe 'Notification sending'
        BeforeEach 'setup_with_config'
        AfterEach 'cleanup'
        
        It 'sends notification for Edit tool'
            mock_jq_for_ntfy
            args_file=$(mock_command_with_args "curl")
            
            json=$(create_post_tool_use_json "Edit" "src/main.go")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            
            The file "$args_file" should be exist
            The contents of file "$args_file" should include "-X POST"
            The contents of file "$args_file" should include "https://ntfy.sh/test-topic"
            The contents of file "$args_file" should match pattern "*Edit: src/main.go*"
        End
        
        It 'sends notification for Write tool'
            mock_jq_for_ntfy
            args_file=$(mock_command_with_args "curl")
            
            json=$(create_post_tool_use_json "Write" "new-file.py")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            
            The file "$args_file" should be exist
            The contents of file "$args_file" should match pattern "*Write: new-file.py*"
        End
        
        It 'sends notification for MultiEdit tool'
            mock_jq_for_ntfy
            args_file=$(mock_command_with_args "curl")
            
            json=$(create_post_tool_use_json "MultiEdit" "config.yaml")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            
            The file "$args_file" should be exist
            The contents of file "$args_file" should match pattern "*MultiEdit: config.yaml*"
        End
        
        It 'sends notification for Bash tool'
            mock_jq_for_ntfy
            args_file=$(mock_command_with_args "curl")
            
            json='{"hook_event_name":"PostToolUse","tool_name":"Bash","tool_input":{"command":"ls -la"}}'
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            
            The file "$args_file" should be exist
            The contents of file "$args_file" should match pattern "*Bash: ls -la*"
        End
        
        It 'ignores Read tool'
            mock_jq_for_ntfy
            mock_command "curl" 0
            
            json=$(create_post_tool_use_json "Read" "test.go")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            The output should equal ""
        End
        
        It 'sends notifications for unknown tools'
            mock_jq_for_ntfy
            args_file=$(mock_command_with_args "curl")
            
            json='{"hook_event_name":"PostToolUse","tool_name":"CustomTool","tool_input":{"action":"deploy"}}'
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            
            The file "$args_file" should be exist
            The contents of file "$args_file" should match pattern "*CustomTool*"
        End
    End
    
    Describe 'Authentication'
        BeforeEach 'setup_with_auth'
        AfterEach 'cleanup'
        
        It 'includes authentication token when configured'
            mock_jq_for_ntfy
            args_file=$(mock_command_with_args "curl")
            
            json=$(create_post_tool_use_json "Edit" "test.go")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            
            The file "$args_file" should be exist
            The contents of file "$args_file" should include "Authorization: Bearer secret-token"
        End
    End
    
    Describe 'Error handling'
        BeforeEach 'setup_with_config'
        AfterEach 'cleanup'
        
        It 'handles curl failures gracefully'
            mock_jq_for_ntfy
            mock_command_with_output "curl" 1 "Connection refused"
            
            json=$(create_post_tool_use_json "Edit" "test.go")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be failure
            The stderr should include "Failed to send notification"
        End
        
        It 'continues on network timeouts'
            mock_jq_for_ntfy
            mock_command "curl" 28
            
            json=$(create_post_tool_use_json "Edit" "test.go")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be failure
            The stderr should include "Failed to send notification"
        End
    End
    
    Describe 'Rate limiting'
        BeforeEach 'setup_with_config'
        AfterEach 'cleanup'
        
        It 'enforces rate limit between notifications'
            mock_jq_for_ntfy
            mock_command "curl" 0
            
            # Create rate limit file manually to simulate recent notification
            date +%s > /tmp/.claude-ntfy-rate-limit
            
            # Notification within 2 seconds should be skipped
            json=$(create_post_tool_use_json "Edit" "file2.go")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            The output should equal ""
        End
        
        It 'allows notifications after rate limit expires'
            mock_jq_for_ntfy
            mock_command "curl" 0
            
            # Create old rate limit file (3 seconds ago)
            echo $(($(date +%s) - 3)) > /tmp/.claude-ntfy-rate-limit
            
            json=$(create_post_tool_use_json "Edit" "test.go")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
        End
    End
    
    Describe 'Message formatting edge cases'
        BeforeEach 'setup_with_config'
        AfterEach 'cleanup'
        
        It 'handles missing file paths in tool input'
            mock_jq_for_ntfy
            args_file=$(mock_command_with_args "curl")
            
            json='{"hook_event_name":"PostToolUse","tool_name":"Edit","tool_input":{}}'
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            
            The file "$args_file" should be exist
            The contents of file "$args_file" should match pattern "*Edit*"
            The contents of file "$args_file" should not match pattern "*null*"
        End
        
        It 'handles missing command in Bash tool'
            mock_jq_for_ntfy
            args_file=$(mock_command_with_args "curl")
            
            json='{"hook_event_name":"PostToolUse","tool_name":"Bash","tool_input":{}}'
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            
            The file "$args_file" should be exist
            The contents of file "$args_file" should match pattern "*Bash*"
        End
        
        It 'handles very long file paths'
            mock_jq_for_ntfy
            args_file=$(mock_command_with_args "curl")
            
            long_path="very/long/path/that/goes/on/and/on/and/on/and/on/and/continues/for/a/while/file.go"
            json=$(create_post_tool_use_json "Edit" "$long_path")
            When run run_hook_with_json "ntfy-notifier.sh" "$json"
            The status should be success
            
            The file "$args_file" should be exist
            The contents of file "$args_file" should include "Edit:"
        End
    End
    
    Describe 'Debug mode'
        BeforeEach 'setup_with_config'
        AfterEach 'cleanup'
        
        It 'shows debug output when --debug flag is used'
            mock_jq_for_ntfy
            mock_command "curl" 0
            
            test_debug_mode() {
                local json
                json=$(create_post_tool_use_json "Edit" "test.go")
                echo "$json" | "$HOOK_DIR/ntfy-notifier.sh" --debug 2>&1
            }
            
            When call test_debug_mode
            The status should be success
            The output should include "[DEBUG]"
        End
        
        It 'shows configuration in debug mode'
            mock_jq_for_ntfy
            mock_command "curl" 0
            export CLAUDE_HOOKS_NTFY_TOKEN="secret"
            
            test_config_debug() {
                local json
                json=$(create_post_tool_use_json "Edit" "test.go")
                echo "$json" | "$HOOK_DIR/ntfy-notifier.sh" --debug 2>&1
            }
            
            When call test_config_debug
            The status should be success
            The output should include "ntfy is enabled"
            The output should include "https://ntfy.sh/test-topic"
            The output should include "Token: [configured]"
            The output should not include "secret"
        End
    End
End