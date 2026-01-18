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
	 */
	groupId: string | Expression<string>;
	traits?: {
		traitsUi?: Array<{ key?: string | Expression<string>; value?: string | Expression<string> }>;
	};
	context?: {
		contextUi?: {
			active?: boolean | Expression<boolean>;
			ip?: string | Expression<string>;
			locate?: string | Expression<string>;
			page?: string | Expression<string>;
			timezone?: string | Expression<string>;
			app?: {
				appUi?: {
					name?: string | Expression<string>;
					version?: string | Expression<string>;
					build?: string | Expression<string>;
				};
			};
			campaign?: {
				campaignUi?: {
					name?: string | Expression<string>;
					source?: string | Expression<string>;
					medium?: string | Expression<string>;
					term?: string | Expression<string>;
					content?: string | Expression<string>;
				};
			};
			device?: {
				deviceUi?: {
					id?: string | Expression<string>;
					manufacturer?: string | Expression<string>;
					model?: string | Expression<string>;
					name?: string | Expression<string>;
					type?: string | Expression<string>;
					version?: string | Expression<string>;
				};
			};
		};
	};
	integrations?: {
		integrationsUi?: {
			all?: boolean | Expression<boolean>;
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
		traitsUi?: Array<{ key?: string | Expression<string>; value?: string | Expression<string> }>;
	};
	context?: {
		contextUi?: {
			active?: boolean | Expression<boolean>;
			ip?: string | Expression<string>;
			locate?: string | Expression<string>;
			page?: string | Expression<string>;
			timezone?: string | Expression<string>;
			app?: {
				appUi?: {
					name?: string | Expression<string>;
					version?: string | Expression<string>;
					build?: string | Expression<string>;
				};
			};
			campaign?: {
				campaignUi?: {
					name?: string | Expression<string>;
					source?: string | Expression<string>;
					medium?: string | Expression<string>;
					term?: string | Expression<string>;
					content?: string | Expression<string>;
				};
			};
			device?: {
				deviceUi?: {
					id?: string | Expression<string>;
					manufacturer?: string | Expression<string>;
					model?: string | Expression<string>;
					name?: string | Expression<string>;
					type?: string | Expression<string>;
					version?: string | Expression<string>;
				};
			};
		};
	};
	integrations?: {
		integrationsUi?: {
			all?: boolean | Expression<boolean>;
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
	 */
	event: string | Expression<string>;
	context?: {
		contextUi?: {
			active?: boolean | Expression<boolean>;
			ip?: string | Expression<string>;
			locate?: string | Expression<string>;
			page?: string | Expression<string>;
			timezone?: string | Expression<string>;
			app?: {
				appUi?: {
					name?: string | Expression<string>;
					version?: string | Expression<string>;
					build?: string | Expression<string>;
				};
			};
			campaign?: {
				campaignUi?: {
					name?: string | Expression<string>;
					source?: string | Expression<string>;
					medium?: string | Expression<string>;
					term?: string | Expression<string>;
					content?: string | Expression<string>;
				};
			};
			device?: {
				deviceUi?: {
					id?: string | Expression<string>;
					manufacturer?: string | Expression<string>;
					model?: string | Expression<string>;
					name?: string | Expression<string>;
					type?: string | Expression<string>;
					version?: string | Expression<string>;
				};
			};
		};
	};
	integrations?: {
		integrationsUi?: {
			all?: boolean | Expression<boolean>;
			salesforce?: boolean | Expression<boolean>;
		};
	};
	properties?: {
		propertiesUi?: Array<{
			key?: string | Expression<string>;
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
	 */
	name?: string | Expression<string>;
	context?: {
		contextUi?: {
			active?: boolean | Expression<boolean>;
			ip?: string | Expression<string>;
			locate?: string | Expression<string>;
			page?: string | Expression<string>;
			timezone?: string | Expression<string>;
			app?: {
				appUi?: {
					name?: string | Expression<string>;
					version?: string | Expression<string>;
					build?: string | Expression<string>;
				};
			};
			campaign?: {
				campaignUi?: {
					name?: string | Expression<string>;
					source?: string | Expression<string>;
					medium?: string | Expression<string>;
					term?: string | Expression<string>;
					content?: string | Expression<string>;
				};
			};
			device?: {
				deviceUi?: {
					id?: string | Expression<string>;
					manufacturer?: string | Expression<string>;
					model?: string | Expression<string>;
					name?: string | Expression<string>;
					type?: string | Expression<string>;
					version?: string | Expression<string>;
				};
			};
		};
	};
	integrations?: {
		integrationsUi?: {
			all?: boolean | Expression<boolean>;
			salesforce?: boolean | Expression<boolean>;
		};
	};
	properties?: {
		propertiesUi?: Array<{
			key?: string | Expression<string>;
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
