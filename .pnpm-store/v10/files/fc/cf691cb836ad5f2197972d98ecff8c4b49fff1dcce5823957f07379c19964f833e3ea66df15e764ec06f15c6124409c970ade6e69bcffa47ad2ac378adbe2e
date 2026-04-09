import { JSONObject, ProviderV3, LanguageModelV3 } from '@ai-sdk/provider';
import { z } from 'zod/v4';
import * as _ai_sdk_provider_utils from '@ai-sdk/provider-utils';
import { FetchFunction } from '@ai-sdk/provider-utils';

/**
 * Represents a single iteration in the usage breakdown.
 * When compaction occurs, the API returns an iterations array showing
 * usage for each sampling iteration (compaction + message).
 */
interface AnthropicUsageIteration {
    type: 'compaction' | 'message';
    /**
     * Number of input tokens consumed in this iteration.
     */
    inputTokens: number;
    /**
     * Number of output tokens generated in this iteration.
     */
    outputTokens: number;
}
interface AnthropicMessageMetadata {
    usage: JSONObject;
    cacheCreationInputTokens: number | null;
    stopSequence: string | null;
    /**
     * Usage breakdown by iteration when compaction is triggered.
     *
     * When compaction occurs, this array contains usage for each sampling iteration.
     * The first iteration is typically the compaction step, followed by the main
     * message iteration.
     */
    iterations: AnthropicUsageIteration[] | null;
    /**
     * Information about the container used in this request.
     *
     * This will be non-null if a container tool (e.g., code execution) was used.
     * Information about the container used in the request (for the code execution tool).
     */
    container: {
        /**
         * The time at which the container will expire (RFC3339 timestamp).
         */
        expiresAt: string;
        /**
         * Identifier for the container used in this request.
         */
        id: string;
        /**
         * Skills loaded in the container.
         */
        skills: Array<{
            /**
             * Type of skill: either 'anthropic' (built-in) or 'custom' (user-defined).
             */
            type: 'anthropic' | 'custom';
            /**
             * Skill ID (1-64 characters).
             */
            skillId: string;
            /**
             * Skill version or 'latest' for most recent version (1-64 characters).
             */
            version: string;
        }> | null;
    } | null;
    /**
     * Context management response.
     *
     * Information about context management strategies applied during the request.
     */
    contextManagement: {
        /**
         * List of context management edits that were applied.
         * Each item in the array is a specific type of context management edit.
         */
        appliedEdits: Array<
        /**
         * Represents an edit where a certain number of tool uses and input tokens were cleared.
         */
        {
            /**
             * The type of context management edit applied.
             * Possible value: 'clear_tool_uses_20250919'
             */
            type: 'clear_tool_uses_20250919';
            /**
             * Number of tool uses that were cleared by this edit.
             * Minimum: 0
             */
            clearedToolUses: number;
            /**
             * Number of input tokens cleared by this edit.
             * Minimum: 0
             */
            clearedInputTokens: number;
        }
        /**
         * Represents an edit where a certain number of thinking turns and input tokens were cleared.
         */
         | {
            /**
             * The type of context management edit applied.
             * Possible value: 'clear_thinking_20251015'
             */
            type: 'clear_thinking_20251015';
            /**
             * Number of thinking turns that were cleared by this edit.
             * Minimum: 0
             */
            clearedThinkingTurns: number;
            /**
             * Number of input tokens cleared by this edit.
             * Minimum: 0
             */
            clearedInputTokens: number;
        }
        /**
         * Represents a compaction edit where the conversation context was summarized.
         */
         | {
            /**
             * The type of context management edit applied.
             * Possible value: 'compact_20260112'
             */
            type: 'compact_20260112';
        }>;
    } | null;
}

