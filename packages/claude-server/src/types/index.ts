import type Anthropic from '@anthropic-ai/sdk';

/**
 * Represents a conversation session with Claude.
 * Think of this as one ongoing conversation - like keeping Claude Code open in your terminal.
 * Each session maintains its own message history and context.
 */
export interface Session {
	/** Unique identifier for this conversation session */
	id: string;
	/** All messages exchanged in this conversation (both user messages and Claude's responses) */
	messages: Anthropic.MessageParam[];
	/** When this conversation was started */
	createdAt: Date;
	/** Last time a message was sent in this conversation */
	lastActivityAt: Date;
	/** The directory where Claude should execute commands and read/write files */
	workingDirectory: string;
}

/**
 * What you send to the server to talk to Claude.
 * Just like typing a message in the Claude Code CLI.
 */
export interface SendMessageRequest {
	/** Your message/question/instruction to Claude */
	content: string;
	/** Optional: which conversation to continue. If omitted, creates a new conversation */
	sessionId?: string;
}

/**
 * What you get back from Claude after sending a message.
 * This includes Claude's response and any actions it took (like reading files or running commands).
 */
export interface SendMessageResponse {
	/** The conversation ID (use this to continue the conversation) */
	sessionId: string;
	/** Claude's text response to your message */
	content: string;
	/** Optional: Details about any actions Claude took (read files, ran commands, etc.) */
	toolResults?: ToolResult[];
}

/**
 * Information about an action Claude took while responding.
 * For example: reading a file, running a command, searching code, etc.
 * This helps you see what Claude did "behind the scenes".
 */
export interface ToolResult {
	/** Name of the action (e.g., "Read", "Bash", "Grep") */
	toolName: string;
	/** What Claude asked for (e.g., {file_path: "/path/to/file"}) */
	input: unknown;
	/** The result of the action (e.g., file contents, command output) */
	output: string;
	/** Whether the action failed */
	isError: boolean;
}

/**
 * Summary information about a conversation session.
 * Useful for listing all active conversations.
 */
export interface SessionInfo {
	id: string;
	createdAt: Date;
	lastActivityAt: Date;
	/** How many messages have been exchanged */
	messageCount: number;
	workingDirectory: string;
}

// ============================================================================
// Internal types below - these are implementation details for how tools work
// ============================================================================

/** Function that executes a tool action (internal use) */
export type ToolExecutor = (input: unknown) => Promise<string>;

/**
 * Defines a tool/capability that Claude can use (internal use).
 * Tools are things like "read a file", "run a command", "search code".
 * Claude automatically decides when to use these based on your request.
 */
export interface ToolDefinition {
	name: string;
	description: string;
	input_schema: {
		type: 'object';
		properties: Record<string, unknown>;
		required?: string[];
	};
	execute: ToolExecutor;
}
