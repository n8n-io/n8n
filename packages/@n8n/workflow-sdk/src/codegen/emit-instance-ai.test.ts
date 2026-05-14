import * as sdk from '../index';
import {
	emitInstanceAi,
	buildImports,
	hoistSharedCredentials,
	SDK_FUNCTIONS,
} from './emit-instance-ai';
import type { WorkflowJSON } from '../types/base';

describe('emit-instance-ai', () => {
	describe('emitInstanceAi', () => {
		it('emits a single SDK import line above the workflow body', () => {
			const wf: WorkflowJSON = {
				id: 'simple',
				name: 'Simple',
				nodes: [
					{
						id: '1',
						name: 'Manual',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			};

			const out = emitInstanceAi(wf);

			expect(out).toMatch(/^import \{[^}]*\} from '@n8n\/workflow-sdk';/);
			expect(out).toContain('workflow(');
			expect(out).toContain('trigger(');
		});

		it('hoists credentials shared across multiple nodes', () => {
			const wf: WorkflowJSON = {
				id: 'shared',
				name: 'Shared Credentials',
				nodes: [
					{
						id: 't',
						name: 'Manual',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'a',
						name: 'Slack A',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.2,
						position: [100, 0],
						parameters: { channel: '#a' },
						credentials: { slackApi: { id: 'cred-1', name: 'Team Slack' } },
					},
					{
						id: 'b',
						name: 'Slack B',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.2,
						position: [200, 0],
						parameters: { channel: '#b' },
						credentials: { slackApi: { id: 'cred-1', name: 'Team Slack' } },
					},
				],
				connections: {
					Manual: { main: [[{ node: 'Slack A', type: 'main', index: 0 }]] },
					'Slack A': { main: [[{ node: 'Slack B', type: 'main', index: 0 }]] },
				},
			};

			const out = emitInstanceAi(wf);

			// Top-level const declared once
			const declMatches = out.match(
				/const teamSlackCred = newCredential\('Team Slack', 'cred-1'\);/g,
			);
			expect(declMatches).not.toBeNull();
			expect(declMatches!.length).toBe(1);

			// No leftover inline newCredential('Team Slack', 'cred-1') calls in nodes
			const inlineMatches = out.match(/newCredential\('Team Slack', 'cred-1'\)/g) ?? [];
			expect(inlineMatches.length).toBe(1); // only the const declaration
			expect(out).toMatch(/slackApi: teamSlackCred\b/);
		});

		it('leaves single-use credentials inline', () => {
			const wf: WorkflowJSON = {
				id: 'single',
				name: 'Single Cred',
				nodes: [
					{
						id: 't',
						name: 'Manual',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 's',
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.2,
						position: [100, 0],
						parameters: {},
						credentials: { slackApi: { id: 'one-only', name: 'Solo' } },
					},
				],
				connections: { Manual: { main: [[{ node: 'Slack', type: 'main', index: 0 }]] } },
			};

			const out = emitInstanceAi(wf);

			expect(out).not.toMatch(/^const \w+Cred =/m);
			expect(out).toContain("newCredential('Solo', 'one-only')");
		});

		it('treats different credential ids of the same name as distinct', () => {
			const wf: WorkflowJSON = {
				id: 'distinct',
				name: 'Distinct',
				nodes: [
					{
						id: 't',
						name: 'Manual',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
					{
						id: 'a',
						name: 'Slack A',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.2,
						position: [100, 0],
						parameters: {},
						credentials: { slackApi: { id: 'one', name: 'Team' } },
					},
					{
						id: 'b',
						name: 'Slack B',
						type: 'n8n-nodes-base.slack',
						typeVersion: 2.2,
						position: [200, 0],
						parameters: {},
						credentials: { slackApi: { id: 'two', name: 'Team' } },
					},
				],
				connections: {
					Manual: { main: [[{ node: 'Slack A', type: 'main', index: 0 }]] },
					'Slack A': { main: [[{ node: 'Slack B', type: 'main', index: 0 }]] },
				},
			};

			const out = emitInstanceAi(wf);

			// Both occur once → no hoist
			expect(out).not.toMatch(/^const \w+Cred =/m);
			expect(out).toContain("newCredential('Team', 'one')");
			expect(out).toContain("newCredential('Team', 'two')");
		});

		it('prepends a JSDoc header when supplied', () => {
			const wf: WorkflowJSON = {
				id: 'h',
				name: 'Header',
				nodes: [
					{
						id: 't',
						name: 'Manual',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			};

			const header = '/**\n * @template\n * @name Header\n */';
			const out = emitInstanceAi(wf, { jsdocHeader: header });

			expect(out.startsWith(header)).toBe(true);
		});
	});

	describe('buildImports', () => {
		it('includes only functions actually used in the body', () => {
			const body = "const t = trigger({ ... }); const c = newCredential('A', '1');";
			expect(buildImports(body)).toBe(
				"import { trigger, newCredential } from '@n8n/workflow-sdk';",
			);
		});

		it('returns empty string when no SDK functions appear', () => {
			expect(buildImports('const x = 1;')).toBe('');
		});

		it('does not match identifier prefixes', () => {
			// `mynewCredential(` should not include `newCredential` in imports
			const body = 'const x = mynewCredential(); const y = trigger();';
			expect(buildImports(body)).toBe("import { trigger } from '@n8n/workflow-sdk';");
		});
	});

	describe('SDK_FUNCTIONS drift guard', () => {
		// Every function exported from `@n8n/workflow-sdk` falls into one of two buckets:
		//   - SDK_FUNCTIONS  → workflow-callable, must appear in generated import line
		//   - INTENTIONALLY_EXCLUDED → utility/codegen/validation/type guard, never appears
		//                              inside an emitted workflow body
		// When a new export is added, this test fails until it's categorised. That's the
		// signal to decide whether `emit-instance-ai` should know about it.
		const INTENTIONALLY_EXCLUDED = new Set<string>([
			// Classes
			'PluginRegistry',
			'ValidationError',
			'ValidationWarning',
			// Expression helpers (workflows use `expr()` only; the rest are parser internals)
			'createFromAIExpression',
			'isExpression',
			'nodeJson',
			'parseExpression',
			// Type guards (callable but never appear in workflow bodies)
			'isDataTableType',
			'isHttpRequestType',
			'isIfNodeType',
			'isMergeNodeType',
			'isNodeChain',
			'isNodeInstance',
			'isSplitInBatchesType',
			'isStickyNoteType',
			'isSwitchNodeType',
			'isWebhookType',
			// Codegen + parse round-trip
			'emitInstanceAi',
			'generateWorkflowCode',
			'parseWorkflowCode',
			'parseWorkflowCodeToBuilder',
			// Code-step helpers — appear as arguments to `.code()` callbacks, not as
			// standalone calls in the emitted body
			'runOnceForAllItems',
			'runOnceForEachItem',
			// Safe-access utilities (used inside .code() callbacks too)
			'getProperty',
			'hasProperty',
			'isPlainObject',
			// Validation
			'validateNodeConfig',
			'validateWorkflow',
			'setSchemaBaseDirs',
			// Pin-data + schema discovery
			'discoverOutputSchemaForNode',
			'discoverSchemasForNode',
			'findSchemaForOperation',
			'inferSchemasFromRunData',
			'needsPinData',
			'normalizePinData',
			// Display-options matching
			'matchesDisplayOptions',
			// Plugin registration
			'registerDefaultPlugins',
			// Generate-types module (build-time type generation, never appears in workflows)
			'buildDiscriminatorTree',
			'extractDiscriminatorCombinations',
			'extractOutputTypes',
			'filterPropertiesForVersion',
			'generateDiscriminatedUnion',
			'generateDiscriminatorSchemaFile',
			'generateIndexFile',
			'generateJsonSchemaFromData',
			'generateNodeJSDoc',
			'generateNodeTypeFile',
			'generatePropertyJSDoc',
			'generatePropertyLine',
			'generateResourceIndexSchemaFile',
			'generateSchemaIndexFile',
			'generateSchemaPropertyLine',
			'generateSingleVersionSchemaFile',
			'generateSingleVersionTypeFile',
			'generateSplitVersionIndexSchemaFile',
			'generateSubnodeUnionTypes',
			'generateSubnodesFile',
			'generateTypes',
			'generateVersionIndexFile',
			'getHighestVersion',
			'getPackageName',
			'getPropertiesForCombination',
			'getSubnodeOutputType',
			'groupNodesByOutputType',
			'groupVersionsByProperties',
			'hasDiscriminatorPattern',
			'jsonSchemaToTypeScript',
			'literalUnion',
			'loadNodeTypes',
			'mapPropertyToZodSchema',
			'mapPropertyType',
			'multiOptionsSchema',
			'nodeNameToFileName',
			'optionsWithExpression',
			'orchestrateGeneration',
			'planSplitVersionFiles',
			'planSplitVersionSchemaFiles',
			'propertyAppliesToVersion',
			'versionToFileName',
			'versionToTypeName',
		]);

		const sdkFunctionExports = new Set(
			Object.entries(sdk)
				.filter(([, v]) => typeof v === 'function')
				.map(([k]) => k),
		);

		it('categorises every SDK function export', () => {
			const categorised = new Set([...SDK_FUNCTIONS, ...INTENTIONALLY_EXCLUDED]);
			const uncategorised = [...sdkFunctionExports].filter((n) => !categorised.has(n)).sort();

			expect(uncategorised).toEqual([]);
		});

		it('has no stale entries in SDK_FUNCTIONS', () => {
			const stale = SDK_FUNCTIONS.filter((n) => !sdkFunctionExports.has(n)).sort();

			expect(stale).toEqual([]);
		});

		it('has no stale entries in INTENTIONALLY_EXCLUDED', () => {
			const stale = [...INTENTIONALLY_EXCLUDED].filter((n) => !sdkFunctionExports.has(n)).sort();

			expect(stale).toEqual([]);
		});

		it('does not double-list a function in both sets', () => {
			const overlap = SDK_FUNCTIONS.filter((n) => INTENTIONALLY_EXCLUDED.has(n)).sort();

			expect(overlap).toEqual([]);
		});
	});

	describe('hoistSharedCredentials', () => {
		it('is a no-op when there are no credentials', () => {
			const body = 'const x = node({ ... });';
			expect(hoistSharedCredentials(body)).toBe(body);
		});

		it('handles three or more shared occurrences', () => {
			const call = "newCredential('Triple', 't-1')";
			const body = `const a = node({ c: ${call} });\nconst b = node({ c: ${call} });\nconst c = node({ c: ${call} });`;

			const out = hoistSharedCredentials(body);

			expect(out).toMatch(/const tripleCred = newCredential\('Triple', 't-1'\);/);
			const callMatches = out.match(/newCredential\('Triple', 't-1'\)/g) ?? [];
			expect(callMatches.length).toBe(1); // only in const declaration
			const refMatches = out.match(/c: tripleCred\b/g) ?? [];
			expect(refMatches.length).toBe(3);
		});
	});
});