type AnthropicMessagesModelId = 'claude-3-haiku-20240307' | 'claude-haiku-4-5-20251001' | 'claude-haiku-4-5' | 'claude-opus-4-0' | 'claude-opus-4-20250514' | 'claude-opus-4-1-20250805' | 'claude-opus-4-1' | 'claude-opus-4-5' | 'claude-opus-4-5-20251101' | 'claude-sonnet-4-0' | 'claude-sonnet-4-20250514' | 'claude-sonnet-4-5-20250929' | 'claude-sonnet-4-5' | 'claude-sonnet-4-6' | 'claude-opus-4-6' | (string & {});
declare const anthropicLanguageModelOptions: z.ZodObject<{
    sendReasoning: z.ZodOptional<z.ZodBoolean>;
    structuredOutputMode: z.ZodOptional<z.ZodEnum<{
        outputFormat: "outputFormat";
        jsonTool: "jsonTool";
        auto: "auto";
    }>>;
    thinking: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"adaptive">;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"enabled">;
        budgetTokens: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"disabled">;
    }, z.core.$strip>]>>;
    disableParallelToolUse: z.ZodOptional<z.ZodBoolean>;
    cacheControl: z.ZodOptional<z.ZodObject<{
        type: z.ZodLiteral<"ephemeral">;
        ttl: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"5m">, z.ZodLiteral<"1h">]>>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodObject<{
        userId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    mcpServers: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodLiteral<"url">;
        name: z.ZodString;
        url: z.ZodString;
        authorizationToken: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        toolConfiguration: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
            allowedTools: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>>;
    container: z.ZodOptional<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        skills: z.ZodOptional<z.ZodArray<z.ZodObject<{
            type: z.ZodUnion<readonly [z.ZodLiteral<"anthropic">, z.ZodLiteral<"custom">]>;
            skillId: z.ZodString;
            version: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>>;
    toolStreaming: z.ZodOptional<z.ZodBoolean>;
    effort: z.ZodOptional<z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
        max: "max";
    }>>;
    speed: z.ZodOptional<z.ZodEnum<{
        fast: "fast";
        standard: "standard";
    }>>;
    anthropicBeta: z.ZodOptional<z.ZodArray<z.ZodString>>;
    contextManagement: z.ZodOptional<z.ZodObject<{
        edits: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            type: z.ZodLiteral<"clear_tool_uses_20250919">;
            trigger: z.ZodOptional<z.ZodDiscriminatedUnion<[z.ZodObject<{
                type: z.ZodLiteral<"input_tokens">;
                value: z.ZodNumber;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"tool_uses">;
                value: z.ZodNumber;
            }, z.core.$strip>]>>;
            keep: z.ZodOptional<z.ZodObject<{
                type: z.ZodLiteral<"tool_uses">;
                value: z.ZodNumber;
            }, z.core.$strip>>;
            clearAtLeast: z.ZodOptional<z.ZodObject<{
                type: z.ZodLiteral<"input_tokens">;
                value: z.ZodNumber;
            }, z.core.$strip>>;
            clearToolInputs: z.ZodOptional<z.ZodBoolean>;
            excludeTools: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"clear_thinking_20251015">;
            keep: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"all">, z.ZodObject<{
                type: z.ZodLiteral<"thinking_turns">;
                value: z.ZodNumber;
            }, z.core.$strip>]>>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"compact_20260112">;
            trigger: z.ZodOptional<z.ZodObject<{
                type: z.ZodLiteral<"input_tokens">;
                value: z.ZodNumber;
            }, z.core.$strip>>;
            pauseAfterCompaction: z.ZodOptional<z.ZodBoolean>;
            instructions: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>]>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
type AnthropicLanguageModelOptions = z.infer<typeof anthropicLanguageModelOptions>;

interface AnthropicToolOptions {
    deferLoading?: boolean;
    allowedCallers?: Array<'direct' | 'code_execution_20250825' | 'code_execution_20260120'>;
    eagerInputStreaming?: boolean;
}

