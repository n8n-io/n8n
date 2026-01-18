/**
 * Onfleet Node Types
 *
 * Consume Onfleet API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/onfleet/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Create a new Onfleet admin */
export type OnfleetV1AdminCreateConfig = {
	resource: 'admin';
	operation: 'create';
	/**
	 * The ID of the admin object for lookup
	 * @displayOptions.show { resource: ["admin"] }
	 * @displayOptions.hide { operation: ["create", "getAll"] }
	 */
	id: string | Expression<string>;
	/**
	 * The administrator's name
	 * @displayOptions.show { resource: ["admin"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	/**
	 * The administrator's email address
	 * @displayOptions.show { resource: ["admin"], operation: ["create"] }
	 */
	email: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Delete an Onfleet admin */
export type OnfleetV1AdminDeleteConfig = {
	resource: 'admin';
	operation: 'delete';
	/**
	 * The ID of the admin object for lookup
	 * @displayOptions.show { resource: ["admin"] }
	 * @displayOptions.hide { operation: ["create", "getAll"] }
	 */
	id: string | Expression<string>;
};

/** Get many Onfleet admins */
export type OnfleetV1AdminGetAllConfig = {
	resource: 'admin';
	operation: 'getAll';
	/**
	 * The ID of the admin object for lookup
	 * @displayOptions.show { resource: ["admin"] }
	 * @displayOptions.hide { operation: ["create", "getAll"] }
	 */
	id: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["admin"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["admin"], operation: ["getAll"], returnAll: [false] }
	 * @default 64
	 */
	limit?: number | Expression<number>;
};

/** Update an Onfleet admin */
export type OnfleetV1AdminUpdateConfig = {
	resource: 'admin';
	operation: 'update';
	/**
	 * The ID of the admin object for lookup
	 * @displayOptions.show { resource: ["admin"] }
	 * @displayOptions.hide { operation: ["create", "getAll"] }
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Add task at index (or append) */
export type OnfleetV1ContainerAddTaskConfig = {
	resource: 'container';
	operation: 'addTask';
	containerType: 'organizations' | 'teams' | 'workers' | Expression<string>;
	/**
	 * The object ID according to the container chosen
	 * @displayOptions.show { resource: ["container"], operation: ["get", "addTask", "updateTask"] }
	 */
	containerId: string | Expression<string>;
	type: -1 | 0 | 1 | Expression<number>;
	/**
	 * The index given indicates the position where the tasks are going to be inserted
	 * @displayOptions.show { resource: ["container"], operation: ["addTask"], type: [1] }
	 * @default 0
	 */
	index: number | Expression<number>;
	/**
	 * Task's ID that are going to be used
	 * @displayOptions.show { resource: ["container"], operation: ["addTask", "updateTask"] }
	 * @default []
	 */
	tasks: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get container information */
export type OnfleetV1ContainerGetConfig = {
	resource: 'container';
	operation: 'get';
	containerType: 'organizations' | 'teams' | 'workers' | Expression<string>;
	/**
	 * The object ID according to the container chosen
	 * @displayOptions.show { resource: ["container"], operation: ["get", "addTask", "updateTask"] }
	 */
	containerId: string | Expression<string>;
};

/** Fully replace a container's tasks */
export type OnfleetV1ContainerUpdateTaskConfig = {
	resource: 'container';
	operation: 'updateTask';
	/**
	 * The object ID according to the container chosen
	 * @displayOptions.show { resource: ["container"], operation: ["get", "addTask", "updateTask"] }
	 */
	containerId: string | Expression<string>;
	/**
	 * Task's ID that are going to be used
	 * @displayOptions.show { resource: ["container"], operation: ["addTask", "updateTask"] }
	 * @default []
	 */
	tasks: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Create a new Onfleet admin */
export type OnfleetV1DestinationCreateConfig = {
	resource: 'destination';
	operation: 'create';
	/**
	 * The ID of the destination object for lookup
	 * @displayOptions.show { resource: ["destination"] }
	 * @displayOptions.hide { operation: ["create"] }
	 */
	id: string | Expression<string>;
	/**
	 * Whether or not the address is specified in a single unparsed string
	 * @displayOptions.show { resource: ["destination"], operation: ["create"] }
	 * @default false
	 */
	unparsed: boolean | Expression<boolean>;
	/**
	 * The destination's street address details
	 * @displayOptions.show { resource: ["destination"], operation: ["create"], unparsed: [true] }
	 */
	address: string | Expression<string>;
	/**
	 * The number component of this address, it may also contain letters
	 * @displayOptions.show { resource: ["destination"], operation: ["create"], unparsed: [false] }
	 */
	addressNumber: string | Expression<string>;
	/**
	 * The name of the street
	 * @displayOptions.show { resource: ["destination"], operation: ["create"], unparsed: [false] }
	 */
	addressStreet: string | Expression<string>;
	/**
	 * The name of the municipality
	 * @displayOptions.show { resource: ["destination"], operation: ["create"], unparsed: [false] }
	 */
	addressCity: string | Expression<string>;
	/**
	 * The name of the country
	 * @displayOptions.show { resource: ["destination"], operation: ["create"], unparsed: [false] }
	 */
	addressCountry: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Get container information */
export type OnfleetV1DestinationGetConfig = {
	resource: 'destination';
	operation: 'get';
	/**
	 * The ID of the destination object for lookup
	 * @displayOptions.show { resource: ["destination"] }
	 * @displayOptions.hide { operation: ["create"] }
	 */
	id: string | Expression<string>;
};

/** Create a new Onfleet admin */
export type OnfleetV1HubCreateConfig = {
	resource: 'hub';
	operation: 'create';
	/**
	 * A name to identify the hub
	 * @displayOptions.show { resource: ["hub"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	destination?: {
		destinationProperties?: {
			/** Whether or not the address is specified in a single unparsed string
			 * @default false
			 */
			unparsed?: boolean | Expression<boolean>;
			/** The destination's street address details
			 * @displayOptions.show { unparsed: [true] }
			 */
			address?: string | Expression<string>;
			/** The number component of this address, it may also contain letters
			 * @displayOptions.show { unparsed: [false] }
			 */
			addressNumber?: string | Expression<string>;
			/** The name of the street
			 * @displayOptions.show { unparsed: [false] }
			 */
			addressStreet?: string | Expression<string>;
			/** The name of the municipality
			 * @displayOptions.show { unparsed: [false] }
			 */
			addressCity?: string | Expression<string>;
			/** State
			 * @displayOptions.show { unparsed: [false] }
			 */
			addressState?: string | Expression<string>;
			/** The name of the country
			 * @displayOptions.show { unparsed: [false] }
			 */
			addressCountry?: string | Expression<string>;
			/** The postal or zip code
			 * @displayOptions.show { unparsed: [false] }
			 */
			addressPostalCode?: string | Expression<string>;
			/** A name associated with this address
			 */
			addressName?: string | Expression<string>;
			/** The suite or apartment number, or any additional relevant information
			 */
			addressApartment?: string | Expression<string>;
			/** Notes about the destination
			 */
			addressNotes?: string | Expression<string>;
		};
	};
	additionalFields?: Record<string, unknown>;
};

/** Get many Onfleet admins */
export type OnfleetV1HubGetAllConfig = {
	resource: 'hub';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["hub"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["hub"], operation: ["getAll"], returnAll: [false] }
	 * @default 64
	 */
	limit?: number | Expression<number>;
};

/** Update an Onfleet admin */
export type OnfleetV1HubUpdateConfig = {
	resource: 'hub';
	operation: 'update';
	/**
	 * The ID of the hub object for lookup
	 * @displayOptions.show { resource: ["hub"], operation: ["update"] }
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Get container information */
export type OnfleetV1OrganizationGetConfig = {
	resource: 'organization';
	operation: 'get';
};

/** Retrieve the details of an organization with which you are connected */
export type OnfleetV1OrganizationGetDelegateeConfig = {
	resource: 'organization';
	operation: 'getDelegatee';
	/**
	 * The ID of the delegatees for lookup
	 * @displayOptions.show { resource: ["organization"], operation: ["getDelegatee"] }
	 */
	id: string | Expression<string>;
};

/** Create a new Onfleet admin */
export type OnfleetV1RecipientCreateConfig = {
	resource: 'recipient';
	operation: 'create';
	/**
	 * The recipient's complete name
	 * @displayOptions.show { resource: ["recipient"], operation: ["create"] }
	 */
	recipientName: string | Expression<string>;
	/**
	 * A unique, valid phone number as per the organization's country if there's no leading + sign. If a phone number has a leading + sign, it will disregard the organization's country setting.
	 * @displayOptions.show { resource: ["recipient"], operation: ["create"] }
	 */
	recipientPhone: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Get container information */
export type OnfleetV1RecipientGetConfig = {
	resource: 'recipient';
	operation: 'get';
	/**
	 * The variable that is used for looking up a recipient
	 * @displayOptions.show { resource: ["recipient"], operation: ["get"] }
	 * @default id
	 */
	getBy: 'id' | 'phone' | 'name' | Expression<string>;
	/**
	 * The ID of the recipient object for lookup
	 * @displayOptions.show { resource: ["recipient"], operation: ["get"], getBy: ["id"] }
	 */
	id: string | Expression<string>;
	/**
	 * The name of the recipient for lookup
	 * @displayOptions.show { resource: ["recipient"], operation: ["get"], getBy: ["name"] }
	 */
	name: string | Expression<string>;
	/**
	 * The phone of the recipient for lookup
	 * @displayOptions.show { resource: ["recipient"], operation: ["get"], getBy: ["phone"] }
	 */
	phone: string | Expression<string>;
};

/** Update an Onfleet admin */
export type OnfleetV1RecipientUpdateConfig = {
	resource: 'recipient';
	operation: 'update';
	/**
	 * The ID of the recipient object for lookup
	 * @displayOptions.show { resource: ["recipient"], operation: ["update"] }
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Clone an Onfleet task */
export type OnfleetV1TaskCloneConfig = {
	resource: 'task';
	operation: 'clone';
	/**
	 * The ID of the task object for lookup
	 * @displayOptions.show { resource: ["task"] }
	 * @displayOptions.hide { operation: ["create", "getAll"] }
	 */
	id: string | Expression<string>;
	overrideFields?: Record<string, unknown>;
};

/** Force-complete a started Onfleet task */
export type OnfleetV1TaskCompleteConfig = {
	resource: 'task';
	operation: 'complete';
	/**
	 * The ID of the task object for lookup
	 * @displayOptions.show { resource: ["task"] }
	 * @displayOptions.hide { operation: ["create", "getAll"] }
	 */
	id: string | Expression<string>;
	/**
	 * Whether the task's completion was successful
	 * @displayOptions.show { resource: ["task"], operation: ["complete"] }
	 * @default true
	 */
	success: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new Onfleet admin */
export type OnfleetV1TaskCreateConfig = {
	resource: 'task';
	operation: 'create';
	/**
	 * The ID of the task object for lookup
	 * @displayOptions.show { resource: ["task"] }
	 * @displayOptions.hide { operation: ["create", "getAll"] }
	 */
	id: string | Expression<string>;
	destination: {
		destinationProperties?: {
			/** Whether or not the address is specified in a single unparsed string
			 * @default false
			 */
			unparsed?: boolean | Expression<boolean>;
			/** The destination's street address details
			 * @displayOptions.show { unparsed: [true] }
			 */
			address?: string | Expression<string>;
			/** The number component of this address, it may also contain letters
			 * @displayOptions.show { unparsed: [false] }
			 */
			addressNumber?: string | Expression<string>;
			/** The name of the street
			 * @displayOptions.show { unparsed: [false] }
			 */
			addressStreet?: string | Expression<string>;
			/** The name of the municipality
			 * @displayOptions.show { unparsed: [false] }
			 */
			addressCity?: string | Expression<string>;
			/** State
			 * @displayOptions.show { unparsed: [false] }
			 */
			addressState?: string | Expression<string>;
			/** The name of the country
			 * @displayOptions.show { unparsed: [false] }
			 */
			addressCountry?: string | Expression<string>;
			/** The postal or zip code
			 * @displayOptions.show { unparsed: [false] }
			 */
			addressPostalCode?: string | Expression<string>;
			/** A name associated with this address
			 */
			addressName?: string | Expression<string>;
			/** The suite or apartment number, or any additional relevant information
			 */
			addressApartment?: string | Expression<string>;
			/** Notes about the destination
			 */
			addressNotes?: string | Expression<string>;
		};
	};
	additionalFields?: Record<string, unknown>;
};

/** Delete an Onfleet admin */
export type OnfleetV1TaskDeleteConfig = {
	resource: 'task';
	operation: 'delete';
	/**
	 * The ID of the task object for lookup
	 * @displayOptions.show { resource: ["task"] }
	 * @displayOptions.hide { operation: ["create", "getAll"] }
	 */
	id: string | Expression<string>;
};

/** Get container information */
export type OnfleetV1TaskGetConfig = {
	resource: 'task';
	operation: 'get';
	/**
	 * The ID of the task object for lookup
	 * @displayOptions.show { resource: ["task"] }
	 * @displayOptions.hide { operation: ["create", "getAll"] }
	 */
	id: string | Expression<string>;
};

/** Get many Onfleet admins */
export type OnfleetV1TaskGetAllConfig = {
	resource: 'task';
	operation: 'getAll';
	/**
	 * The ID of the task object for lookup
	 * @displayOptions.show { resource: ["task"] }
	 * @displayOptions.hide { operation: ["create", "getAll"] }
	 */
	id: string | Expression<string>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["task"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["task"], operation: ["getAll"], returnAll: [false] }
	 * @default 64
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
};

/** Update an Onfleet admin */
export type OnfleetV1TaskUpdateConfig = {
	resource: 'task';
	operation: 'update';
	/**
	 * The ID of the task object for lookup
	 * @displayOptions.show { resource: ["task"] }
	 * @displayOptions.hide { operation: ["create", "getAll"] }
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Automatically dispatch tasks assigned to a team to on-duty drivers */
export type OnfleetV1TeamAutoDispatchConfig = {
	resource: 'team';
	operation: 'autoDispatch';
	/**
	 * The ID of the team object for lookup
	 * @displayOptions.show { resource: ["team"], operation: ["get", "update", "delete", "getTimeEstimates", "autoDispatch"] }
	 */
	id: string | Expression<string>;
	additionalFields?: Record<string, unknown>;
};

/** Create a new Onfleet admin */
export type OnfleetV1TeamCreateConfig = {
	resource: 'team';
	operation: 'create';
	/**
	 * A unique name for the team
	 * @displayOptions.show { resource: ["team"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	/**
	 * A list of workers. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["team"], operation: ["create"] }
	 * @default []
	 */
	workers: string[];
	/**
	 * A list of managing administrators. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["team"], operation: ["create"] }
	 * @default []
	 */
	managers: string[];
	additionalFields?: Record<string, unknown>;
};

/** Delete an Onfleet admin */
export type OnfleetV1TeamDeleteConfig = {
	resource: 'team';
	operation: 'delete';
	/**
	 * The ID of the team object for lookup
	 * @displayOptions.show { resource: ["team"], operation: ["get", "update", "delete", "getTimeEstimates", "autoDispatch"] }
	 */
	id: string | Expression<string>;
};

/** Get container information */
export type OnfleetV1TeamGetConfig = {
	resource: 'team';
	operation: 'get';
	/**
	 * The ID of the team object for lookup
	 * @displayOptions.show { resource: ["team"], operation: ["get", "update", "delete", "getTimeEstimates", "autoDispatch"] }
	 */
	id: string | Expression<string>;
};

/** Get many Onfleet admins */
export type OnfleetV1TeamGetAllConfig = {
	resource: 'team';
	operation: 'getAll';
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["team"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["team"], operation: ["getAll"], returnAll: [false] }
	 * @default 64
	 */
	limit?: number | Expression<number>;
};

/** Get estimated times for upcoming tasks for a team, returns a selected driver */
export type OnfleetV1TeamGetTimeEstimatesConfig = {
	resource: 'team';
	operation: 'getTimeEstimates';
	/**
	 * The ID of the team object for lookup
	 * @displayOptions.show { resource: ["team"], operation: ["get", "update", "delete", "getTimeEstimates", "autoDispatch"] }
	 */
	id: string | Expression<string>;
	filters?: Record<string, unknown>;
};

/** Update an Onfleet admin */
export type OnfleetV1TeamUpdateConfig = {
	resource: 'team';
	operation: 'update';
	/**
	 * The ID of the team object for lookup
	 * @displayOptions.show { resource: ["team"], operation: ["get", "update", "delete", "getTimeEstimates", "autoDispatch"] }
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

/** Create a new Onfleet admin */
export type OnfleetV1WorkerCreateConfig = {
	resource: 'worker';
	operation: 'create';
	/**
	 * The worker's name
	 * @displayOptions.show { resource: ["worker"], operation: ["create"] }
	 */
	name: string | Expression<string>;
	/**
	 * A list of worker’s phone numbers
	 * @displayOptions.show { resource: ["worker"], operation: ["create"] }
	 */
	phone: string | Expression<string>;
	/**
	 * One or more teams of which the worker is a member. Choose from the list, or specify IDs using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;.
	 * @displayOptions.show { resource: ["worker"], operation: ["create"] }
	 * @default []
	 */
	teams: string[];
	additionalFields?: Record<string, unknown>;
};

/** Delete an Onfleet admin */
export type OnfleetV1WorkerDeleteConfig = {
	resource: 'worker';
	operation: 'delete';
	/**
	 * The ID of the worker object for lookup
	 * @displayOptions.show { resource: ["worker"], operation: ["get", "getSchedule", "setSchedule", "update", "delete"] }
	 */
	id: string | Expression<string>;
};

/** Get container information */
export type OnfleetV1WorkerGetConfig = {
	resource: 'worker';
	operation: 'get';
	/**
	 * The ID of the worker object for lookup
	 * @displayOptions.show { resource: ["worker"], operation: ["get", "getSchedule", "setSchedule", "update", "delete"] }
	 */
	id: string | Expression<string>;
	options?: Record<string, unknown>;
};

/** Get many Onfleet admins */
export type OnfleetV1WorkerGetAllConfig = {
	resource: 'worker';
	operation: 'getAll';
	/**
	 * Whether to search for only those workers who are currently within a certain target area
	 * @displayOptions.show { resource: ["worker"], operation: ["getAll"] }
	 * @default false
	 */
	byLocation: boolean | Expression<boolean>;
	/**
	 * The longitude component of the coordinate pair
	 * @displayOptions.show { resource: ["worker"], operation: ["getAll"], byLocation: [true] }
	 * @default 0
	 */
	longitude: number | Expression<number>;
	/**
	 * The latitude component of the coordinate pair
	 * @displayOptions.show { resource: ["worker"], operation: ["getAll"], byLocation: [true] }
	 * @default 0
	 */
	latitude: number | Expression<number>;
	/**
	 * Whether to return all results or only up to a given limit
	 * @displayOptions.show { resource: ["worker"], operation: ["getAll"] }
	 * @default false
	 */
	returnAll?: boolean | Expression<boolean>;
	/**
	 * Max number of results to return
	 * @displayOptions.show { resource: ["worker"], operation: ["getAll"], returnAll: [false] }
	 * @default 64
	 */
	limit?: number | Expression<number>;
	filters?: Record<string, unknown>;
	options?: Record<string, unknown>;
};

/** Get a specific Onfleet worker schedule */
export type OnfleetV1WorkerGetScheduleConfig = {
	resource: 'worker';
	operation: 'getSchedule';
	/**
	 * The ID of the worker object for lookup
	 * @displayOptions.show { resource: ["worker"], operation: ["get", "getSchedule", "setSchedule", "update", "delete"] }
	 */
	id: string | Expression<string>;
};

/** Update an Onfleet admin */
export type OnfleetV1WorkerUpdateConfig = {
	resource: 'worker';
	operation: 'update';
	/**
	 * The ID of the worker object for lookup
	 * @displayOptions.show { resource: ["worker"], operation: ["get", "getSchedule", "setSchedule", "update", "delete"] }
	 */
	id: string | Expression<string>;
	updateFields?: Record<string, unknown>;
};

export type OnfleetV1Params =
	| OnfleetV1AdminCreateConfig
	| OnfleetV1AdminDeleteConfig
	| OnfleetV1AdminGetAllConfig
	| OnfleetV1AdminUpdateConfig
	| OnfleetV1ContainerAddTaskConfig
	| OnfleetV1ContainerGetConfig
	| OnfleetV1ContainerUpdateTaskConfig
	| OnfleetV1DestinationCreateConfig
	| OnfleetV1DestinationGetConfig
	| OnfleetV1HubCreateConfig
	| OnfleetV1HubGetAllConfig
	| OnfleetV1HubUpdateConfig
	| OnfleetV1OrganizationGetConfig
	| OnfleetV1OrganizationGetDelegateeConfig
	| OnfleetV1RecipientCreateConfig
	| OnfleetV1RecipientGetConfig
	| OnfleetV1RecipientUpdateConfig
	| OnfleetV1TaskCloneConfig
	| OnfleetV1TaskCompleteConfig
	| OnfleetV1TaskCreateConfig
	| OnfleetV1TaskDeleteConfig
	| OnfleetV1TaskGetConfig
	| OnfleetV1TaskGetAllConfig
	| OnfleetV1TaskUpdateConfig
	| OnfleetV1TeamAutoDispatchConfig
	| OnfleetV1TeamCreateConfig
	| OnfleetV1TeamDeleteConfig
	| OnfleetV1TeamGetConfig
	| OnfleetV1TeamGetAllConfig
	| OnfleetV1TeamGetTimeEstimatesConfig
	| OnfleetV1TeamUpdateConfig
	| OnfleetV1WorkerCreateConfig
	| OnfleetV1WorkerDeleteConfig
	| OnfleetV1WorkerGetConfig
	| OnfleetV1WorkerGetAllConfig
	| OnfleetV1WorkerGetScheduleConfig
	| OnfleetV1WorkerUpdateConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface OnfleetV1Credentials {
	onfleetApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type OnfleetV1Node = {
	type: 'n8n-nodes-base.onfleet';
	version: 1;
	config: NodeConfig<OnfleetV1Params>;
	credentials?: OnfleetV1Credentials;
};

export type OnfleetNode = OnfleetV1Node;
