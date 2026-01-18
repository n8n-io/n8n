/**
 * Segment Node Types
 *
 * Consume Segment API
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/segment/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Group lets you associate an identified user with a group */
export type SegmentV1GroupAddConfig = {
	resource: 'group';
	operation: 'add';
	userId?: string | Expression<string>;
	/**
	 * A Group ID is the unique identifier which you recognize a group by in your own database
	 * @displayOptions.show { resource: ["group"], operation: ["add"] }
	 */
	groupId: string | Expression<string>;
	traits?: {
		traitsUi?: Array<{
			/** Key
			 */
			key?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
	context?: {
		contextUi?: {
			/** Whether a user is active
			 * @default false
			 */
			active?: boolean | Expression<boolean>;
			/** Current user’s IP address
			 */
			ip?: string | Expression<string>;
			/** Locale string for the current user, for example en-US
			 */
			locate?: string | Expression<string>;
			/** Dictionary of information about the current page in the browser, containing hash, path, referrer, search, title and URL
			 */
			page?: string | Expression<string>;
			/** Timezones are sent as tzdata strings to add user timezone information which might be stripped from the timestamp, for example America/New_York
			 */
			timezone?: string | Expression<string>;
			/** App
			 * @default {}
			 */
			app?: {
				appUi?: {
					/** Name
					 */
					name?: string | Expression<string>;
					/** Version
					 */
					version?: string | Expression<string>;
					/** Build
					 */
					build?: string | Expression<string>;
				};
			};
			/** Campaign
			 * @default {}
			 */
			campaign?: {
				campaignUi?: {
					/** Name
					 */
					name?: string | Expression<string>;
					/** Source
					 */
					source?: string | Expression<string>;
					/** Medium
					 */
					medium?: string | Expression<string>;
					/** Term
					 */
					term?: string | Expression<string>;
					/** Content
					 */
					content?: string | Expression<string>;
				};
			};
			/** Device
			 * @default {}
			 */
			device?: {
				deviceUi?: {
					/** ID
					 */
					id?: string | Expression<string>;
					/** Manufacturer
					 */
					manufacturer?: string | Expression<string>;
					/** Model
					 */
					model?: string | Expression<string>;
					/** Name
					 */
					name?: string | Expression<string>;
					/** Type
					 */
					type?: string | Expression<string>;
					/** Version
					 */
					version?: string | Expression<string>;
				};
			};
		};
	};
	integrations?: {
		integrationsUi?: {
			/** All
			 * @default true
			 */
			all?: boolean | Expression<boolean>;
			/** Salesforce
			 * @default false
			 */
			salesforce?: boolean | Expression<boolean>;
		};
	};
};

/** Identify lets you tie a user to their actions */
export type SegmentV1IdentifyCreateConfig = {
	resource: 'identify';
	operation: 'create';
	userId?: string | Expression<string>;
	traits?: {
		traitsUi?: Array<{
			/** Key
			 */
			key?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
	context?: {
		contextUi?: {
			/** Whether a user is active
			 * @default false
			 */
			active?: boolean | Expression<boolean>;
			/** Current user’s IP address
			 */
			ip?: string | Expression<string>;
			/** Locale string for the current user, for example en-US
			 */
			locate?: string | Expression<string>;
			/** Dictionary of information about the current page in the browser, containing hash, path, referrer, search, title and URL
			 */
			page?: string | Expression<string>;
			/** Timezones are sent as tzdata strings to add user timezone information which might be stripped from the timestamp, for example America/New_York
			 */
			timezone?: string | Expression<string>;
			/** App
			 * @default {}
			 */
			app?: {
				appUi?: {
					/** Name
					 */
					name?: string | Expression<string>;
					/** Version
					 */
					version?: string | Expression<string>;
					/** Build
					 */
					build?: string | Expression<string>;
				};
			};
			/** Campaign
			 * @default {}
			 */
			campaign?: {
				campaignUi?: {
					/** Name
					 */
					name?: string | Expression<string>;
					/** Source
					 */
					source?: string | Expression<string>;
					/** Medium
					 */
					medium?: string | Expression<string>;
					/** Term
					 */
					term?: string | Expression<string>;
					/** Content
					 */
					content?: string | Expression<string>;
				};
			};
			/** Device
			 * @default {}
			 */
			device?: {
				deviceUi?: {
					/** ID
					 */
					id?: string | Expression<string>;
					/** Manufacturer
					 */
					manufacturer?: string | Expression<string>;
					/** Model
					 */
					model?: string | Expression<string>;
					/** Name
					 */
					name?: string | Expression<string>;
					/** Type
					 */
					type?: string | Expression<string>;
					/** Version
					 */
					version?: string | Expression<string>;
				};
			};
		};
	};
	integrations?: {
		integrationsUi?: {
			/** All
			 * @default true
			 */
			all?: boolean | Expression<boolean>;
			/** Salesforce
			 * @default false
			 */
			salesforce?: boolean | Expression<boolean>;
		};
	};
};

/** Track lets you record events */
export type SegmentV1TrackEventConfig = {
	resource: 'track';
	operation: 'event';
	userId?: string | Expression<string>;
	/**
	 * Name of the action that a user has performed
	 * @displayOptions.show { resource: ["track"], operation: ["event"] }
	 */
	event: string | Expression<string>;
	context?: {
		contextUi?: {
			/** Whether a user is active
			 * @default false
			 */
			active?: boolean | Expression<boolean>;
			/** Current user’s IP address
			 */
			ip?: string | Expression<string>;
			/** Locale string for the current user, for example en-US
			 */
			locate?: string | Expression<string>;
			/** Dictionary of information about the current page in the browser, containing hash, path, referrer, search, title and URL
			 */
			page?: string | Expression<string>;
			/** Timezones are sent as tzdata strings to add user timezone information which might be stripped from the timestamp, for example America/New_York
			 */
			timezone?: string | Expression<string>;
			/** App
			 * @default {}
			 */
			app?: {
				appUi?: {
					/** Name
					 */
					name?: string | Expression<string>;
					/** Version
					 */
					version?: string | Expression<string>;
					/** Build
					 */
					build?: string | Expression<string>;
				};
			};
			/** Campaign
			 * @default {}
			 */
			campaign?: {
				campaignUi?: {
					/** Name
					 */
					name?: string | Expression<string>;
					/** Source
					 */
					source?: string | Expression<string>;
					/** Medium
					 */
					medium?: string | Expression<string>;
					/** Term
					 */
					term?: string | Expression<string>;
					/** Content
					 */
					content?: string | Expression<string>;
				};
			};
			/** Device
			 * @default {}
			 */
			device?: {
				deviceUi?: {
					/** ID
					 */
					id?: string | Expression<string>;
					/** Manufacturer
					 */
					manufacturer?: string | Expression<string>;
					/** Model
					 */
					model?: string | Expression<string>;
					/** Name
					 */
					name?: string | Expression<string>;
					/** Type
					 */
					type?: string | Expression<string>;
					/** Version
					 */
					version?: string | Expression<string>;
				};
			};
		};
	};
	integrations?: {
		integrationsUi?: {
			/** All
			 * @default true
			 */
			all?: boolean | Expression<boolean>;
			/** Salesforce
			 * @default false
			 */
			salesforce?: boolean | Expression<boolean>;
		};
	};
	properties?: {
		propertiesUi?: Array<{
			/** Key
			 */
			key?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
};

/** Track lets you record events */
export type SegmentV1TrackPageConfig = {
	resource: 'track';
	operation: 'page';
	userId?: string | Expression<string>;
	/**
	 * Name of the page For example, most sites have a “Signup” page that can be useful to tag, so you can see users as they move through your funnel
	 * @displayOptions.show { resource: ["track"], operation: ["page"] }
	 */
	name?: string | Expression<string>;
	context?: {
		contextUi?: {
			/** Whether a user is active
			 * @default false
			 */
			active?: boolean | Expression<boolean>;
			/** Current user’s IP address
			 */
			ip?: string | Expression<string>;
			/** Locale string for the current user, for example en-US
			 */
			locate?: string | Expression<string>;
			/** Dictionary of information about the current page in the browser, containing hash, path, referrer, search, title and URL
			 */
			page?: string | Expression<string>;
			/** Timezones are sent as tzdata strings to add user timezone information which might be stripped from the timestamp, for example America/New_York
			 */
			timezone?: string | Expression<string>;
			/** App
			 * @default {}
			 */
			app?: {
				appUi?: {
					/** Name
					 */
					name?: string | Expression<string>;
					/** Version
					 */
					version?: string | Expression<string>;
					/** Build
					 */
					build?: string | Expression<string>;
				};
			};
			/** Campaign
			 * @default {}
			 */
			campaign?: {
				campaignUi?: {
					/** Name
					 */
					name?: string | Expression<string>;
					/** Source
					 */
					source?: string | Expression<string>;
					/** Medium
					 */
					medium?: string | Expression<string>;
					/** Term
					 */
					term?: string | Expression<string>;
					/** Content
					 */
					content?: string | Expression<string>;
				};
			};
			/** Device
			 * @default {}
			 */
			device?: {
				deviceUi?: {
					/** ID
					 */
					id?: string | Expression<string>;
					/** Manufacturer
					 */
					manufacturer?: string | Expression<string>;
					/** Model
					 */
					model?: string | Expression<string>;
					/** Name
					 */
					name?: string | Expression<string>;
					/** Type
					 */
					type?: string | Expression<string>;
					/** Version
					 */
					version?: string | Expression<string>;
				};
			};
		};
	};
	integrations?: {
		integrationsUi?: {
			/** All
			 * @default true
			 */
			all?: boolean | Expression<boolean>;
			/** Salesforce
			 * @default false
			 */
			salesforce?: boolean | Expression<boolean>;
		};
	};
	properties?: {
		propertiesUi?: Array<{
			/** Key
			 */
			key?: string | Expression<string>;
			/** Value
			 */
			value?: string | Expression<string>;
		}>;
	};
};

export type SegmentV1Params =
	| SegmentV1GroupAddConfig
	| SegmentV1IdentifyCreateConfig
	| SegmentV1TrackEventConfig
	| SegmentV1TrackPageConfig;

// ===========================================================================
// Credentials
// ===========================================================================

export interface SegmentV1Credentials {
	segmentApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

export type SegmentV1Node = {
	type: 'n8n-nodes-base.segment';
	version: 1;
	config: NodeConfig<SegmentV1Params>;
	credentials?: SegmentV1Credentials;
};

export type SegmentNode = SegmentV1Node;