declare const anthropicTools: {
    /**
     * The bash tool enables Claude to execute shell commands in a persistent bash session,
     * allowing system operations, script execution, and command-line automation.
     *
     * Image results are supported.
     */
    bash_20241022: _ai_sdk_provider_utils.ProviderToolFactory<{
        command: string;
        restart?: boolean;
    }, {}>;
    /**
     * The bash tool enables Claude to execute shell commands in a persistent bash session,
     * allowing system operations, script execution, and command-line automation.
     *
     * Image results are supported.
     */
    bash_20250124: _ai_sdk_provider_utils.ProviderToolFactory<{
        command: string;
        restart?: boolean;
    }, {}>;
    /**
     * Claude can analyze data, create visualizations, perform complex calculations,
     * run system commands, create and edit files, and process uploaded files directly within
     * the API conversation.
     *
     * The code execution tool allows Claude to run Bash commands and manipulate files,
     * including writing code, in a secure, sandboxed environment.
     */
    codeExecution_20250522: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{
        code: string;
    }, {
        type: "code_execution_result";
        stdout: string;
        stderr: string;
        return_code: number;
        content: Array<{
            type: "code_execution_output";
            file_id: string;
        }>;
    }, {}>>[0]) => _ai_sdk_provider_utils.Tool<{
        code: string;
    }, {
        type: "code_execution_result";
        stdout: string;
        stderr: string;
        return_code: number;
        content: Array<{
            type: "code_execution_output";
            file_id: string;
        }>;
    }>;
    /**
     * Claude can analyze data, create visualizations, perform complex calculations,
     * run system commands, create and edit files, and process uploaded files directly within
     * the API conversation.
     *
     * The code execution tool allows Claude to run both Python and Bash commands and manipulate files,
     * including writing code, in a secure, sandboxed environment.
     *
     * This is the latest version with enhanced Bash support and file operations.
     */
    codeExecution_20250825: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{
        type: "programmatic-tool-call";
        code: string;
    } | {
        type: "bash_code_execution";
        command: string;
    } | {
        type: "text_editor_code_execution";
        command: "view";
        path: string;
    } | {
        type: "text_editor_code_execution";
        command: "create";
        path: string;
        file_text?: string | null;
    } | {
        type: "text_editor_code_execution";
        command: "str_replace";
        path: string;
        old_str: string;
        new_str: string;
    }, {
        type: "code_execution_result";
        stdout: string;
        stderr: string;
        return_code: number;
        content: Array<{
            type: "code_execution_output";
            file_id: string;
        }>;
    } | {
        type: "bash_code_execution_result";
        content: Array<{
            type: "bash_code_execution_output";
            file_id: string;
        }>;
        stdout: string;
        stderr: string;
        return_code: number;
    } | {
        type: "bash_code_execution_tool_result_error";
        error_code: string;
    } | {
        type: "text_editor_code_execution_tool_result_error";
        error_code: string;
    } | {
        type: "text_editor_code_execution_view_result";
        content: string;
        file_type: string;
        num_lines: number | null;
        start_line: number | null;
        total_lines: number | null;
    } | {
        type: "text_editor_code_execution_create_result";
        is_file_update: boolean;
    } | {
        type: "text_editor_code_execution_str_replace_result";
        lines: string[] | null;
        new_lines: number | null;
        new_start: number | null;
        old_lines: number | null;
        old_start: number | null;
    }, {}>>[0]) => _ai_sdk_provider_utils.Tool<{
        type: "programmatic-tool-call";
        code: string;
    } | {
        type: "bash_code_execution";
        command: string;
    } | {
        type: "text_editor_code_execution";
        command: "view";
        path: string;
    } | {
        type: "text_editor_code_execution";
        command: "create";
        path: string;
        file_text?: string | null;
    } | {
        type: "text_editor_code_execution";
        command: "str_replace";
        path: string;
        old_str: string;
        new_str: string;
    }, {
        type: "code_execution_result";
        stdout: string;
        stderr: string;
        return_code: number;
        content: Array<{
            type: "code_execution_output";
            file_id: string;
        }>;
    } | {
        type: "bash_code_execution_result";
        content: Array<{
            type: "bash_code_execution_output";
            file_id: string;
        }>;
        stdout: string;
        stderr: string;
        return_code: number;
    } | {
        type: "bash_code_execution_tool_result_error";
        error_code: string;
    } | {
        type: "text_editor_code_execution_tool_result_error";
        error_code: string;
    } | {
        type: "text_editor_code_execution_view_result";
        content: string;
        file_type: string;
        num_lines: number | null;
        start_line: number | null;
        total_lines: number | null;
    } | {
        type: "text_editor_code_execution_create_result";
        is_file_update: boolean;
    } | {
        type: "text_editor_code_execution_str_replace_result";
        lines: string[] | null;
        new_lines: number | null;
        new_start: number | null;
        old_lines: number | null;
        old_start: number | null;
    }>;
    /**
     * Claude can analyze data, create visualizations, perform complex calculations,
     * run system commands, create and edit files, and process uploaded files directly within
     * the API conversation.
     *
     * The code execution tool allows Claude to run both Python and Bash commands and manipulate files,
     * including writing code, in a secure, sandboxed environment.
     *
     * This is the recommended version. Does not require a beta header.
     *
     * Supported models: Claude Opus 4.6, Sonnet 4.6, Sonnet 4.5, Opus 4.5
     */
    codeExecution_20260120: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{
        type: "programmatic-tool-call";
        code: string;
    } | {
        type: "bash_code_execution";
        command: string;
    } | {
        type: "text_editor_code_execution";
        command: "view";
        path: string;
    } | {
        type: "text_editor_code_execution";
        command: "create";
        path: string;
        file_text?: string | null;
    } | {
        type: "text_editor_code_execution";
        command: "str_replace";
        path: string;
        old_str: string;
        new_str: string;
    }, {
        type: "code_execution_result";
        stdout: string;
        stderr: string;
        return_code: number;
        content: Array<{
            type: "code_execution_output";
            file_id: string;
        }>;
    } | {
        type: "encrypted_code_execution_result";
        encrypted_stdout: string;
        stderr: string;
        return_code: number;
        content: Array<{
            type: "code_execution_output";
            file_id: string;
        }>;
    } | {
        type: "bash_code_execution_result";
        content: Array<{
            type: "bash_code_execution_output";
            file_id: string;
        }>;
        stdout: string;
        stderr: string;
        return_code: number;
    } | {
        type: "bash_code_execution_tool_result_error";
        error_code: string;
    } | {
        type: "text_editor_code_execution_tool_result_error";
        error_code: string;
    } | {
        type: "text_editor_code_execution_view_result";
        content: string;
        file_type: string;
        num_lines: number | null;
        start_line: number | null;
        total_lines: number | null;
    } | {
        type: "text_editor_code_execution_create_result";
        is_file_update: boolean;
    } | {
        type: "text_editor_code_execution_str_replace_result";
        lines: string[] | null;
        new_lines: number | null;
        new_start: number | null;
        old_lines: number | null;
        old_start: number | null;
    }, {}>>[0]) => _ai_sdk_provider_utils.Tool<{
        type: "programmatic-tool-call";
        code: string;
    } | {
        type: "bash_code_execution";
        command: string;
    } | {
        type: "text_editor_code_execution";
        command: "view";
        path: string;
    } | {
        type: "text_editor_code_execution";
        command: "create";
        path: string;
        file_text?: string | null;
    } | {
        type: "text_editor_code_execution";
        command: "str_replace";
        path: string;
        old_str: string;
        new_str: string;
    }, {
        type: "code_execution_result";
        stdout: string;
        stderr: string;
        return_code: number;
        content: Array<{
            type: "code_execution_output";
            file_id: string;
        }>;
    } | {
        type: "encrypted_code_execution_result";
        encrypted_stdout: string;
        stderr: string;
        return_code: number;
        content: Array<{
            type: "code_execution_output";
            file_id: string;
        }>;
    } | {
        type: "bash_code_execution_result";
        content: Array<{
            type: "bash_code_execution_output";
            file_id: string;
        }>;
        stdout: string;
        stderr: string;
        return_code: number;
    } | {
        type: "bash_code_execution_tool_result_error";
        error_code: string;
    } | {
        type: "text_editor_code_execution_tool_result_error";
        error_code: string;
    } | {
        type: "text_editor_code_execution_view_result";
        content: string;
        file_type: string;
        num_lines: number | null;
        start_line: number | null;
        total_lines: number | null;
    } | {
        type: "text_editor_code_execution_create_result";
        is_file_update: boolean;
    } | {
        type: "text_editor_code_execution_str_replace_result";
        lines: string[] | null;
        new_lines: number | null;
        new_start: number | null;
        old_lines: number | null;
        old_start: number | null;
    }>;
    /**
     * Claude can interact with computer environments through the computer use tool, which
     * provides screenshot capabilities and mouse/keyboard control for autonomous desktop interaction.
     *
     * Image results are supported.
     *
     * @param displayWidthPx - The width of the display being controlled by the model in pixels.
     * @param displayHeightPx - The height of the display being controlled by the model in pixels.
     * @param displayNumber - The display number to control (only relevant for X11 environments). If specified, the tool will be provided a display number in the tool definition.
     */
    computer_20241022: _ai_sdk_provider_utils.ProviderToolFactory<{
        action: "key" | "type" | "mouse_move" | "left_click" | "left_click_drag" | "right_click" | "middle_click" | "double_click" | "screenshot" | "cursor_position";
        coordinate?: number[];
        text?: string;
    }, {
        displayWidthPx: number;
        displayHeightPx: number;
        displayNumber?: number;
    }>;
    /**
     * Claude can interact with computer environments through the computer use tool, which
     * provides screenshot capabilities and mouse/keyboard control for autonomous desktop interaction.
     *
     * Image results are supported.
     *
     * @param displayWidthPx - The width of the display being controlled by the model in pixels.
     * @param displayHeightPx - The height of the display being controlled by the model in pixels.
     * @param displayNumber - The display number to control (only relevant for X11 environments). If specified, the tool will be provided a display number in the tool definition.
     */
    computer_20250124: _ai_sdk_provider_utils.ProviderToolFactory<{
        action: "key" | "hold_key" | "type" | "cursor_position" | "mouse_move" | "left_mouse_down" | "left_mouse_up" | "left_click" | "left_click_drag" | "right_click" | "middle_click" | "double_click" | "triple_click" | "scroll" | "wait" | "screenshot";
        coordinate?: [number, number];
        duration?: number;
        scroll_amount?: number;
        scroll_direction?: "up" | "down" | "left" | "right";
        start_coordinate?: [number, number];
        text?: string;
    }, {
        displayWidthPx: number;
        displayHeightPx: number;
        displayNumber?: number;
    }>;
    /**
     * Claude can interact with computer environments through the computer use tool, which
     * provides screenshot capabilities and mouse/keyboard control for autonomous desktop interaction.
     *
     * This version adds the zoom action for detailed screen region inspection.
     *
     * Image results are supported.
     *
     * Supported models: Claude Opus 4.5
     *
     * @param displayWidthPx - The width of the display being controlled by the model in pixels.
     * @param displayHeightPx - The height of the display being controlled by the model in pixels.
     * @param displayNumber - The display number to control (only relevant for X11 environments). If specified, the tool will be provided a display number in the tool definition.
     * @param enableZoom - Enable zoom action. Set to true to allow Claude to zoom into specific screen regions. Default: false.
     */
    computer_20251124: _ai_sdk_provider_utils.ProviderToolFactory<{
        action: "key" | "hold_key" | "type" | "cursor_position" | "mouse_move" | "left_mouse_down" | "left_mouse_up" | "left_click" | "left_click_drag" | "right_click" | "middle_click" | "double_click" | "triple_click" | "scroll" | "wait" | "screenshot" | "zoom";
        coordinate?: [number, number];
        duration?: number;
        region?: [number, number, number, number];
        scroll_amount?: number;
        scroll_direction?: "up" | "down" | "left" | "right";
        start_coordinate?: [number, number];
        text?: string;
    }, {
        displayWidthPx: number;
        displayHeightPx: number;
        displayNumber?: number;
        enableZoom?: boolean;
    }>;
    /**
     * The memory tool enables Claude to store and retrieve information across conversations through a memory file directory.
     * Claude can create, read, update, and delete files that persist between sessions,
     * allowing it to build knowledge over time without keeping everything in the context window.
     * The memory tool operates client-side—you control where and how the data is stored through your own infrastructure.
     *
     * Supported models: Claude Sonnet 4.5, Claude Sonnet 4, Claude Opus 4.1, Claude Opus 4.
     */
    memory_20250818: _ai_sdk_provider_utils.ProviderToolFactory<{
        command: "view";
        path: string;
        view_range?: [number, number];
    } | {
        command: "create";
        path: string;
        file_text: string;
    } | {
        command: "str_replace";
        path: string;
        old_str: string;
        new_str: string;
    } | {
        command: "insert";
        path: string;
        insert_line: number;
        insert_text: string;
    } | {
        command: "delete";
        path: string;
    } | {
        command: "rename";
        old_path: string;
        new_path: string;
    }, {}>;
    /**
     * Claude can use an Anthropic-defined text editor tool to view and modify text files,
     * helping you debug, fix, and improve your code or other text documents. This allows Claude
     * to directly interact with your files, providing hands-on assistance rather than just suggesting changes.
     *
     * Supported models: Claude Sonnet 3.5
     */
    textEditor_20241022: _ai_sdk_provider_utils.ProviderToolFactory<{
        command: "view" | "create" | "str_replace" | "insert" | "undo_edit";
        path: string;
        file_text?: string;
        insert_line?: number;
        new_str?: string;
        insert_text?: string;
        old_str?: string;
        view_range?: number[];
    }, {}>;
    /**
     * Claude can use an Anthropic-defined text editor tool to view and modify text files,
     * helping you debug, fix, and improve your code or other text documents. This allows Claude
     * to directly interact with your files, providing hands-on assistance rather than just suggesting changes.
     *
     * Supported models: Claude Sonnet 3.7
     */
    textEditor_20250124: _ai_sdk_provider_utils.ProviderToolFactory<{
        command: "view" | "create" | "str_replace" | "insert" | "undo_edit";
        path: string;
        file_text?: string;
        insert_line?: number;
        new_str?: string;
        insert_text?: string;
        old_str?: string;
        view_range?: number[];
    }, {}>;
    /**
     * Claude can use an Anthropic-defined text editor tool to view and modify text files,
     * helping you debug, fix, and improve your code or other text documents. This allows Claude
     * to directly interact with your files, providing hands-on assistance rather than just suggesting changes.
     *
     * Note: This version does not support the "undo_edit" command.
     *
     * @deprecated Use textEditor_20250728 instead
     */
    textEditor_20250429: _ai_sdk_provider_utils.ProviderToolFactory<{
        command: "view" | "create" | "str_replace" | "insert";
        path: string;
        file_text?: string;
        insert_line?: number;
        new_str?: string;
        insert_text?: string;
        old_str?: string;
        view_range?: number[];
    }, {}>;
    /**
     * Claude can use an Anthropic-defined text editor tool to view and modify text files,
     * helping you debug, fix, and improve your code or other text documents. This allows Claude
     * to directly interact with your files, providing hands-on assistance rather than just suggesting changes.
     *
     * Note: This version does not support the "undo_edit" command and adds optional max_characters parameter.
     *
     * Supported models: Claude Sonnet 4, Opus 4, and Opus 4.1
     *
     * @param maxCharacters - Optional maximum number of characters to view in the file
     */
    textEditor_20250728: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactory<{
        command: "view" | "create" | "str_replace" | "insert";
        path: string;
        file_text?: string;
        insert_line?: number;
        new_str?: string;
        insert_text?: string;
        old_str?: string;
        view_range?: number[];
    }, {
        maxCharacters?: number;
    }>>[0]) => _ai_sdk_provider_utils.Tool<{
        command: "view" | "create" | "str_replace" | "insert";
        path: string;
        file_text?: string;
        insert_line?: number;
        new_str?: string;
        insert_text?: string;
        old_str?: string;
        view_range?: number[];
    }, unknown>;
    /**
     * Creates a web fetch tool that gives Claude direct access to real-time web content.
     *
     * @param maxUses - The max_uses parameter limits the number of web fetches performed
     * @param allowedDomains - Only fetch from these domains
     * @param blockedDomains - Never fetch from these domains
     * @param citations - Unlike web search where citations are always enabled, citations are optional for web fetch. Set "citations": {"enabled": true} to enable Claude to cite specific passages from fetched documents.
     * @param maxContentTokens - The max_content_tokens parameter limits the amount of content that will be included in the context.
     */
    webFetch_20250910: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{
        url: string;
    }, {
        type: "web_fetch_result";
        url: string;
        content: {
            type: "document";
            title: string | null;
            citations?: {
                enabled: boolean;
            };
            source: {
                type: "base64";
                mediaType: "application/pdf";
                data: string;
            } | {
                type: "text";
                mediaType: "text/plain";
                data: string;
            };
        };
        retrievedAt: string | null;
    }, {
        maxUses?: number;
        allowedDomains?: string[];
        blockedDomains?: string[];
        citations?: {
            enabled: boolean;
        };
        maxContentTokens?: number;
    }>>[0]) => _ai_sdk_provider_utils.Tool<{
        url: string;
    }, {
        type: "web_fetch_result";
        url: string;
        content: {
            type: "document";
            title: string | null;
            citations?: {
                enabled: boolean;
            };
            source: {
                type: "base64";
                mediaType: "application/pdf";
                data: string;
            } | {
                type: "text";
                mediaType: "text/plain";
                data: string;
            };
        };
        retrievedAt: string | null;
    }>;
    /**
     * Creates a web fetch tool that gives Claude direct access to real-time web content.
     *
     * @param maxUses - The max_uses parameter limits the number of web fetches performed
     * @param allowedDomains - Only fetch from these domains
     * @param blockedDomains - Never fetch from these domains
     * @param citations - Unlike web search where citations are always enabled, citations are optional for web fetch. Set "citations": {"enabled": true} to enable Claude to cite specific passages from fetched documents.
     * @param maxContentTokens - The max_content_tokens parameter limits the amount of content that will be included in the context.
     */
    webFetch_20260209: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{
        url: string;
    }, {
        type: "web_fetch_result";
        url: string;
        content: {
            type: "document";
            title: string | null;
            citations?: {
                enabled: boolean;
            };
            source: {
                type: "base64";
                mediaType: "application/pdf";
                data: string;
            } | {
                type: "text";
                mediaType: "text/plain";
                data: string;
            };
        };
        retrievedAt: string | null;
    }, {
        maxUses?: number;
        allowedDomains?: string[];
        blockedDomains?: string[];
        citations?: {
            enabled: boolean;
        };
        maxContentTokens?: number;
    }>>[0]) => _ai_sdk_provider_utils.Tool<{
        url: string;
    }, {
        type: "web_fetch_result";
        url: string;
        content: {
            type: "document";
            title: string | null;
            citations?: {
                enabled: boolean;
            };
            source: {
                type: "base64";
                mediaType: "application/pdf";
                data: string;
            } | {
                type: "text";
                mediaType: "text/plain";
                data: string;
            };
        };
        retrievedAt: string | null;
    }>;
    /**
     * Creates a web search tool that gives Claude direct access to real-time web content.
     *
     * @param maxUses - Maximum number of web searches Claude can perform during the conversation.
     * @param allowedDomains - Optional list of domains that Claude is allowed to search.
     * @param blockedDomains - Optional list of domains that Claude should avoid when searching.
     * @param userLocation - Optional user location information to provide geographically relevant search results.
     */
    webSearch_20250305: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{
        query: string;
    }, {
        type: "web_search_result";
        url: string;
        title: string | null;
        pageAge: string | null;
        encryptedContent: string;
    }[], {
        maxUses?: number;
        allowedDomains?: string[];
        blockedDomains?: string[];
        userLocation?: {
            type: "approximate";
            city?: string;
            region?: string;
            country?: string;
            timezone?: string;
        };
    }>>[0]) => _ai_sdk_provider_utils.Tool<{
        query: string;
    }, {
        type: "web_search_result";
        url: string;
        title: string | null;
        pageAge: string | null;
        encryptedContent: string;
    }[]>;
    /**
     * Creates a web search tool that gives Claude direct access to real-time web content.
     *
     * @param maxUses - Maximum number of web searches Claude can perform during the conversation.
     * @param allowedDomains - Optional list of domains that Claude is allowed to search.
     * @param blockedDomains - Optional list of domains that Claude should avoid when searching.
     * @param userLocation - Optional user location information to provide geographically relevant search results.
     */
    webSearch_20260209: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{
        query: string;
    }, {
        type: "web_search_result";
        url: string;
        title: string | null;
        pageAge: string | null;
        encryptedContent: string;
    }[], {
        maxUses?: number;
        allowedDomains?: string[];
        blockedDomains?: string[];
        userLocation?: {
            type: "approximate";
            city?: string;
            region?: string;
            country?: string;
            timezone?: string;
        };
    }>>[0]) => _ai_sdk_provider_utils.Tool<{
        query: string;
    }, {
        type: "web_search_result";
        url: string;
        title: string | null;
        pageAge: string | null;
        encryptedContent: string;
    }[]>;
    /**
     * Creates a tool search tool that uses regex patterns to find tools.
     *
     * The tool search tool enables Claude to work with hundreds or thousands of tools
     * by dynamically discovering and loading them on-demand. Instead of loading all
     * tool definitions into the context window upfront, Claude searches your tool
     * catalog and loads only the tools it needs.
     *
     * Use `providerOptions: { anthropic: { deferLoading: true } }` on other tools
     * to mark them for deferred loading.
     *
     * Supported models: Claude Opus 4.5, Claude Sonnet 4.5
     */
    toolSearchRegex_20251119: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{
        pattern: string;
        limit?: number;
    }, {
        type: "tool_reference";
        toolName: string;
    }[], {}>>[0]) => _ai_sdk_provider_utils.Tool<{
        pattern: string;
        limit?: number;
    }, {
        type: "tool_reference";
        toolName: string;
    }[]>;
    /**
     * Creates a tool search tool that uses BM25 (natural language) to find tools.
     *
     * The tool search tool enables Claude to work with hundreds or thousands of tools
     * by dynamically discovering and loading them on-demand. Instead of loading all
     * tool definitions into the context window upfront, Claude searches your tool
     * catalog and loads only the tools it needs.
     *
     * Use `providerOptions: { anthropic: { deferLoading: true } }` on other tools
     * to mark them for deferred loading.
     *
     * Supported models: Claude Opus 4.5, Claude Sonnet 4.5
     */
    toolSearchBm25_20251119: (args?: Parameters<_ai_sdk_provider_utils.ProviderToolFactoryWithOutputSchema<{
        query: string;
        limit?: number;
    }, {
        type: "tool_reference";
        toolName: string;
    }[], {}>>[0]) => _ai_sdk_provider_utils.Tool<{
        query: string;
        limit?: number;
    }, {
        type: "tool_reference";
        toolName: string;
    }[]>;
};

