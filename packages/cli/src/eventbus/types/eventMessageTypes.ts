/**
 * Event Message Types use Template Literal Type definitions
 */

//TODO: totally random...
type EventsWorkflow = 'workflowStarted' | 'workflowEnded';
type EventsUi = 'clicki' | 'bunti';
type EventsCore = 'melting' | 'burning' | 'eventBusInitialized';
type EventsNodes = 'created' | 'removed';

type EventMessageGroupNames = `ui` | `workflow` | `core` | `nodes`;

type EventMessageGroupsWithEvents =
	| `ui.${EventsUi}`
	| `workflow.${EventsWorkflow}`
	| `core.${EventsCore}`
	| `nodes.${EventsNodes}`;

type EventMessageNamespaces = 'n8n';

export type EventMessageNames = `${EventMessageNamespaces}.${EventMessageGroupsWithEvents}`;
export type EventMessageGroups = `${EventMessageNamespaces}.${EventMessageGroupNames}`;
export type EventMessageEventName = string;
export type EventMessageLevel = 'info' | 'debug' | 'verbose' | 'error';
export type EventMessageSeverity = 'low' | 'normal' | 'high' | 'highest';
