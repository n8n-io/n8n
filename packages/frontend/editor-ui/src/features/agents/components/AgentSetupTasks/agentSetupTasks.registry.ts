import type { AgentConfigValidationCapabilityRef } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

export type SetupTaskState = 'unknown' | 'todo' | 'complete';

export interface SetupContext {
	config: {
		loaded: boolean;
		model: string;
		instructions: string;
		toolCount: number;
	};
	channels: {
		loaded: boolean;
		ids: readonly string[];
	};
	publication: {
		loaded: boolean;
		activeVersionId: string | null;
	};
}

export interface SetupTask<TId extends string = string> {
	/** Stable across task order and page reloads. */
	id: TId;
	/** Name of the task, for example, Add channel. */
	titleKey: BaseTextKey;
	/** Description that gives more context about the task. */
	descriptionKey?: BaseTextKey;
	/** Whether this task is required to publish the agent. */
	required: boolean;
	/** Derived from configuration and validation. */
	state: SetupTaskState;
	/** Whether to show the task. */
	visible?: boolean;
	/** The action to do when a user selects the task. */
	action: {
		labelKey: BaseTextKey;
		target: AgentConfigValidationCapabilityRef;
		path?: string;
	};
}

export type SetupTaskDefinition = Omit<SetupTask, 'id' | 'state'> & {
	getState: (context: SetupContext) => SetupTaskState;
};

/** Returns the task state after the agent configuration is available. */
function getConfigState(context: SetupContext, complete: boolean): SetupTaskState {
	if (!context.config.loaded) return 'unknown';

	return complete ? 'complete' : 'todo';
}

function getAddChannelState(context: SetupContext): SetupTaskState {
	if (!context.channels.loaded) return 'unknown';

	return context.channels.ids.length > 0 ? 'complete' : 'todo';
}

function getPublishAgentState(context: SetupContext): SetupTaskState {
	if (!context.publication.loaded) return 'unknown';

	return context.publication.activeVersionId ? 'complete' : 'todo';
}

export const setupTaskDefinitions = {
	'choose-model': {
		titleKey: 'agents.builder.setupTasks.chooseModel',
		required: true,
		action: {
			labelKey: 'agents.builder.setupTasks.chooseModel',
			target: { kind: 'agent' },
			path: 'model',
		},
		getState: (context) => getConfigState(context, context.config.model.trim().length > 0),
	},
	'add-tool': {
		titleKey: 'agents.builder.tools.add',
		required: false,
		action: {
			labelKey: 'agents.builder.tools.add',
			target: { kind: 'tool' },
		},
		getState: (context) => getConfigState(context, context.config.toolCount > 0),
	},
	'add-instructions': {
		titleKey: 'agents.builder.setupTasks.addInstructions',
		required: true,
		action: {
			labelKey: 'agents.builder.setupTasks.addInstructions',
			target: { kind: 'agent' },
			path: 'instructions',
		},
		getState: (context) => getConfigState(context, context.config.instructions.trim().length > 0),
	},
	'add-channel': {
		titleKey: 'agents.builder.channel.add',
		descriptionKey: 'agents.builder.channel.empty.description',
		required: true,
		action: {
			labelKey: 'agents.builder.channel.add',
			target: { kind: 'channel' },
		},
		getState: getAddChannelState,
	},
	'publish-agent': {
		titleKey: 'agents.builder.setupTasks.publishAgent',
		required: false,
		action: {
			labelKey: 'agents.builder.setupTasks.publishAgent',
			target: { kind: 'agent' },
		},
		getState: getPublishAgentState,
	},
} satisfies Record<string, SetupTaskDefinition>;

export type SetupTaskId = keyof typeof setupTaskDefinitions;

export const setupTaskOrder = [
	'choose-model',
	'add-tool',
	'add-instructions',
	'add-channel',
	'publish-agent',
] as const satisfies readonly SetupTaskId[];
