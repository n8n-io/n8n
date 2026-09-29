import type { AgentConfigValidationCapabilityRef } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

export type SetupTaskState = 'unknown' | 'needs_setup' | 'complete';

export interface SetupContext {
	channels: {
		loaded: boolean;
		ids: readonly string[];
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

/** State Getters */
function getAddChannelState(context: SetupContext): SetupTaskState {
	if (!context.channels.loaded) return 'unknown';

	return context.channels.ids.length > 0 ? 'complete' : 'needs_setup';
}

export const setupTaskDefinitions = {
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
} satisfies Record<string, SetupTaskDefinition>;

export type SetupTaskId = keyof typeof setupTaskDefinitions;

export const setupTaskOrder = ['add-channel'] as const satisfies readonly SetupTaskId[];
