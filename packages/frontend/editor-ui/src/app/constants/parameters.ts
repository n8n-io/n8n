import { SWITCH_NODE_TYPE } from './nodeTypes';
import type { IconName } from '@n8n/design-system/src/components/N8nIcon/icons';

export const DATA_TYPE_ICON_MAP = {
	['string']: 'type',
	['number']: 'hash',
	['boolean']: 'square-check',
	date: 'calendar',
	array: 'list',
	object: 'box',
	file: 'file',
} satisfies Record<string, IconName>;

export const MAPPING_PARAMS = [
	'$binary',
	'$data',
	'$env',
	'$evaluateExpression',
	'$execution',
	'$ifEmpty',
	'$input',
	'$item',
	'$jmespath',
	'$fromAI',
	'$json',
	'$node',
	'$now',
	'$parameter',
	'$parameters',
	'$position',
	'$prevNode',
	'$resumeWebhookUrl',
	'$runIndex',
	'$today',
	'$vars',
	'$workflow',
	'$nodeVersion',
];

type ClearOutgoingConnectonsEvents = {
	[nodeName: string]: {
		parameterPaths: string[];
		eventTypes: string[];
	};
};

export const SHOULD_CLEAR_NODE_OUTPUTS: ClearOutgoingConnectonsEvents = {
	[SWITCH_NODE_TYPE]: {
		parameterPaths: ['parameters.rules.values'],
		eventTypes: ['optionsOrderChanged'],
	},
};

// A path that does not exist so that nothing is selected by default
export const nonExistingJsonPath = '_!^&*';

export const APPEND_ATTRIBUTION_DEFAULT_PATH = 'parameters.options.appendAttribution';

export const DRAG_EVENT_DATA_KEY = 'nodesAndConnections';

// Parameter input
export const CUSTOM_API_CALL_KEY = '__CUSTOM_API_CALL__';
export const CUSTOM_API_CALL_NAME = 'Custom API Call';
