/**
 * Schema Validation Integration Tests
 *
 * Tests the schema validation system end-to-end using real generated schemas.
 * Covers discriminated schemas (resource/operation, mode) and non-discriminated schemas
 * with all displayOptions combinations.
 */

import { validateNodeConfig, loadSchema } from '../validation/schema-validator';
import { validateWorkflow } from '../validation';
import { parseWorkflowCode } from '../parse-workflow-code';

describe('Schema Validation Integration', () => {
	describe('Resource/Operation Discriminated (MS Teams v2 - task/create)', () => {
		// Schema: ~/.n8n/generated-types/nodes/n8n-nodes-base/microsoftTeams/v2/resource_task/operation_create.schema.ts
		// Required fields: groupId, planId, bucketId (resourceLocator type), title (no displayOptions)
		// Optional field: options (no displayOptions)

		it('returns no warning when all required fields are provided', () => {
			const result = validateNodeConfig('n8n-nodes-base.microsoftTeams', 2, {
				parameters: {
					resource: 'task',
					operation: 'create',
					// resourceLocator fields require object format with __rl, mode, value
					groupId: { __rl: true, mode: 'id', value: 'group-123' },
					planId: { __rl: true, mode: 'id', value: 'plan-456' },
					bucketId: { __rl: true, mode: 'id', value: 'bucket-789' },
					title: 'My Task',
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('returns warning when required title field is missing', () => {
			const result = validateNodeConfig('n8n-nodes-base.microsoftTeams', 2, {
				parameters: {
					resource: 'task',
					operation: 'create',
					groupId: { __rl: true, mode: 'id', value: 'group-123' },
					planId: { __rl: true, mode: 'id', value: 'plan-456' },
					bucketId: { __rl: true, mode: 'id', value: 'bucket-789' },
					// title is missing
				},
			});
			// For discriminated unions, Zod reports union mismatch errors
			// The validation fails because the task/create schema requires title
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('accepts expression in groupId field', () => {
			const result = validateNodeConfig('n8n-nodes-base.microsoftTeams', 2, {
				parameters: {
					resource: 'task',
					operation: 'create',
					groupId: '={{ $json.groupId }}',
					planId: { __rl: true, mode: 'id', value: 'plan-456' },
					bucketId: { __rl: true, mode: 'id', value: 'bucket-789' },
					title: 'My Task',
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('accepts optional options field', () => {
			const result = validateNodeConfig('n8n-nodes-base.microsoftTeams', 2, {
				parameters: {
					resource: 'task',
					operation: 'create',
					groupId: { __rl: true, mode: 'id', value: 'group-123' },
					planId: { __rl: true, mode: 'id', value: 'plan-456' },
					bucketId: { __rl: true, mode: 'id', value: 'bucket-789' },
					title: 'My Task',
					options: {
						// assignedTo is a resourceLocator field, use proper format
						assignedTo: { __rl: true, mode: 'id', value: 'user@example.com' },
						percentComplete: 50,
					},
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});
	});

	describe('Mode Discriminated (Set v3 - manual)', () => {
		// Schema: ~/.n8n/generated-types/nodes/n8n-nodes-base/set/v3/mode_manual.schema.ts
		// duplicateItem: optional, no displayOptions
		// duplicateCount: optional, show: { duplicateItem: [true] }

		it('validates when duplicateItem is true and duplicateCount is provided', () => {
			const result = validateNodeConfig('n8n-nodes-base.set', 3, {
				parameters: {
					mode: 'manual',
					duplicateItem: true,
					duplicateCount: 5,
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('accepts any duplicateCount value when duplicateItem is false (field hidden)', () => {
			const result = validateNodeConfig('n8n-nodes-base.set', 3, {
				parameters: {
					mode: 'manual',
					duplicateItem: false,
					// duplicateCount is hidden when duplicateItem is false
					// Any value (or missing) should be accepted
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('returns warning when duplicateItem has invalid type', () => {
			const result = validateNodeConfig('n8n-nodes-base.set', 3, {
				parameters: {
					mode: 'manual',
					duplicateItem: 'not-a-boolean', // Should be boolean
				},
			});
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.path.includes('duplicateItem'))).toBe(true);
		});
	});

	describe('Webhook v1 (Factory with show/hide)', () => {
		// Schema: ~/.n8n/generated-types/nodes/n8n-nodes-base/webhook/v1.schema.ts
		// responseData: optional, show: { responseMode: ['lastNode'] } - only visible when responseMode is 'lastNode'
		// responseCode: optional, show: { @version: [1, 1.1] }, hide: { responseMode: ['responseNode'] }
		// responseBinaryPropertyName: required, show: { responseData: ['firstEntryBinary'] }

		it('returns warning when required responseBinaryPropertyName is missing but show condition is met', () => {
			const result = validateNodeConfig('n8n-nodes-base.webhook', 1, {
				parameters: {
					responseMode: 'lastNode', // Required to make responseData visible
					responseData: 'firstEntryBinary',
					// responseBinaryPropertyName is required when responseData is 'firstEntryBinary'
					// but it's missing
				},
			});
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.path.includes('responseBinaryPropertyName'))).toBe(true);
		});

		it('does not require responseBinaryPropertyName when show condition is not met', () => {
			const result = validateNodeConfig('n8n-nodes-base.webhook', 1, {
				parameters: {
					responseMode: 'lastNode', // Required to make responseData visible
					responseData: 'allEntries', // Not 'firstEntryBinary'
					// responseBinaryPropertyName is not required (field hidden)
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('accepts responseBinaryPropertyName when condition is met', () => {
			const result = validateNodeConfig('n8n-nodes-base.webhook', 1, {
				parameters: {
					responseMode: 'lastNode', // Required to make responseData visible
					responseData: 'firstEntryBinary',
					responseBinaryPropertyName: 'data',
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('hides responseCode when responseMode is responseNode', () => {
			const result = validateNodeConfig('n8n-nodes-base.webhook', 1, {
				parameters: {
					responseMode: 'responseNode',
					// responseCode is hidden when responseMode is 'responseNode'
					// Any value should be accepted because field is not validated
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('validates responseCode when show conditions are met', () => {
			const result = validateNodeConfig('n8n-nodes-base.webhook', 1, {
				parameters: {
					'@version': 1,
					responseMode: 'onReceived', // Not 'responseNode' so hide condition doesn't apply
					responseCode: 200,
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});
	});

	describe('Twitter v2 (Required + hide)', () => {
		// Schema: ~/.n8n/generated-types/nodes/n8n-nodes-base/twitter/v2/resource_user/operation_search_user.schema.ts
		// user: required, hide: { me: [true] }

		it('returns warning when required user is missing and hide condition is NOT met', () => {
			const result = validateNodeConfig('n8n-nodes-base.twitter', 2, {
				parameters: {
					resource: 'user',
					operation: 'searchUser',
					me: false,
					// user is required when me is false, but it's missing
				},
			});
			// For discriminated unions, Zod reports union mismatch errors
			// The validation fails because the user/searchUser schema requires user when me is false
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('does not require user when hide condition IS met (me is true)', () => {
			const result = validateNodeConfig('n8n-nodes-base.twitter', 2, {
				parameters: {
					resource: 'user',
					operation: 'searchUser',
					me: true,
					// user is hidden when me is true, so not required
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('validates when user is provided with valid resource locator', () => {
			const result = validateNodeConfig('n8n-nodes-base.twitter', 2, {
				parameters: {
					resource: 'user',
					operation: 'searchUser',
					me: false,
					user: {
						__rl: true,
						mode: 'id',
						value: '12345',
					},
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});
	});

	describe('Non-Discriminated Static (ChargebeeTrigger v1)', () => {
		// Schema: ~/.n8n/generated-types/nodes/n8n-nodes-base/chargebeeTrigger/v1.schema.ts
		// events: required array (no displayOptions, static schema)

		it('validates when events array is provided', () => {
			const result = validateNodeConfig('n8n-nodes-base.chargebeeTrigger', 1, {
				parameters: {
					events: ['card_added', 'card_deleted'],
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('returns warning when events is a string instead of array', () => {
			const result = validateNodeConfig('n8n-nodes-base.chargebeeTrigger', 1, {
				parameters: {
					events: 'card_added', // Should be an array
				},
			});
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.path.includes('events'))).toBe(true);
		});

		it('validates with all valid event types', () => {
			const result = validateNodeConfig('n8n-nodes-base.chargebeeTrigger', 1, {
				parameters: {
					events: ['subscription_created', 'payment_succeeded', 'invoice_generated'],
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});
	});

	describe('Expression Validation', () => {
		it('accepts expression in resourceLocator fields', () => {
			// resourceLocator fields accept either expressions OR proper object format
			const result = validateNodeConfig('n8n-nodes-base.microsoftTeams', 2, {
				parameters: {
					resource: 'task',
					operation: 'create',
					groupId: '={{ $json.groupId }}',
					planId: '={{ $json.planId }}',
					bucketId: '={{ $json.bucketId }}',
					title: '={{ $json.title }}',
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('accepts expression in number fields', () => {
			const result = validateNodeConfig('n8n-nodes-base.set', 3, {
				parameters: {
					mode: 'manual',
					duplicateItem: true,
					duplicateCount: '={{ $json.count }}', // Expression instead of number
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('accepts expression in boolean fields', () => {
			const result = validateNodeConfig('n8n-nodes-base.set', 3, {
				parameters: {
					mode: 'manual',
					duplicateItem: '={{ $json.shouldDuplicate }}', // Expression instead of boolean
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});
	});

	describe('Schema Loading', () => {
		it('loads discriminated schema for MS Teams v2 task/create', () => {
			const schema = loadSchema('n8n-nodes-base.microsoftTeams', 2);
			expect(schema).not.toBeNull();
			expect(typeof schema).toBe('function'); // Factory function for discriminated schemas
		});

		it('loads discriminated schema for Set v3 manual mode', () => {
			const schema = loadSchema('n8n-nodes-base.set', 3);
			expect(schema).not.toBeNull();
			expect(typeof schema).toBe('function'); // Factory function for mode-discriminated schemas
		});

		it('loads factory schema for Webhook v1', () => {
			const schema = loadSchema('n8n-nodes-base.webhook', 1);
			expect(schema).not.toBeNull();
			expect(typeof schema).toBe('function'); // Factory function
		});

		it('loads discriminated schema for Twitter v2 user/searchUser', () => {
			const schema = loadSchema('n8n-nodes-base.twitter', 2);
			expect(schema).not.toBeNull();
			expect(typeof schema).toBe('function'); // Factory function for discriminated schemas
		});

		it('loads static schema for ChargebeeTrigger v1', () => {
			const schema = loadSchema('n8n-nodes-base.chargebeeTrigger', 1);
			expect(schema).not.toBeNull();
			// Static schemas are ZodSchema objects with safeParse method
			expect(typeof schema).toBe('object');
		});
	});

	describe('parseWorkflowCode + validateWorkflow End-to-End', () => {
		it('parses valid workflow and validates with no warnings', () => {
			// Code format matches what generateWorkflowCode produces
			const code = `
const manual_Trigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Manual Trigger' }
});
const set_Data = node({
  type: 'n8n-nodes-base.set',
  version: 3,
  config: {
    name: 'Set Data',
    parameters: {
      mode: 'manual',
      duplicateItem: true,
      duplicateCount: 3,
    }
  }
});

return workflow('test-id', 'Test Workflow')
  .add(manual_Trigger)
  .then(set_Data)
`;
			const json = parseWorkflowCode(code);
			const result = validateWorkflow(json);

			// Should have no INVALID_PARAMETER warnings from schema validation
			const schemaWarnings = result.warnings.filter((w) => w.code === 'INVALID_PARAMETER');
			expect(schemaWarnings).toEqual([]);
		});

		it('parses workflow with invalid parameter type and returns warning', () => {
			const code = `
const manual_Trigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Manual Trigger' }
});
const set_Data = node({
  type: 'n8n-nodes-base.set',
  version: 3,
  config: {
    name: 'Set Data',
    parameters: {
      mode: 'manual',
      duplicateItem: 'not-a-boolean',
    }
  }
});

return workflow('test-id', 'Test Workflow')
  .add(manual_Trigger)
  .then(set_Data)
`;
			const json = parseWorkflowCode(code);
			const result = validateWorkflow(json);

			// Should have INVALID_PARAMETER warning from schema validation
			const schemaWarnings = result.warnings.filter((w) => w.code === 'INVALID_PARAMETER');
			expect(schemaWarnings.length).toBeGreaterThan(0);
			expect(schemaWarnings.some((w) => w.message.includes('duplicateItem'))).toBe(true);
		});

		it('validates workflow with expressions correctly', () => {
			const code = `
const manual_Trigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Manual Trigger' }
});
const set_Data = node({
  type: 'n8n-nodes-base.set',
  version: 3,
  config: {
    name: 'Set Data',
    parameters: {
      mode: 'manual',
      duplicateItem: '={{ $json.shouldDuplicate }}',
      duplicateCount: '={{ $json.count }}',
    }
  }
});

return workflow('test-id', 'Test Workflow')
  .add(manual_Trigger)
  .then(set_Data)
`;
			const json = parseWorkflowCode(code);
			const result = validateWorkflow(json);

			// Expressions should be accepted - no INVALID_PARAMETER warnings
			const schemaWarnings = result.warnings.filter((w) => w.code === 'INVALID_PARAMETER');
			expect(schemaWarnings).toEqual([]);
		});
	});

	describe('Edge Cases', () => {
		it('handles missing parameters object gracefully', () => {
			const result = validateNodeConfig('n8n-nodes-base.set', 3, {});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('handles empty parameters object (returns validation error for discriminated schema)', () => {
			// For Set v3, the mode discriminator is required
			// Empty parameters means the mode is missing, which fails discriminator matching
			const result = validateNodeConfig('n8n-nodes-base.set', 3, {
				parameters: {},
			});
			// Empty parameters fail because mode discriminator is required
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('handles unknown node type gracefully (no schema)', () => {
			const result = validateNodeConfig('non-existent.node', 1, {
				parameters: { any: 'value' },
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('handles both show and hide conditions simultaneously', () => {
			// Webhook responseCode has both show (@version) and hide (responseMode)
			const result = validateNodeConfig('n8n-nodes-base.webhook', 1, {
				parameters: {
					'@version': 1, // show condition met
					responseMode: 'onReceived', // hide condition NOT met
					responseCode: 'invalid-type', // Should be number, but field is optional
				},
			});
			// responseCode is optional and non-numeric value should fail validation
			// when field is visible (show met, hide not met)
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.path.includes('responseCode'))).toBe(true);
		});
	});
});
