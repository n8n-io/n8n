import { bash_20241022 } from './tool/bash_20241022';
import { bash_20250124 } from './tool/bash_20250124';
import { codeExecution_20250522 } from './tool/code-execution_20250522';
import { codeExecution_20250825 } from './tool/code-execution_20250825';
import { codeExecution_20260120 } from './tool/code-execution_20260120';
import { computer_20241022 } from './tool/computer_20241022';
import { computer_20250124 } from './tool/computer_20250124';
import { computer_20251124 } from './tool/computer_20251124';
import { memory_20250818 } from './tool/memory_20250818';
import { textEditor_20241022 } from './tool/text-editor_20241022';
import { textEditor_20250124 } from './tool/text-editor_20250124';
import { textEditor_20250429 } from './tool/text-editor_20250429';
import { textEditor_20250728 } from './tool/text-editor_20250728';
import { toolSearchBm25_20251119 } from './tool/tool-search-bm25_20251119';
import { toolSearchRegex_20251119 } from './tool/tool-search-regex_20251119';
import { webFetch_20260209 } from './tool/web-fetch-20260209';
import { webFetch_20250910 } from './tool/web-fetch-20250910';
import { webSearch_20260209 } from './tool/web-search_20260209';
import { webSearch_20250305 } from './tool/web-search_20250305';

export const anthropicTools = {
  /**
   * The bash tool enables Claude to execute shell commands in a persistent bash session,
   * allowing system operations, script execution, and command-line automation.
   *
   * Image results are supported.
   */
  bash_20241022,

  /**
   * The bash tool enables Claude to execute shell commands in a persistent bash session,
   * allowing system operations, script execution, and command-line automation.
   *
   * Image results are supported.
   */
  bash_20250124,

  /**
   * Claude can analyze data, create visualizations, perform complex calculations,
   * run system commands, create and edit files, and process uploaded files directly within
   * the API conversation.
   *
   * The code execution tool allows Claude to run Bash commands and manipulate files,
   * including writing code, in a secure, sandboxed environment.
   */
  codeExecution_20250522,

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
  codeExecution_20250825,

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
  codeExecution_20260120,

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
  computer_20241022,

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
  computer_20250124,

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
  computer_20251124,

  /**
   * The memory tool enables Claude to store and retrieve information across conversations through a memory file directory.
   * Claude can create, read, update, and delete files that persist between sessions,
   * allowing it to build knowledge over time without keeping everything in the context window.
   * The memory tool operates client-side—you control where and how the data is stored through your own infrastructure.
   *
   * Supported models: Claude Sonnet 4.5, Claude Sonnet 4, Claude Opus 4.1, Claude Opus 4.
   */
  memory_20250818,

  /**
   * Claude can use an Anthropic-defined text editor tool to view and modify text files,
   * helping you debug, fix, and improve your code or other text documents. This allows Claude
   * to directly interact with your files, providing hands-on assistance rather than just suggesting changes.
   *
   * Supported models: Claude Sonnet 3.5
   */
  textEditor_20241022,

  /**
   * Claude can use an Anthropic-defined text editor tool to view and modify text files,
   * helping you debug, fix, and improve your code or other text documents. This allows Claude
   * to directly interact with your files, providing hands-on assistance rather than just suggesting changes.
   *
   * Supported models: Claude Sonnet 3.7
   */
  textEditor_20250124,

  /**
   * Claude can use an Anthropic-defined text editor tool to view and modify text files,
   * helping you debug, fix, and improve your code or other text documents. This allows Claude
   * to directly interact with your files, providing hands-on assistance rather than just suggesting changes.
   *
   * Note: This version does not support the "undo_edit" command.
   *
   * @deprecated Use textEditor_20250728 instead
   */
  textEditor_20250429,

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
  textEditor_20250728,

  /**
   * Creates a web fetch tool that gives Claude direct access to real-time web content.
   *
   * @param maxUses - The max_uses parameter limits the number of web fetches performed
   * @param allowedDomains - Only fetch from these domains
   * @param blockedDomains - Never fetch from these domains
   * @param citations - Unlike web search where citations are always enabled, citations are optional for web fetch. Set "citations": {"enabled": true} to enable Claude to cite specific passages from fetched documents.
   * @param maxContentTokens - The max_content_tokens parameter limits the amount of content that will be included in the context.
   */
  webFetch_20250910,

  /**
   * Creates a web fetch tool that gives Claude direct access to real-time web content.
   *
   * @param maxUses - The max_uses parameter limits the number of web fetches performed
   * @param allowedDomains - Only fetch from these domains
   * @param blockedDomains - Never fetch from these domains
   * @param citations - Unlike web search where citations are always enabled, citations are optional for web fetch. Set "citations": {"enabled": true} to enable Claude to cite specific passages from fetched documents.
   * @param maxContentTokens - The max_content_tokens parameter limits the amount of content that will be included in the context.
   */
  webFetch_20260209,

  /**
   * Creates a web search tool that gives Claude direct access to real-time web content.
   *
   * @param maxUses - Maximum number of web searches Claude can perform during the conversation.
   * @param allowedDomains - Optional list of domains that Claude is allowed to search.
   * @param blockedDomains - Optional list of domains that Claude should avoid when searching.
   * @param userLocation - Optional user location information to provide geographically relevant search results.
   */
  webSearch_20250305,

  /**
   * Creates a web search tool that gives Claude direct access to real-time web content.
   *
   * @param maxUses - Maximum number of web searches Claude can perform during the conversation.
   * @param allowedDomains - Optional list of domains that Claude is allowed to search.
   * @param blockedDomains - Optional list of domains that Claude should avoid when searching.
   * @param userLocation - Optional user location information to provide geographically relevant search results.
   */
  webSearch_20260209,

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
  toolSearchRegex_20251119,

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
  toolSearchBm25_20251119,
};
