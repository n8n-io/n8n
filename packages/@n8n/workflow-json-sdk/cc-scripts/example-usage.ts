// Example usage of generated node types

import type {
	NodeType,
	NodeParameters,
	GetNodeParameters,
	NodeParametersMap,
	Slack_v2_3Parameters,
} from './generated-node-types';
import { NodeTypes, NodeDisplayNames } from './generated-node-types';

console.log('=== Node Types Usage Examples ===\n');

// Example 1: Using NodeTypes enum for type-safe strings
console.log('1. Type-safe node type strings:');
const actionNetworkType = NodeTypes.ActionNetwork; // "n8n-nodes-base.actionNetwork"
const googleSheetsType = NodeTypes.GoogleSheets_v4_7; // Latest version of GoogleSheets
console.log(`  ActionNetwork: ${actionNetworkType}`);
console.log(`  GoogleSheets (v4.7): ${googleSheetsType}\n`);

// Example 2: Get display names
console.log('2. Get display names:');
const displayName = NodeDisplayNames[googleSheetsType];
console.log(`  Display name for GoogleSheets: ${displayName}\n`);

// Example 3: Using specific parameter types directly
console.log('3. Using specific parameter types:');

// Direct import of specific parameter type
const slackParams: Slack_v2_3Parameters = {
	resource: 'message', // Autocomplete shows: 'channel' | 'file' | 'message' | 'reaction' | 'star' | 'user' | 'userGroup'
	operation: 'create', // Autocomplete shows: 'archive' | 'close' | 'create' | 'get' | 'getAll' | ...
	additionalFields: {
		channel: '#general',
		text: 'Hello from n8n!',
	},
};
console.log('  Slack params:', JSON.stringify(slackParams, null, 2));
console.log();

// Example 4: Using GetNodeParameters helper
console.log('4. Using GetNodeParameters helper:');

// Extract parameters for a specific node type
type GmailParams = GetNodeParameters<'n8n-nodes-base.gmail'>;
const gmailParams: GmailParams = {
	resource: 'message',
	operation: 'create', // Note: Gmail uses 'create' for sending messages
	subject: 'Hello!',
	message: 'This is a test email from n8n',
	additionalFields: {
		to: 'user@example.com',
	},
};
console.log('  Gmail params:', JSON.stringify(gmailParams, null, 2));
console.log();

// Example 5: Using NodeParametersMap directly
console.log('5. Using NodeParametersMap directly:');

// Access parameter types via the map
const googleSheetsParams: NodeParametersMap['n8n-nodes-base.googleSheets'] = {
	authentication: 'oAuth2',
	resource: 'sheet',
	operation: 'append',
	additionalFields: {
		range: 'A1:Z100',
	},
};
console.log('  Google Sheets params:', JSON.stringify(googleSheetsParams, null, 2));
console.log();

// Example 6: Type inference with generic functions
console.log('6. Type inference with generic functions:');

function executeNode<T extends NodeType>(nodeType: T, parameters: NodeParameters<T>): void {
	const name = NodeDisplayNames[nodeType];
	console.log(`  Executing ${name} with params:`, JSON.stringify(parameters, null, 2));
}

// Parameters are automatically typed based on nodeType!
executeNode('n8n-nodes-base.slack', {
	resource: 'message',
	operation: 'create',
});

executeNode('n8n-nodes-base.googleSheets', {
	resource: 'sheet',
	operation: 'read',
	returnAll: false,
	limit: 100,
});
console.log();

// Example 7: Runtime node type validation
console.log('7. Runtime node type validation:');

function isValidNodeType(str: string): str is NodeType {
	return str in NodeDisplayNames;
}

const userInput1 = 'n8n-nodes-base.slack';
const userInput2 = 'invalid-node-type';

console.log(`  Is "${userInput1}" valid? ${isValidNodeType(userInput1)}`);
console.log(`  Is "${userInput2}" valid? ${isValidNodeType(userInput2)}`);
console.log();

// Example 8: Extending specific parameter types
console.log('8. Extending specific parameter types:');

// Extend with custom properties
interface CustomSlackParams extends Slack_v2_3Parameters {
	customField?: string;
	metadata?: Record<string, unknown>;
}

const customSlackParams: CustomSlackParams = {
	resource: 'message',
	operation: 'create',
	customField: 'my-custom-value',
	metadata: {
		source: 'automation',
		priority: 'high',
	},
};
console.log('  Custom Slack params:', JSON.stringify(customSlackParams, null, 2));
console.log();

// Example 9: Working with node type constants
console.log('9. Working with node type constants:');
const allNodeTypes = Object.values(NodeTypes);
console.log(`  Total node constants: ${allNodeTypes.length}`);
console.log(`  First 5 nodes: ${allNodeTypes.slice(0, 5).join(', ')}`);

// Filter by pattern
const triggerNodes = allNodeTypes.filter((type) => type.includes('Trigger'));
console.log(`  Found ${triggerNodes.length} trigger nodes`);
console.log(`  Examples: ${triggerNodes.slice(0, 3).join(', ')}`);
console.log();

// Example 10: Type-safe node configuration builder
console.log('10. Type-safe node configuration builder:');

interface NodeConfig<T extends NodeType = NodeType> {
	type: T;
	displayName: string;
	parameters: NodeParameters<T>;
}

function createNodeConfig<T extends NodeType>(
	type: T,
	parameters: NodeParameters<T>,
): NodeConfig<T> {
	return {
		type,
		displayName: NodeDisplayNames[type],
		parameters,
	};
}

// Type-safe configuration with autocomplete
const actionNetworkConfig = createNodeConfig(NodeTypes.ActionNetwork, {
	resource: 'person', // Autocomplete works!
	operation: 'create',
	additionalFields: {
		email: 'user@example.com',
		given_name: 'John',
		family_name: 'Doe',
	},
});

console.log('  Action Network config:', JSON.stringify(actionNetworkConfig, null, 2));
console.log();

// Example 11: Conditional parameter types
console.log('11. Conditional parameter types based on node:');

function getNodeParams<T extends NodeType>(nodeType: T): NodeParameters<T> | undefined {
	// Return type is automatically narrowed based on nodeType
	if (nodeType === 'n8n-nodes-base.slack') {
		return {
			resource: 'message',
			operation: 'create',
		} as NodeParameters<T>;
	}
	return undefined;
}

const params = getNodeParams('n8n-nodes-base.slack');
if (params) {
	console.log('  Conditional params:', JSON.stringify(params, null, 2));
}
console.log();

// Example 12: Array of typed node configurations
console.log('12. Array of typed node configurations:');

const nodeConfigs: NodeConfig[] = [
	createNodeConfig(NodeTypes.Slack_v2_3, {
		resource: 'message',
		operation: 'create',
	}),
	createNodeConfig(NodeTypes.GoogleSheets_v4_7, {
		resource: 'sheet',
		operation: 'read',
		returnAll: false,
	}),
	createNodeConfig(NodeTypes.ActionNetwork, {
		resource: 'person',
		operation: 'getAll',
		returnAll: true,
	}),
];

console.log(`  Created ${nodeConfigs.length} node configurations`);
nodeConfigs.forEach((config) => {
	console.log(`    - ${config.displayName} (${config.type})`);
});

console.log('\n✅ All examples completed successfully!');
console.log('\n💡 Key takeaways:');
console.log('  - Import specific parameter types for best autocomplete');
console.log('  - Use GetNodeParameters<T> for dynamic type extraction');
console.log('  - Use NodeParametersMap for direct access');
console.log('  - Generic functions preserve parameter types');
console.log('  - All node parameters have full type safety!');
