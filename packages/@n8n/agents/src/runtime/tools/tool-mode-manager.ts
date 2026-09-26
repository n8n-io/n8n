import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { SKILL_LOAD_TOOL_NAME } from '../../skills/types';
import type { AgentDbMessage, ContentToolCall } from '../../types/sdk/message';
import type { BuiltTool } from '../../types/sdk/tool';
import type { ToolModesConfig } from '../../types/sdk/tool-modes';
import { LOAD_TOOL_TOOL_NAME, SEARCH_TOOLS_TOOL_NAME } from './deferred-tool-manager';

export const SWITCH_MODE_TOOL_NAME = 'switch_mode';

/**
 * Discovery tools do not change the mode, so the model must pick the mode first.
 * The hints stay the same in every mode, so a switch does not rewrite them.
 */
const MODE_HINTS: Record<string, string> = {
	[SKILL_LOAD_TOOL_NAME]: `Call ${SWITCH_MODE_TOOL_NAME} to the mode that the skill's work needs before you load it: a skill names tools that only that mode has.`,
	[SEARCH_TOOLS_TOOL_NAME]: `Searches only the tools that can be loaded in the current mode. If the tool you need belongs to another mode, call ${SWITCH_MODE_TOOL_NAME} instead.`,
	[LOAD_TOOL_TOOL_NAME]: `Loading a tool does not change the mode. Call ${SWITCH_MODE_TOOL_NAME} first if the task belongs to another mode.`,
};

const switchModeOutputSchema = z.object({
	status: z.enum(['switched', 'unchanged']),
	mode: z.string(),
	tools: z.array(z.string()),
	message: z.string(),
});

type SwitchModeOutput = z.infer<typeof switchModeOutputSchema>;

/**
 * Tracks the active tool mode of one run. Tools that a mode names are visible
 * only in that mode. Tools that no mode names are visible in every mode.
 */
export class ToolModeManager {
	private currentMode: string;

	private readonly scopedToolNames: Set<string>;

	private readonly switchTool: BuiltTool;

	private readonly hintedTools = new WeakMap<BuiltTool, BuiltTool>();

	/** Set by a switch and cleared when the runtime takes it at a loop boundary. */
	private switchPending = false;

	constructor(private readonly config: ToolModesConfig) {
		const modeNames = Object.keys(config.modes);
		if (modeNames.length === 0) throw new Error('Tool modes need at least one mode');
		if (!(config.initialMode in config.modes)) {
			throw new Error(`Initial tool mode "${config.initialMode}" is not a configured mode`);
		}
		this.currentMode = config.initialMode;
		this.scopedToolNames = new Set(Object.values(config.modes).flatMap((mode) => mode.tools));
		if (this.scopedToolNames.has(SWITCH_MODE_TOOL_NAME)) {
			throw new Error(`Tool name "${SWITCH_MODE_TOOL_NAME}" is reserved for tool modes`);
		}
		this.switchTool = this.createSwitchTool(modeNames);
	}

	get mode(): string {
		return this.currentMode;
	}

	getControllerTool(): BuiltTool {
		return this.switchTool;
	}

	/** Adds a pick-the-mode-first hint to the skill and tool discovery tools; returns other tools as-is. */
	withModeHint(tool: BuiltTool): BuiltTool {
		const hint = MODE_HINTS[tool.name];
		if (!hint) return tool;
		let hinted = this.hintedTools.get(tool);
		if (!hinted) {
			hinted = { ...tool, description: `${tool.description} ${hint}` };
			this.hintedTools.set(tool, hinted);
		}
		return hinted;
	}

	/** True when at least one mode names the tool. */
	isModeScoped(toolName: string): boolean {
		return this.scopedToolNames.has(toolName);
	}

	/** True when the tool is not scoped to a mode, or is scoped to the current mode. */
	isVisible(toolName: string): boolean {
		return (
			!this.scopedToolNames.has(toolName) ||
			this.config.modes[this.currentMode].tools.includes(toolName)
		);
	}

	/** Uncached note that tells the model which mode is active, unless the host announces it. */
	instructions(): string | undefined {
		if (this.config.announceMode === false) return undefined;
		return `<tool_mode>Your current tool mode is "${this.currentMode}". Call ${SWITCH_MODE_TOOL_NAME} when you need a tool from another mode.</tool_mode>`;
	}

	switchTo(mode: string): SwitchModeOutput {
		const tools = this.config.modes[mode].tools;
		if (mode === this.currentMode) {
			return {
				status: 'unchanged',
				mode,
				tools,
				message: `Tool mode "${mode}" is already active.`,
			};
		}
		this.currentMode = mode;
		this.switchPending = true;
		return {
			status: 'switched',
			mode,
			tools,
			message: `Tool mode is now "${mode}". Its tools are available on the next model turn.`,
		};
	}

	/**
	 * Once per switch, return the ID of the latest message that holds a
	 * resolved switch. Returns undefined when no switch happened since the last call.
	 */
	takeSwitchMessageId(messages: readonly AgentDbMessage[]): string | undefined {
		if (!this.switchPending) return undefined;
		this.switchPending = false;
		for (let i = messages.length - 1; i >= 0; i--) {
			const message = messages[i];
			if (!('content' in message) || !Array.isArray(message.content)) continue;
			const hasSwitch = message.content.some(
				(block) =>
					this.isResolvedSwitchCall(block) &&
					isRecord(block.output) &&
					block.output.status === 'switched',
			);
			if (hasSwitch) return message.id;
		}
		return undefined;
	}

	/**
	 * Restore the mode from this run's messages, so a resumed run continues in
	 * the mode it had when it suspended. Earlier runs start from the initial mode.
	 */
	hydrateFromMessages(messages: readonly AgentDbMessage[]): void {
		this.switchPending = false;
		this.currentMode = this.config.initialMode;
		for (const message of messages) {
			if (!('content' in message) || !Array.isArray(message.content)) continue;
			for (const block of message.content) {
				if (!this.isResolvedSwitchCall(block)) continue;
				const output = block.output;
				if (!isRecord(output) || output.status !== 'switched') continue;
				if (typeof output.mode === 'string' && output.mode in this.config.modes) {
					this.currentMode = output.mode;
				}
			}
		}
	}

	private createSwitchTool(modeNames: string[]): BuiltTool {
		const [first, ...rest] = modeNames;
		const inputSchema = z.object({
			mode: z.enum([first, ...rest]).describe('The tool mode to switch to'),
		});
		const modeList = Object.entries(this.config.modes)
			.map(([name, mode]) => {
				const tools = mode.tools.length > 0 ? mode.tools.join(', ') : 'no extra tools';
				return `- ${name}: ${mode.description} Tools: ${tools}.`;
			})
			.join('\n');
		return {
			name: SWITCH_MODE_TOOL_NAME,
			description: `Switch the tool mode. Each mode adds its own tools to the tools that every mode has. Switch only when the current mode does not have a tool that you need.\n${modeList}`,
			inputSchema,
			outputSchema: switchModeOutputSchema,
			handler: async (input) => {
				const { mode } = inputSchema.parse(input);
				return await Promise.resolve(this.switchTo(mode));
			},
		};
	}

	private isResolvedSwitchCall(
		block: unknown,
	): block is Extract<ContentToolCall, { state: 'resolved' }> {
		return (
			isRecord(block) &&
			block.type === 'tool-call' &&
			block.toolName === SWITCH_MODE_TOOL_NAME &&
			block.state === 'resolved'
		);
	}
}
