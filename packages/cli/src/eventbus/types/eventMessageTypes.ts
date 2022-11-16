/**
 * Event Message Types use Template Literal Type definitions
 */

//TODO: totally random...
export type EventMessageNamesWorkflow = 'workflowStarted' | 'workflowEnded';
type EventsUi = 'clicki' | 'bunti';
type EventsCore = 'melting' | 'burning' | 'eventBusInitialized';
type EventsNodes = 'created' | 'removed';

type EventMessageGroupNames = `ui` | `workflow` | `core` | `nodes`;

type EventMessageGroupsWithEvents =
	| `ui.${EventsUi}`
	| `workflow.${EventMessageNamesWorkflow}`
	| `core.${EventsCore}`
	| `nodes.${EventsNodes}`;

type EventMessageNamespaces = 'n8n';

export type EventMessageNames = '*' | `${EventMessageNamespaces}.${EventMessageGroupsWithEvents}`;
export type EventMessageGroups = '*' | `${EventMessageNamespaces}.${EventMessageGroupNames}`;
export type EventMessageEventName = string;
export type EventMessageLevel =
	| 'debug'
	| 'info'
	| 'notice'
	| 'warning'
	| 'error'
	| 'crit'
	| 'alert'
	| 'emerg'
	| '*';
