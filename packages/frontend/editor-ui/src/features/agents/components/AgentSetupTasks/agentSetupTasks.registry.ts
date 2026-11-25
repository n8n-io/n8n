import type { AgentConfigValidationCapabilityRef } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

export type SetupTaskState = 'unknown' | 'todo' | 'complete';

export interface SetupContext {
	config: {
		loaded: boolean;
		isRunnable: boolean;
		model: string;
		instructions: string;
		toolCount: number;
		scheduleCount: number;
	};
	channels: {
		loaded: boolean;
		ids: readonly string[];
	};
	publication: {
		loaded: boolean;
		canPublish: boolean;
		activeVersionId: string | null;
	};
	sessions: {
		loaded: boolean;
		count: number;
	};
	showTriggerStep: boolean;
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

export type SetupTaskDefinition = Omit<SetupTask, 'id' | 'state' | 'visible'> & {
	getState: (context: SetupContext) => SetupTaskState;
	getVisible?: (context: SetupContext) => boolean;
};

/** Returns the task state after the agent configuration is available. */
function getConfigState(context: SetupContext, complete: boolean): SetupTaskState {
	if (!context.config.loaded) return 'unknown';

	return complete ? 'complete' : 'todo';
}

function hasTrigger(context: SetupContext): boolean {
	return context.channels.ids.length > 0 || context.config.scheduleCount > 0;
}

function isAddTriggerComplete(context: SetupContext): boolean {
	return context.channels.loaded && context.config.loaded && hasTrigger(context);
}

function getAddTriggerState(context: SetupContext): SetupTaskState {
	if (!context.channels.loaded || !context.config.loaded) return 'unknown';

	return hasTrigger(context) ? 'complete' : 'todo';
}

function getPublishAgentState(context: SetupContext): SetupTaskState {
	if (!context.publication.loaded) return 'unknown';

	return context.publication.activeVersionId ? 'complete' : 'todo';
}

function isTestAgentComplete(context: SetupContext): boolean {
	return context.sessions.loaded && context.sessions.count > 0;
}

function getTestAgentState(context: SetupContext): SetupTaskState {
	if (!context.sessions.loaded) return 'unknown';

	return isTestAgentComplete(context) ? 'complete' : 'todo';
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
		titleKey: 'agents.builder.setupTasks.addTool',
		required: false,
		action: {
			labelKey: 'agents.builder.setupTasks.addTool',
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
	'test-agent': {
		titleKey: 'agents.builder.setupTasks.testAgent',
		required: false,
		action: {
			labelKey: 'agents.builder.setupTasks.testAgent',
			target: { kind: 'agent' },
			path: 'preview',
		},
		getVisible: (context) => context.config.isRunnable,
		getState: getTestAgentState,
	},
	'add-trigger': {
		titleKey: 'agents.builder.setupTasks.addTrigger',
		descriptionKey: 'agents.builder.setupTasks.addChannel.description',
		required: false,
		getVisible: (context) => context.showTriggerStep,
		action: {
			labelKey: 'agents.builder.setupTasks.addTrigger',
			target: { kind: 'channel' },
		},
		getState: getAddTriggerState,
	},
	'publish-agent': {
		titleKey: 'agents.builder.setupTasks.publishAgent',
		getVisible: (context) =>
			context.publication.canPublish &&
			isTestAgentComplete(context) &&
			(!context.showTriggerStep || isAddTriggerComplete(context)),
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
	'test-agent',
	'add-trigger',
	'publish-agent',
] as const satisfies readonly SetupTaskId[];
