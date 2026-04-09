import { LanguageModelV3, LanguageModelV3CallOptions, LanguageModelV3GenerateResult, LanguageModelV3StreamResult, JSONSchema7, SharedV3ProviderMetadata, SharedV3Warning } from '@ai-sdk/provider';
import * as _ai_sdk_provider_utils from '@ai-sdk/provider-utils';
import { Resolvable, FetchFunction } from '@ai-sdk/provider-utils';

type AnthropicMessagesModelId = 'claude-3-haiku-20240307' | 'claude-haiku-4-5-20251001' | 'claude-haiku-4-5' | 'claude-opus-4-0' | 'claude-opus-4-20250514' | 'claude-opus-4-1-20250805' | 'claude-opus-4-1' | 'claude-opus-4-5' | 'claude-opus-4-5-20251101' | 'claude-sonnet-4-0' | 'claude-sonnet-4-20250514' | 'claude-sonnet-4-5-20250929' | 'claude-sonnet-4-5' | 'claude-sonnet-4-6' | 'claude-opus-4-6' | (string & {});

type AnthropicMessagesConfig = {
    provider: string;
    baseURL: string;
    headers: Resolvable<Record<string, string | undefined>>;
    fetch?: FetchFunction;
    buildRequestUrl?: (baseURL: string, isStreaming: boolean) => string;
    transformRequestBody?: (args: Record<string, any>, betas: Set<string>) => Record<string, any>;
    supportedUrls?: () => LanguageModelV3['supportedUrls'];
    generateId?: () => string;
    /**
     * When false, the model will use JSON tool fallback for structured outputs.
     */
    supportsNativeStructuredOutput?: boolean;
    /**
     * When false, `strict` on tool definitions will be ignored and a warning emitted.
     * Defaults to true.
     */
    supportsStrictTools?: boolean;
};
declare class AnthropicMessagesLanguageModel implements LanguageModelV3 {
    readonly specificationVersion = "v3";
    readonly modelId: AnthropicMessagesModelId;
    private readonly config;
    private readonly generateId;
    constructor(modelId: AnthropicMessagesModelId, config: AnthropicMessagesConfig);
    supportsUrl(url: URL): boolean;
    get provider(): string;
    /**
     * Extracts the dynamic provider name from the config.provider string.
     * e.g., 'my-custom-anthropic.messages' -> 'my-custom-anthropic'
     */
    private get providerOptionsName();
    get supportedUrls(): Record<string, RegExp[]> | PromiseLike<Record<string, RegExp[]>>;
    private getArgs;
    private getHeaders;
    private getBetasFromHeaders;
    private buildRequestUrl;
    private transformRequestBody;
    private extractCitationDocuments;
    doGenerate(options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult>;
    doStream(options: LanguageModelV3CallOptions): Promise<LanguageModelV3StreamResult>;
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

type AnthropicCacheControl = {
    type: 'ephemeral';
    ttl?: '5m' | '1h';
};
type AnthropicTool = {
    name: string;
    description: string | undefined;
    input_schema: JSONSchema7;
    cache_control: AnthropicCacheControl | undefined;
    eager_input_streaming?: boolean;
    strict?: boolean;
    /**
     * When true, this tool is deferred and will only be loaded when
     * discovered via the tool search tool.
     */
    defer_loading?: boolean;
    /**
     * Programmatic tool calling: specifies which server-executed tools
     * are allowed to call this tool. When set, only the specified callers
     * can invoke this tool programmatically.
     *
     * @example ['code_execution_20250825']
     */
    allowed_callers?: Array<'direct' | 'code_execution_20250825' | 'code_execution_20260120'>;
} | {
    type: 'code_execution_20250522';
    name: string;
    cache_control: AnthropicCacheControl | undefined;
} | {
    type: 'code_execution_20250825';
    name: string;
} | {
    type: 'code_execution_20260120';
    name: string;
} | {
    name: string;
    type: 'computer_20250124' | 'computer_20241022';
    display_width_px: number;
    display_height_px: number;
    display_number: number;
    cache_control: AnthropicCacheControl | undefined;
} | {
    name: string;
    type: 'computer_20251124';
    display_width_px: number;
    display_height_px: number;
    display_number: number;
    enable_zoom?: boolean;
    cache_control: AnthropicCacheControl | undefined;
} | {
    name: string;
    type: 'text_editor_20250124' | 'text_editor_20241022' | 'text_editor_20250429';
    cache_control: AnthropicCacheControl | undefined;
} | {
    name: string;
    type: 'text_editor_20250728';
    max_characters?: number;
    cache_control: AnthropicCacheControl | undefined;
} | {
    name: string;
    type: 'bash_20250124' | 'bash_20241022';
    cache_control: AnthropicCacheControl | undefined;
} | {
    name: string;
    type: 'memory_20250818';
} | {
    type: 'web_fetch_20250910' | 'web_fetch_20260209';
    name: string;
    max_uses?: number;
    allowed_domains?: string[];
    blocked_domains?: string[];
    citations?: {
        enabled: boolean;
    };
    max_content_tokens?: number;
    cache_control: AnthropicCacheControl | undefined;
} | {
    type: 'web_search_20250305' | 'web_search_20260209';
    name: string;
    max_uses?: number;
    allowed_domains?: string[];
    blocked_domains?: string[];
    user_location?: {
        type: 'approximate';
        city?: string;
        region?: string;
        country?: string;
        timezone?: string;
    };
    cache_control: AnthropicCacheControl | undefined;
} | {
    type: 'tool_search_tool_regex_20251119';
    name: string;
} | {
    type: 'tool_search_tool_bm25_20251119';
    name: string;
};
type AnthropicToolChoice = {
    type: 'auto' | 'any';
    disable_parallel_tool_use?: boolean;
} | {
    type: 'tool';
    name: string;
    disable_parallel_tool_use?: boolean;
};

declare class CacheControlValidator {
    private breakpointCount;
    private warnings;
    getCacheControl(providerMetadata: SharedV3ProviderMetadata | undefined, context: {
        type: string;
        canCache: boolean;
    }): AnthropicCacheControl | undefined;
    getWarnings(): SharedV3Warning[];
}

declare function prepareTools({ tools, toolChoice, disableParallelToolUse, cacheControlValidator, supportsStructuredOutput, supportsStrictTools, }: {
    tools: LanguageModelV3CallOptions['tools'];
    toolChoice: LanguageModelV3CallOptions['toolChoice'] | undefined;
    disableParallelToolUse?: boolean;
    cacheControlValidator?: CacheControlValidator;
    /**
     * Whether the model supports native structured output response format.
     */
    supportsStructuredOutput: boolean;
    /**
     * Whether the model supports strict mode on tool definitions.
     */
    supportsStrictTools: boolean;
}): Promise<{
    tools: Array<AnthropicTool> | undefined;
    toolChoice: AnthropicToolChoice | undefined;
    toolWarnings: SharedV3Warning[];
    betas: Set<string>;
}>;

export { AnthropicMessagesLanguageModel, type AnthropicMessagesModelId, anthropicTools, prepareTools };
