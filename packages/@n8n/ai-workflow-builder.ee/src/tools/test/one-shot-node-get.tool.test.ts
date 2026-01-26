import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createOneShotNodeGetTool } from '../one-shot-node-get.tool';

describe('OneShotNodeGetTool', () => {
	describe('createOneShotNodeGetTool', () => {
		it('should create tool without throwing when generatedTypesDir is not provided', () => {
			// This test verifies that the tool can be created without errors
			// when no custom generatedTypesDir is provided.
			expect(() => createOneShotNodeGetTool()).not.toThrow();
		});

		it('should create tool with custom generatedTypesDir', () => {
			expect(() => createOneShotNodeGetTool({ generatedTypesDir: '/tmp/test' })).not.toThrow();
		});

		it('should return a tool with correct name', () => {
			const tool = createOneShotNodeGetTool();
			expect(tool.name).toBe('get_nodes');
		});
	});

	describe('tool invocation', () => {
		it('should invoke without package.json resolution errors', async () => {
			// This test verifies that invoking the tool doesn't throw the error:
			// "Package subpath './package.json' is not defined by 'exports'"
			// The tool should handle the fallback path resolution gracefully.
			const tool = createOneShotNodeGetTool();

			// Invoke with a non-existent node - we expect an error message in the response,
			// but NOT a thrown exception related to package.json resolution.
			const result = await tool.invoke({ nodeIds: ['n8n-nodes-base.nonExistentNode'] });

			// The result should be a string (error message about node not found)
			// NOT a thrown error about package.json exports
			expect(typeof result).toBe('string');
			expect(result).toContain('not found');
		});

		it('should provide helpful error when generated types directory does not exist', async () => {
			// When a non-existent generatedTypesDir is provided, the error message
			// should indicate that the types need to be generated.
			const tool = createOneShotNodeGetTool({
				generatedTypesDir: '/non-existent-path-that-does-not-exist-12345',
			});

			// Request a valid node that should exist if types were generated
			const result = await tool.invoke({ nodeIds: ['n8n-nodes-base.httpRequest'] });

			// Should return a helpful error message about types not being generated
			expect(typeof result).toBe('string');
			expect(result).toContain('not found');
		});
	});

	describe('discriminator support', () => {
		let tempDir: string;

		beforeAll(() => {
			// Create a temporary directory structure for testing
			tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'get-nodes-test-'));

			// Create flat version file structure (for nodes without discriminators)
			const flatNodeDir = path.join(tempDir, 'nodes/n8n-nodes-base/aggregate');
			fs.mkdirSync(flatNodeDir, { recursive: true });
			fs.writeFileSync(
				path.join(flatNodeDir, 'v1.ts'),
				'export type AggregateV1Config = { fieldName: string };',
			);
			fs.writeFileSync(path.join(flatNodeDir, 'index.ts'), "export * from './v1';");

			// Create split version directory structure (for nodes with resource/operation)
			const splitNodeDir = path.join(tempDir, 'nodes/n8n-nodes-base/freshservice/v1');
			fs.mkdirSync(splitNodeDir, { recursive: true });
			fs.writeFileSync(
				path.join(splitNodeDir, '_shared.ts'),
				'export interface FreshserviceV1NodeBase { type: string; }',
			);
			fs.writeFileSync(path.join(splitNodeDir, 'index.ts'), "export * from './_shared';");

			// Create resource directory
			const ticketDir = path.join(splitNodeDir, 'resource_ticket');
			fs.mkdirSync(ticketDir, { recursive: true });
			fs.writeFileSync(
				path.join(ticketDir, 'operation_get.ts'),
				"export type FreshserviceV1TicketGetConfig = { resource: 'ticket'; operation: 'get'; ticketId: string };",
			);
			fs.writeFileSync(
				path.join(ticketDir, 'operation_create.ts'),
				"export type FreshserviceV1TicketCreateConfig = { resource: 'ticket'; operation: 'create'; subject: string };",
			);
			fs.writeFileSync(path.join(ticketDir, 'index.ts'), "export * from './operation_get';");

			// Create mode-based split structure (for Code node)
			const codeNodeDir = path.join(tempDir, 'nodes/n8n-nodes-base/code/v2');
			fs.mkdirSync(codeNodeDir, { recursive: true });
			fs.writeFileSync(
				path.join(codeNodeDir, '_shared.ts'),
				'export interface CodeV2NodeBase { type: string; }',
			);
			fs.writeFileSync(
				path.join(codeNodeDir, 'mode_run_once_for_all_items.ts'),
				"export type CodeV2RunOnceForAllItemsConfig = { mode: 'runOnceForAllItems'; jsCode: string };",
			);
			fs.writeFileSync(
				path.join(codeNodeDir, 'mode_run_once_for_each_item.ts'),
				"export type CodeV2RunOnceForEachItemConfig = { mode: 'runOnceForEachItem'; jsCode: string };",
			);
			fs.writeFileSync(path.join(codeNodeDir, 'index.ts'), "export * from './_shared';");

			// Create node-level index for freshservice
			const freshserviceNodeDir = path.join(tempDir, 'nodes/n8n-nodes-base/freshservice');
			fs.writeFileSync(path.join(freshserviceNodeDir, 'index.ts'), "export * from './v1';");

			// Create node-level index for code
			const codeBaseDir = path.join(tempDir, 'nodes/n8n-nodes-base/code');
			fs.writeFileSync(path.join(codeBaseDir, 'index.ts'), "export * from './v2';");
		});

		afterAll(() => {
			// Clean up temp directory
			fs.rmSync(tempDir, { recursive: true, force: true });
		});

		it('should read flat version file for nodes without discriminators', async () => {
			const tool = createOneShotNodeGetTool({ generatedTypesDir: tempDir });

			const result = await tool.invoke({
				nodeIds: ['n8n-nodes-base.aggregate'],
			});

			expect(result).toContain('AggregateV1Config');
			expect(result).toContain('fieldName');
		});

		it('should read specific operation file when resource and operation provided', async () => {
			const tool = createOneShotNodeGetTool({ generatedTypesDir: tempDir });

			const result = await tool.invoke({
				nodeIds: [
					{
						nodeId: 'n8n-nodes-base.freshservice',
						resource: 'ticket',
						operation: 'get',
					},
				],
			});

			expect(result).toContain('FreshserviceV1TicketGetConfig');
			expect(result).toContain('ticketId');
		});

		it('should read specific mode file when mode provided', async () => {
			const tool = createOneShotNodeGetTool({ generatedTypesDir: tempDir });

			const result = await tool.invoke({
				nodeIds: [
					{
						nodeId: 'n8n-nodes-base.code',
						mode: 'runOnceForAllItems',
					},
				],
			});

			expect(result).toContain('CodeV2RunOnceForAllItemsConfig');
			expect(result).toContain('jsCode');
		});

		it('should return error when split node is requested without discriminators', async () => {
			const tool = createOneShotNodeGetTool({ generatedTypesDir: tempDir });

			const result = await tool.invoke({
				nodeIds: ['n8n-nodes-base.freshservice'],
			});

			// Should return an error indicating discriminators are required
			expect(result).toContain('Error');
			expect(result.toLowerCase()).toMatch(/resource|discriminator|operation/);
		});

		it('should return error when invalid discriminator value is provided', async () => {
			const tool = createOneShotNodeGetTool({ generatedTypesDir: tempDir });

			const result = await tool.invoke({
				nodeIds: [
					{
						nodeId: 'n8n-nodes-base.freshservice',
						resource: 'invalid_resource',
						operation: 'get',
					},
				],
			});

			// Should indicate the resource is not valid
			expect(result).toContain('Error');
			expect(result.toLowerCase()).toMatch(/invalid|not found|does not exist/);
		});

		it('should accept string nodeId for backwards compatibility', async () => {
			const tool = createOneShotNodeGetTool({ generatedTypesDir: tempDir });

			// String nodeId should work for flat files
			const result = await tool.invoke({
				nodeIds: ['n8n-nodes-base.aggregate'],
			});

			expect(result).toContain('AggregateV1Config');
		});

		it('should handle mixed array of string and object nodeIds', async () => {
			const tool = createOneShotNodeGetTool({ generatedTypesDir: tempDir });

			const result = await tool.invoke({
				nodeIds: [
					'n8n-nodes-base.aggregate',
					{
						nodeId: 'n8n-nodes-base.code',
						mode: 'runOnceForEachItem',
					},
				],
			});

			// Should have both results
			expect(result).toContain('AggregateV1Config');
			expect(result).toContain('CodeV2RunOnceForEachItemConfig');
		});

		it('should prefer split structure over flat file when discriminators are provided', async () => {
			// This test creates a node that has BOTH a flat file (v21.ts) AND a split directory (v21/)
			// When discriminators are provided, it should use the split structure, not the flat file
			const openaiDir = path.join(tempDir, 'nodes/n8n-nodes-base/openai');
			fs.mkdirSync(openaiDir, { recursive: true });

			// Create flat file (v21.ts) - large file like the real OpenAI node
			fs.writeFileSync(
				path.join(openaiDir, 'v21.ts'),
				'export type OpenAIV21FlatConfig = { type: "n8n-nodes-base.openai"; /* This is the FLAT file with 928 lines */ flatFileMarker: true };',
			);

			// Create split directory (v21/) with resource/operation structure
			const v21Dir = path.join(openaiDir, 'v21');
			fs.mkdirSync(v21Dir, { recursive: true });
			fs.writeFileSync(
				path.join(v21Dir, '_shared.ts'),
				'export interface OpenAIV21Base { type: string; }',
			);

			const videoDir = path.join(v21Dir, 'resource_video');
			fs.mkdirSync(videoDir, { recursive: true });
			fs.writeFileSync(
				path.join(videoDir, 'operation_generate.ts'),
				'export type OpenAIV21VideoGenerateConfig = { resource: "video"; operation: "generate"; splitFileMarker: true };',
			);

			fs.writeFileSync(path.join(openaiDir, 'index.ts'), "export * from './v21';");

			const tool = createOneShotNodeGetTool({ generatedTypesDir: tempDir });

			const result = await tool.invoke({
				nodeIds: [
					{
						nodeId: 'n8n-nodes-base.openai',
						resource: 'video',
						operation: 'generate',
					},
				],
			});

			// Should use the split file (69 lines with splitFileMarker), NOT the flat file (928 lines with flatFileMarker)
			expect(result).toContain('splitFileMarker');
			expect(result).not.toContain('flatFileMarker');
			expect(result).toContain('OpenAIV21VideoGenerateConfig');
		});
	});
});
