import type { INode } from 'n8n-workflow';

import type { EngineV2Reason } from './types';

const EXPRESSION = Symbol('expression');

/** `unknown` when an expression decides it, because the check does not evaluate expressions. */
type Waits = boolean | 'unknown';

interface WaitingTrigger {
	waits: (node: INode) => Waits;
	/** The setting change that stops the trigger from waiting. */
	fix: (node: INode) => string;
}

const isExpression = (value: unknown) => typeof value === 'string' && value.startsWith('=');

function readParameter(node: INode, name: string): unknown {
	const value = node.parameters[name];
	return isExpression(value) ? EXPRESSION : value;
}

/** An option in the `options` collection has no default when the trigger runs, so it can be `undefined`. */
function readOption(node: INode, name: string): unknown {
	const { options } = node.parameters;
	if (isExpression(options)) return EXPRESSION;
	if (typeof options !== 'object' || options === null || Array.isArray(options)) return undefined;
	const value: unknown = Reflect.get(options, name);
	return isExpression(value) ? EXPRESSION : value;
}

const waitsWhen = (value: unknown, waits: (value: unknown) => boolean): Waits =>
	value === EXPRESSION ? 'unknown' : waits(value);

const TURN_ON_PARALLEL_PROCESSING = 'Turn on Parallel Processing in the options.';

/** Each entry copies how the trigger's own code decides to wait for its run. */
const WAITING_TRIGGERS: Record<string, WaitingTrigger> = {
	'n8n-nodes-base.kafkaTrigger': {
		waits: (node) => {
			if (node.typeVersion === 1) return false;
			if (node.typeVersion === 1.1) {
				return waitsWhen(readOption(node, 'parallelProcessing'), (enabled) => !enabled);
			}
			// v1.2 hides Resolve Offset, so the trigger resolves the offset immediately.
			if (node.typeVersion < 1.3) return false;
			return waitsWhen(
				readParameter(node, 'resolveOffset'),
				(mode) => (mode ?? 'onCompletion') !== 'immediately',
			);
		},
		fix: (node) =>
			node.typeVersion === 1.1 ? TURN_ON_PARALLEL_PROCESSING : 'Set Resolve Offset to Immediately.',
	},
	'n8n-nodes-base.rabbitmqTrigger': {
		waits: (node) => {
			const acknowledge = readOption(node, 'acknowledge');
			if (acknowledge === EXPRESSION) return 'unknown';
			if (acknowledge !== undefined) return acknowledge !== 'immediately';
			// Without an explicit mode, a parallel message limit makes the trigger
			// delete the message only when the execution finishes.
			return waitsWhen(
				readOption(node, 'parallelMessages'),
				(limit) => limit !== undefined && limit !== -1,
			);
		},
		fix: () =>
			'Set Delete From Queue When to Immediately and remove the Parallel Message Processing Limit.',
	},
	'n8n-nodes-base.amqpTrigger': {
		waits: (node) =>
			waitsWhen(readOption(node, 'parallelProcessing'), (enabled) => enabled === false),
		fix: () => TURN_ON_PARALLEL_PROCESSING,
	},
	'n8n-nodes-base.mqttTrigger': {
		waits: (node) => waitsWhen(readOption(node, 'parallelProcessing'), (enabled) => !enabled),
		fix: () => TURN_ON_PARALLEL_PROCESSING,
	},
};

/**
 * Mirrors `EngineV2ActiveTriggers`, which refuses a trigger that waits for its run
 * to finish. The trigger's settings decide whether it waits. CET-299 removes this rule.
 */
export function findTriggerWaitReasons(nodes: INode[]): EngineV2Reason[] {
	return nodes.flatMap((node) => {
		const trigger = WAITING_TRIGGERS[node.type];
		if (!trigger || node.disabled === true) return [];
		const waits = trigger.waits(node);
		if (waits === false) return [];
		const message =
			waits === true
				? `Engine v2 cannot run the "${node.name}" trigger yet, because it waits for its execution to finish. ${trigger.fix(node)}`
				: `Engine v2 cannot run the "${node.name}" trigger if it waits for its execution to finish. An expression decides this. ${trigger.fix(node)}`;
		return [
			{
				code: 'TRIGGER_WAITS_FOR_RUN',
				severity: waits === true ? 'blocking' : 'warning',
				nodeId: node.id,
				nodeName: node.name,
				message,
			},
		];
	});
}
