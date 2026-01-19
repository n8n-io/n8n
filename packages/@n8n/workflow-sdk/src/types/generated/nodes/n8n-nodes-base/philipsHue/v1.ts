/**
 * Philips Hue Node - Version 1
 * Consume Philips Hue API
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

/** Delete a light */
export type PhilipsHueV1LightDeleteConfig = {
	resource: 'light';
	operation: 'delete';
	lightId: string | Expression<string>;
};

/** Retrieve a light */
export type PhilipsHueV1LightGetConfig = {
	resource: 'light';
	operation: 'get';
	lightId: string | Expression<string>;
};

/** Retrieve many lights */
export type PhilipsHueV1LightGetAllConfig = {
	resource: 'light';
	operation: 'getAll';
/**
 * Whether to return all results or only up to a given limit
 * @displayOptions.show { operation: ["getAll"], resource: ["light"] }
 * @default false
 */
		returnAll?: boolean | Expression<boolean>;
/**
 * Max number of results to return
 * @displayOptions.show { operation: ["getAll"], resource: ["light"], returnAll: [false] }
 * @default 100
 */
		limit?: number | Expression<number>;
};

/** Update a light */
export type PhilipsHueV1LightUpdateConfig = {
	resource: 'light';
	operation: 'update';
/**
 * Choose from the list, or specify an ID using an &lt;a href="https://docs.n8n.io/code/expressions/"&gt;expression&lt;/a&gt;
 * @displayOptions.show { operation: ["update"], resource: ["light"] }
 */
		lightId: string | Expression<string>;
/**
 * On/Off state of the light
 * @displayOptions.show { operation: ["update"], resource: ["light"] }
 * @default true
 */
		on: boolean | Expression<boolean>;
	additionalFields?: Record<string, unknown>;
};


// ===========================================================================
// Output Types
// ===========================================================================

export type PhilipsHueV1LightGetOutput = {
	capabilities?: {
		certified?: boolean;
		control?: {
			colorgamut?: Array<Array<number>>;
			colorgamuttype?: string;
			ct?: {
				max?: number;
				min?: number;
			};
			maxlumen?: number;
			mindimlevel?: number;
		};
		streaming?: {
			proxy?: boolean;
			renderer?: boolean;
		};
	};
	config?: {
		archetype?: string;
		direction?: string;
		'function'?: string;
		startup?: {
			configured?: boolean;
			mode?: string;
		};
	};
	manufacturername?: string;
	modelid?: string;
	name?: string;
	productid?: string;
	productname?: string;
	state?: {
		alert?: string;
		bri?: number;
		colormode?: string;
		ct?: number;
		effect?: string;
		hue?: number;
		mode?: string;
		on?: boolean;
		reachable?: boolean;
		sat?: number;
		xy?: Array<number>;
	};
	swconfigid?: string;
	swupdate?: {
		lastinstall?: string;
		state?: string;
	};
	swversion?: string;
	type?: string;
	uniqueid?: string;
};

export type PhilipsHueV1LightGetAllOutput = {
	capabilities?: {
		certified?: boolean;
		control?: {
			colorgamut?: Array<Array<number>>;
			colorgamuttype?: string;
			ct?: {
				max?: number;
				min?: number;
			};
			maxlumen?: number;
			mindimlevel?: number;
		};
		streaming?: {
			proxy?: boolean;
			renderer?: boolean;
		};
	};
	config?: {
		archetype?: string;
		direction?: string;
		'function'?: string;
		startup?: {
			configured?: boolean;
			mode?: string;
		};
	};
	manufacturername?: string;
	modelid?: string;
	name?: string;
	productid?: string;
	productname?: string;
	state?: {
		alert?: string;
		bri?: number;
		colormode?: string;
		ct?: number;
		effect?: string;
		hue?: number;
		mode?: string;
		on?: boolean;
		reachable?: boolean;
		sat?: number;
		xy?: Array<number>;
	};
	swconfigid?: string;
	swupdate?: {
		state?: string;
	};
	swversion?: string;
	type?: string;
	uniqueid?: string;
};

export type PhilipsHueV1LightUpdateOutput = {
	'/lights/3/state/on'?: boolean;
};

// ===========================================================================
// Credentials
// ===========================================================================

export interface PhilipsHueV1Credentials {
	philipsHueOAuth2Api: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface PhilipsHueV1NodeBase {
	type: 'n8n-nodes-base.philipsHue';
	version: 1;
	credentials?: PhilipsHueV1Credentials;
}

export type PhilipsHueV1LightDeleteNode = PhilipsHueV1NodeBase & {
	config: NodeConfig<PhilipsHueV1LightDeleteConfig>;
};

export type PhilipsHueV1LightGetNode = PhilipsHueV1NodeBase & {
	config: NodeConfig<PhilipsHueV1LightGetConfig>;
	output?: PhilipsHueV1LightGetOutput;
};

export type PhilipsHueV1LightGetAllNode = PhilipsHueV1NodeBase & {
	config: NodeConfig<PhilipsHueV1LightGetAllConfig>;
	output?: PhilipsHueV1LightGetAllOutput;
};

export type PhilipsHueV1LightUpdateNode = PhilipsHueV1NodeBase & {
	config: NodeConfig<PhilipsHueV1LightUpdateConfig>;
	output?: PhilipsHueV1LightUpdateOutput;
};

export type PhilipsHueV1Node =
	| PhilipsHueV1LightDeleteNode
	| PhilipsHueV1LightGetNode
	| PhilipsHueV1LightGetAllNode
	| PhilipsHueV1LightUpdateNode
	;