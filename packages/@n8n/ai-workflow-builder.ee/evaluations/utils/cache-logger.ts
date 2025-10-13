import type { BaseMessage } from '@langchain/core/messages';
import { promises as fs } from 'fs';
import path from 'path';
import pc from 'picocolors';

import type { MessageCacheStats } from '../types/test-result';

interface UsageMetadata {
	input_tokens?: number;
	output_tokens?: number;
	cache_creation_input_tokens?: number;
	cache_read_input_tokens?: number;
}

interface MessageWithMetadata {
	response_metadata?: {
		usage?: UsageMetadata;
	};
	constructor?: {
		name?: string;
	};
	_getType?: () => string;
	name?: string;
	tool_call_id?: string;
	tool_calls?: Array<{ name: string }>;
}

/**
 * Logger for detailed per-message cache statistics
 */
export class CacheLogger {
	private logPath: string;
	private logEntries: string[] = [];

	constructor(iteration: number, testCaseId: string, baseDir: string = 'results/cache-logs') {
		const iterationDir = path.join(baseDir, `iteration-${iteration}`);
		this.logPath = path.join(iterationDir, `${testCaseId}.log`);
	}

	/**
	 * Log a single message's cache statistics
	 */
	logMessage(stats: MessageCacheStats): void {
		const lines: string[] = [];

		// Header
		lines.push('');
		lines.push('━'.repeat(70));
		lines.push(`[${stats.timestamp}] Message #${stats.messageIndex} (${stats.messageType})`);

		// Message details
		if (stats.role) {
			lines.push(`  Role: ${stats.role}`);
		}
		if (stats.toolName) {
			lines.push(`  Tool: ${stats.toolName}`);
		}

		// Token usage
		lines.push('');
		lines.push('  Token Usage:');
		if (stats.inputTokens > 0) {
			lines.push(`    Input Tokens:          ${stats.inputTokens.toLocaleString()}`);
		}
		if (stats.outputTokens > 0) {
			lines.push(`    Output Tokens:         ${stats.outputTokens.toLocaleString()}`);
		}
		if (stats.cacheCreationTokens > 0) {
			lines.push(`    Cache Creation Tokens: ${stats.cacheCreationTokens.toLocaleString()} ✍️`);
		}
		if (stats.cacheReadTokens > 0) {
			lines.push(`    Cache Read Tokens:     ${stats.cacheReadTokens.toLocaleString()} ⚡`);
		}

		// Cache performance
		if (stats.cacheReadTokens > 0 || stats.cacheCreationTokens > 0) {
			lines.push('');
			lines.push('  Cache Performance:');
			const hitRatePercent = (stats.cacheHitRate * 100).toFixed(2);
			const hitRateEmoji = stats.cacheHitRate > 0.6 ? '🔥' : stats.cacheHitRate > 0.3 ? '⚡' : '❄️';
			lines.push(`    Hit Rate: ${hitRatePercent}% ${hitRateEmoji}`);

			// Show cache warming indicator
			if (stats.cacheReadTokens > 0) {
				lines.push('    Status: Cache hit - tokens served from cache');
			} else if (stats.cacheCreationTokens > 0) {
				lines.push('    Status: Cache miss - tokens written to cache');
			}
		}

		this.logEntries.push(lines.join('\n'));
	}

	/**
	 * Log a summary header for the test
	 */
	logTestHeader(testName: string, iteration: number): void {
		const lines: string[] = [];
		lines.push('');
		lines.push('═'.repeat(70));
		lines.push(`  Test: ${testName}`);
		lines.push(`  Iteration: ${iteration}`);
		lines.push(`  Started: ${new Date().toISOString()}`);
		lines.push('═'.repeat(70));
		lines.push('');

		this.logEntries.push(lines.join('\n'));
	}

	/**
	 * Log a summary footer with aggregate statistics
	 */
	logTestFooter(
		totalMessages: number,
		totalCacheReads: number,
		totalCacheCreations: number,
		overallHitRate: number,
	): void {
		const lines: string[] = [];
		lines.push('');
		lines.push('━'.repeat(70));
		lines.push('  Test Summary:');
		lines.push(`    Total Messages: ${totalMessages}`);
		lines.push(`    Total Cache Reads: ${totalCacheReads.toLocaleString()}`);
		lines.push(`    Total Cache Creations: ${totalCacheCreations.toLocaleString()}`);
		lines.push(`    Overall Hit Rate: ${(overallHitRate * 100).toFixed(2)}%`);
		lines.push('━'.repeat(70));
		lines.push('');

		this.logEntries.push(lines.join('\n'));
	}

	/**
	 * Write all log entries to the file
	 */
	async flush(): Promise<void> {
		const dir = path.dirname(this.logPath);
		await fs.mkdir(dir, { recursive: true });
		await fs.writeFile(this.logPath, this.logEntries.join('\n'));
		console.log(pc.dim(`  Cache log saved: ${this.logPath}`));
	}

	/**
	 * Get the log file path
	 */
	getLogPath(): string {
		return this.logPath;
	}
}

/**
 * Determines message type and tool name from a message
 */
function determineMessageType(message: MessageWithMetadata): {
	messageType: MessageCacheStats['messageType'];
	toolName: string | undefined;
} {
	let messageType: MessageCacheStats['messageType'] = 'user';
	let toolName: string | undefined;

	const constructorName = message.constructor?.name;
	const messageTypeStr = message._getType?.();

	// Check for tool calls first
	if (message.tool_calls && message.tool_calls.length > 0) {
		return {
			messageType: 'tool_call',
			toolName: message.tool_calls[0].name,
		};
	}

	// Determine based on constructor or type
	if (constructorName === 'AIMessage' || messageTypeStr === 'ai') {
		messageType = 'assistant';
	} else if (constructorName === 'HumanMessage' || messageTypeStr === 'human') {
		messageType = 'user';
	} else if (constructorName === 'ToolMessage' || messageTypeStr === 'tool') {
		messageType = 'tool_response';
		toolName = message.name ?? message.tool_call_id;
	}

	return { messageType, toolName };
}

/**
 * Extract per-message cache statistics from message history
 */
export function extractPerMessageCacheStats(
	messages: BaseMessage[] | MessageWithMetadata[],
): MessageCacheStats[] {
	const stats: MessageCacheStats[] = [];

	for (let i = 0; i < messages.length; i++) {
		const message = messages[i] as MessageWithMetadata;
		const usage = message.response_metadata?.usage;

		if (!usage) {
			continue;
		}

		const { messageType, toolName } = determineMessageType(message);

		const inputTokens = usage.input_tokens ?? 0;
		const outputTokens = usage.output_tokens ?? 0;
		const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
		const cacheReadTokens = usage.cache_read_input_tokens ?? 0;

		const totalInputTokens = inputTokens + cacheCreationTokens + cacheReadTokens;
		const cacheHitRate = totalInputTokens > 0 ? cacheReadTokens / totalInputTokens : 0;

		stats.push({
			messageIndex: i + 1,
			timestamp: new Date().toISOString(),
			messageType,
			role: message._getType?.(),
			toolName,
			inputTokens,
			outputTokens,
			cacheCreationTokens,
			cacheReadTokens,
			cacheHitRate,
		});
	}

	return stats;
}