interface AnthropicProvider extends ProviderV3 {
    /**
     * Creates a model for text generation.
     */
    (modelId: AnthropicMessagesModelId): LanguageModelV3;
    /**
     * Creates a model for text generation.
     */
    languageModel(modelId: AnthropicMessagesModelId): LanguageModelV3;
    chat(modelId: AnthropicMessagesModelId): LanguageModelV3;
    messages(modelId: AnthropicMessagesModelId): LanguageModelV3;
    /**
     * @deprecated Use `embeddingModel` instead.
     */
    textEmbeddingModel(modelId: string): never;
    /**
     * Anthropic-specific computer use tool.
     */
    tools: typeof anthropicTools;
}
interface AnthropicProviderSettings {
    /**
     * Use a different URL prefix for API calls, e.g. to use proxy servers.
     * The default prefix is `https://api.anthropic.com/v1`.
     */
    baseURL?: string;
    /**
     * API key that is being send using the `x-api-key` header.
     * It defaults to the `ANTHROPIC_API_KEY` environment variable.
     * Only one of `apiKey` or `authToken` is required.
     */
    apiKey?: string;
    /**
     * Auth token that is being sent using the `Authorization: Bearer` header.
     * It defaults to the `ANTHROPIC_AUTH_TOKEN` environment variable.
     * Only one of `apiKey` or `authToken` is required.
     */
    authToken?: string;
    /**
     * Custom headers to include in the requests.
     */
    headers?: Record<string, string>;
    /**
     * Custom fetch implementation. You can use it as a middleware to intercept requests,
     * or to provide a custom fetch implementation for e.g. testing.
     */
    fetch?: FetchFunction;
    generateId?: () => string;
    /**
     * Custom provider name
     * Defaults to 'anthropic.messages'.
     */
    name?: string;
}
/**
 * Create an Anthropic provider instance.
 */
declare function createAnthropic(options?: AnthropicProviderSettings): AnthropicProvider;
/**
 * Default Anthropic provider instance.
 */
declare const anthropic: AnthropicProvider;

/**
 * Sets the Anthropic container ID in the provider options based on
 * any previous step's provider metadata.
 *
 * Searches backwards through steps to find the most recent container ID.
 * You can use this function in `prepareStep` to forward the container ID between steps.
 */
declare function forwardAnthropicContainerIdFromLastStep({ steps, }: {
    steps: Array<{
        providerMetadata?: Record<string, JSONObject>;
    }>;
}): undefined | {
    providerOptions?: Record<string, JSONObject>;
};

declare const VERSION: string;

export { type AnthropicLanguageModelOptions, type AnthropicMessageMetadata, type AnthropicProvider, type AnthropicLanguageModelOptions as AnthropicProviderOptions, type AnthropicProviderSettings, type AnthropicToolOptions, type AnthropicUsageIteration, VERSION, anthropic, createAnthropic, forwardAnthropicContainerIdFromLastStep };
