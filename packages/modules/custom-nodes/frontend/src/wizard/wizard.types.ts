import type {
	CustomActionDraftIssue,
	CustomActionInput,
	CustomActionRequest,
	CustomNodeAuth,
} from '@n8n/api-types';
import type { INodeParameters } from 'n8n-workflow';

/** The data that opens the wizard. Every field is optional except the mode. */
export type CustomActionWizardData = {
	mode: 'create' | 'edit';
	/** Preselects this node as the target. A custom node type selects that custom node. */
	parentNodeType?: string;
	/** The action to edit. Needed in the edit mode. */
	actionId?: string;
	/** Preselects this custom node as the target. */
	customNodeId?: string;
	/** Fills the request from the parameters of an HTTP Request node. */
	httpRequestParameters?: INodeParameters;
};

export type WizardTarget =
	| { kind: 'newNode' }
	| { kind: 'node'; customNodeId: string }
	| { kind: 'parent'; parentNodeType: string };

export interface NewNodeFields {
	displayName: string;
	description: string;
	baseUrl: string;
	auth: CustomNodeAuth;
}

/** One fixed header or query parameter. */
export interface EditableEntry {
	id: string;
	key: string;
	value: string;
}

export interface EditableRequest {
	method: CustomActionRequest['method'];
	url: string;
	headers: EditableEntry[];
	query: EditableEntry[];
	bodyType: CustomActionRequest['bodyType'];
	/** The fixed body as JSON text. */
	bodyText: string;
}

export interface EditableInput {
	id: string;
	name: string;
	displayName: string;
	description: string;
	type: CustomActionInput['type'];
	required: boolean;
	/** The default as text. An empty text means no default. */
	defaultText: string;
	/** One option for each line, as `Name=value`. */
	optionsText: string;
	target: CustomActionInput['target'];
	key: string;
}

export type WizardStep = 'choose' | 'request' | 'fields' | 'review';

export const WIZARD_STEPS: readonly WizardStep[] = ['choose', 'request', 'fields', 'review'];

export type LocalIssueCode =
	| 'required'
	| 'target_required'
	| 'invalid_input_name'
	| 'invalid_number'
	| 'invalid_boolean'
	| 'invalid_json'
	| 'missing_key'
	| 'absolute_url_required'
	| 'invalid_base_url';

/** An issue that the wizard finds before it asks the server. `code` selects the message. */
export interface LocalIssue {
	path: string;
	code: LocalIssueCode;
}

export type WizardIssue = CustomActionDraftIssue;
