import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
	getNodeTypes,
	isValidPathComponent,
	validatePathWithinBase,
} from '../../node-catalog/get-node-types';

describe('getNodeTypes', () => {
	describe('basic invocation', () => {
		it('should not throw when no nodeDefinitionDirs are provided', () => {
			// This test verifies that the function can be called without errors
			// when no custom nodeDefinitionDirs is provided.
			expect(() => getNodeTypes(['n8n-nodes-base.nonExistentNode'])).not.toThrow();
		});

		it('should accept custom nodeDefinitionDirs without throwing', () => {
			expect(() =>
				getNodeTypes(['n8n-nodes-base.nonExistentNode'], { nodeDefinitionDirs: ['/tmp/test'] }),
			).not.toThrow();
		});

		it('should invoke without package.json resolution errors', () => {
			// This test verifies that invoking does not throw the error:
			// "Package subpath './package.json' is not defined by 'exports'"
			// The function should handle the fallback path resolution gracefully.

			// Invoke with a non-existent node - we expect an error message in the response,
			// but NOT a thrown exception related to package.json resolution.
			const result = getNodeTypes(['n8n-nodes-base.nonExistentNode']);

			// The result should be a string (error message about node not found)
			// NOT a thrown error about package.json exports
			expect(typeof result).toBe('string');
			expect(result).toContain('not found');
		});

		it('should provide helpful error when generated types directory does not exist', () => {
			// When a non-existent nodeDefinitionDirs is provided, the error message
			// should indicate that the types need to be generated.
			const result = getNodeTypes(['n8n-nodes-base.httpRequest'], {
				nodeDefinitionDirs: ['/non-existent-path-that-does-not-exist-12345'],
			});

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

		it('should read flat version file for nodes without discriminators', () => {
			const result = getNodeTypes(['n8n-nodes-base.aggregate'], { nodeDefinitionDirs: [tempDir] });

			expect(result).toContain('AggregateV1Config');
			expect(result).toContain('fieldName');
		});

		it('should read specific operation file when resource and operation provided', () => {
			const result = getNodeTypes(
				[
					{
						nodeId: 'n8n-nodes-base.freshservice',
						resource: 'ticket',
						operation: 'get',
					},
				],
				{ nodeDefinitionDirs: [tempDir] },
			);

			expect(result).toContain('FreshserviceV1TicketGetConfig');
			expect(result).toContain('ticketId');
		});

		it('should read specific mode file when mode provided', () => {
			const result = getNodeTypes(
				[
					{
						nodeId: 'n8n-nodes-base.code',
						mode: 'runOnceForAllItems',
					},
				],
				{ nodeDefinitionDirs: [tempDir] },
			);

			expect(result).toContain('CodeV2RunOnceForAllItemsConfig');
			expect(result).toContain('jsCode');
		});

		it('should return error when split node is requested without discriminators', () => {
			const result = getNodeTypes(['n8n-nodes-base.freshservice'], {
				nodeDefinitionDirs: [tempDir],
			});

			// Should return an error indicating discriminators are required
			expect(result).toContain('Error');
			expect(result.toLowerCase()).toMatch(/resource|discriminator|operation/);
		});

		it('should return error when invalid discriminator value is provided', () => {
			const result = getNodeTypes(
				[
					{
						nodeId: 'n8n-nodes-base.freshservice',
						resource: 'invalid_resource',
						operation: 'get',
					},
				],
				{ nodeDefinitionDirs: [tempDir] },
			);

			// Should indicate the resource is not valid
			expect(result).toContain('Error');
			expect(result.toLowerCase()).toMatch(/invalid|not found|does not exist/);
		});

		it('should accept string nodeId for backwards compatibility', () => {
			// String nodeId should work for flat files
			const result = getNodeTypes(['n8n-nodes-base.aggregate'], { nodeDefinitionDirs: [tempDir] });

			expect(result).toContain('AggregateV1Config');
		});

		it('should handle mixed array of string and object nodeIds', () => {
			const result = getNodeTypes(
				[
					'n8n-nodes-base.aggregate',
					{
						nodeId: 'n8n-nodes-base.code',
						mode: 'runOnceForEachItem',
					},
				],
				{ nodeDefinitionDirs: [tempDir] },
			);

			// Should have both results
			expect(result).toContain('AggregateV1Config');
			expect(result).toContain('CodeV2RunOnceForEachItemConfig');
		});

		it('should prefer split structure over flat file when discriminators are provided', () => {
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

			const result = getNodeTypes(
				[
					{
						nodeId: 'n8n-nodes-base.openai',
						resource: 'video',
						operation: 'generate',
					},
				],
				{ nodeDefinitionDirs: [tempDir] },
			);

			// Should use the split file (69 lines with splitFileMarker), NOT the flat file (928 lines with flatFileMarker)
			expect(result).toContain('splitFileMarker');
			expect(result).not.toContain('flatFileMarker');
			expect(result).toContain('OpenAIV21VideoGenerateConfig');
		});
	});

	describe('multi-dir resolution', () => {
		let builtinDir: string;
		let communityDir: string;

		beforeAll(() => {
			// Create two separate temp directories to simulate built-in and community dirs
			builtinDir = fs.mkdtempSync(path.join(os.tmpdir(), 'builtin-nodes-test-'));
			communityDir = fs.mkdtempSync(path.join(os.tmpdir(), 'community-nodes-test-'));

			// Put nodeA (aggregate) in builtinDir only
			const builtinNodeDir = path.join(builtinDir, 'nodes/n8n-nodes-base/aggregate');
			fs.mkdirSync(builtinNodeDir, { recursive: true });
			fs.writeFileSync(
				path.join(builtinNodeDir, 'v1.ts'),
				'export type AggregateV1Config = { source: "builtin" };',
			);
			fs.writeFileSync(path.join(builtinNodeDir, 'index.ts'), "export * from './v1';");

			// Put nodeB (customNode) in communityDir only
			const communityNodeDir = path.join(communityDir, 'nodes/n8n-nodes-community/customNode');
			fs.mkdirSync(communityNodeDir, { recursive: true });
			fs.writeFileSync(
				path.join(communityNodeDir, 'v1.ts'),
				'export type CustomNodeV1Config = { source: "community" };',
			);
			fs.writeFileSync(path.join(communityNodeDir, 'index.ts'), "export * from './v1';");

			// Put aggregate in communityDir too (to test priority)
			const communityOverrideDir = path.join(communityDir, 'nodes/n8n-nodes-base/aggregate');
			fs.mkdirSync(communityOverrideDir, { recursive: true });
			fs.writeFileSync(
				path.join(communityOverrideDir, 'v1.ts'),
				'export type AggregateV1Config = { source: "community-override" };',
			);
			fs.writeFileSync(path.join(communityOverrideDir, 'index.ts'), "export * from './v1';");
		});

		afterAll(() => {
			fs.rmSync(builtinDir, { recursive: true, force: true });
			fs.rmSync(communityDir, { recursive: true, force: true });
		});

		it('should resolve node from built-in dir when it exists there', () => {
			const result = getNodeTypes(['n8n-nodes-base.aggregate'], {
				nodeDefinitionDirs: [builtinDir, communityDir],
			});

			// Should find it in builtinDir (first dir searched)
			expect(result).toContain('source: "builtin"');
			expect(result).not.toContain('community-override');
		});

		it('should resolve node from community dir when not in built-in', () => {
			const result = getNodeTypes(['n8n-nodes-community.customNode'], {
				nodeDefinitionDirs: [builtinDir, communityDir],
			});

			// Should find it in communityDir (second dir searched)
			expect(result).toContain('source: "community"');
		});

		it('should return error when node not found in any dir', () => {
			const result = getNodeTypes(['n8n-nodes-base.nonExistent'], {
				nodeDefinitionDirs: [builtinDir, communityDir],
			});

			expect(result).toContain('not found');
		});
	});

	describe('tool variant fallback', () => {
		let tempDir: string;

		beforeAll(() => {
			tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-variant-test-'));

			// Base node with flat version (e.g. emailSend)
			const emailSendDir = path.join(tempDir, 'nodes/n8n-nodes-base/emailSend');
			fs.mkdirSync(emailSendDir, { recursive: true });
			fs.writeFileSync(
				path.join(emailSendDir, 'v21.ts'),
				'export type EmailSendV21Config = { to: string; subject: string };',
			);
			fs.writeFileSync(path.join(emailSendDir, 'index.ts'), "export * from './v21';");

			// Base node with split structure (e.g. slack)
			const slackV24Dir = path.join(tempDir, 'nodes/n8n-nodes-base/slack/v24');
			fs.mkdirSync(slackV24Dir, { recursive: true });
			const slackMessageDir = path.join(slackV24Dir, 'resource_message');
			fs.mkdirSync(slackMessageDir, { recursive: true });
			fs.writeFileSync(
				path.join(slackMessageDir, 'operation_post.ts'),
				"export type SlackV24MessagePostConfig = { resource: 'message'; operation: 'post'; channel: string };",
			);
			fs.writeFileSync(
				path.join(tempDir, 'nodes/n8n-nodes-base/slack/index.ts'),
				"export * from './v24';",
			);

			// Langchain-style base node (e.g. chat)
			const chatDir = path.join(tempDir, 'nodes/n8n-nodes-langchain/chat');
			fs.mkdirSync(chatDir, { recursive: true });
			fs.writeFileSync(
				path.join(chatDir, 'v13.ts'),
				'export type ChatV13Config = { mode: string };',
			);
			fs.writeFileSync(path.join(chatDir, 'index.ts'), "export * from './v13';");
		});

		afterAll(() => {
			fs.rmSync(tempDir, { recursive: true, force: true });
		});

		it('should resolve a HitlTool variant to its base node (flat structure)', () => {
			const result = getNodeTypes(['n8n-nodes-base.emailSendHitlTool'], {
				nodeDefinitionDirs: [tempDir],
			});

			expect(result).toContain('EmailSendV21Config');
			expect(result).not.toContain('not found');
		});

		it('should resolve a HitlTool variant to its base node for langchain packages', () => {
			const result = getNodeTypes(['@n8n/n8n-nodes-langchain.chatHitlTool'], {
				nodeDefinitionDirs: [tempDir],
			});

			expect(result).toContain('ChatV13Config');
			expect(result).not.toContain('not found');
		});

		it('should resolve a HitlTool variant to a split-structure base node when discriminators are provided', () => {
			const result = getNodeTypes(
				[
					{
						nodeId: 'n8n-nodes-base.slackHitlTool',
						resource: 'message',
						operation: 'post',
					},
				],
				{ nodeDefinitionDirs: [tempDir] },
			);

			expect(result).toContain('SlackV24MessagePostConfig');
			expect(result).not.toContain('not found');
		});

		it.each([
			['n8n-nodes-base.unknownThingHitlTool', 'n8n-nodes-base.unknownThing'],
			['n8n-nodes-base.unknownThingTool', 'n8n-nodes-base.unknownThing'],
		])('should report the original node ID in the error: %s', (nodeId, strippedName) => {
			const result = getNodeTypes([nodeId], { nodeDefinitionDirs: [tempDir] });

			expect(result).toContain(`'${nodeId}'`);
			expect(result).not.toContain(`'${strippedName}'`);
		});
	});

	describe('path traversal security', () => {
		describe('isValidPathComponent', () => {
			it('should accept valid alphanumeric components', () => {
				expect(isValidPathComponent('httpRequest')).toBe(true);
				expect(isValidPathComponent('n8n-nodes-base')).toBe(true);
				expect(isValidPathComponent('googleCalendar')).toBe(true);
				expect(isValidPathComponent('v1')).toBe(true);
				expect(isValidPathComponent('run_once_for_all_items')).toBe(true);
			});

			it('should reject path traversal sequences', () => {
				expect(isValidPathComponent('..')).toBe(false);
				expect(isValidPathComponent('../')).toBe(false);
				expect(isValidPathComponent('..\\foo')).toBe(false);
				expect(isValidPathComponent('foo/../bar')).toBe(false);
				expect(isValidPathComponent('foo/../../etc/passwd')).toBe(false);
			});

			it('should reject absolute paths', () => {
				expect(isValidPathComponent('/etc/passwd')).toBe(false);
				expect(isValidPathComponent('/foo')).toBe(false);
			});

			it('should reject path separator injection', () => {
				expect(isValidPathComponent('foo/bar')).toBe(false);
				expect(isValidPathComponent('foo\\bar')).toBe(false);
			});

			it('should reject empty or whitespace-only values', () => {
				expect(isValidPathComponent('')).toBe(false);
				expect(isValidPathComponent('   ')).toBe(false);
			});

			it('should reject null bytes', () => {
				expect(isValidPathComponent('foo\0bar')).toBe(false);
			});
		});

		describe('validatePathWithinBase', () => {
			const baseDir = '/tmp/n8n-node-definitions/nodes';

			it('should allow paths within base directory', () => {
				const validPath = path.join(baseDir, 'n8n-nodes-base', 'httpRequest', 'v1.ts');
				expect(validatePathWithinBase(validPath, baseDir)).toBe(true);
			});

			it('should allow nested paths within base directory', () => {
				const validPath = path.join(
					baseDir,
					'n8n-nodes-base',
					'freshservice',
					'v1',
					'resource_ticket',
					'operation_get.ts',
				);
				expect(validatePathWithinBase(validPath, baseDir)).toBe(true);
			});

			it('should reject paths outside base directory via traversal', () => {
				const maliciousPath = path.resolve(baseDir, '..', '..', 'etc', 'passwd');
				expect(validatePathWithinBase(maliciousPath, baseDir)).toBe(false);
			});

			it('should reject paths that are parents of base directory', () => {
				const parentPath = path.resolve(baseDir, '..');
				expect(validatePathWithinBase(parentPath, baseDir)).toBe(false);
			});

			it('should handle symbolic path tricks', () => {
				// Even if someone tries baseDir + /../../foo, resolve should catch it
				const trickyPath = path.join(baseDir, 'package', '..', '..', '..', 'etc', 'passwd');
				expect(validatePathWithinBase(path.resolve(trickyPath), baseDir)).toBe(false);
			});
		});

		describe('tool invocation with malicious inputs', () => {
			let tempDir: string;

			beforeAll(() => {
				tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'path-traversal-test-'));

				// Create a node with resource/operation split structure for testing
				const splitResourceNodeDir = path.join(
					tempDir,
					'nodes/n8n-nodes-base/splitResourceNode/v1',
				);
				fs.mkdirSync(splitResourceNodeDir, { recursive: true });
				fs.writeFileSync(
					path.join(splitResourceNodeDir, '_shared.ts'),
					'export interface SharedBase { type: string; }',
				);
				// Create a valid resource directory so the structure is recognized
				const ticketDir = path.join(splitResourceNodeDir, 'resource_ticket');
				fs.mkdirSync(ticketDir, { recursive: true });
				fs.writeFileSync(
					path.join(ticketDir, 'operation_get.ts'),
					'export type Config = { valid: true };',
				);

				// Create a node with mode split structure for testing
				const splitModeNodeDir = path.join(tempDir, 'nodes/n8n-nodes-base/splitModeNode/v1');
				fs.mkdirSync(splitModeNodeDir, { recursive: true });
				fs.writeFileSync(
					path.join(splitModeNodeDir, '_shared.ts'),
					'export interface SharedBase { type: string; }',
				);
				// Create a valid mode file so the structure is recognized
				fs.writeFileSync(
					path.join(splitModeNodeDir, 'mode_run_once.ts'),
					'export type Config = { valid: true };',
				);
			});

			afterAll(() => {
				fs.rmSync(tempDir, { recursive: true, force: true });
			});

			it('should reject nodeId with path traversal', () => {
				const result = getNodeTypes(['n8n-nodes-base.../../../etc/passwd'], {
					nodeDefinitionDirs: [tempDir],
				});

				expect(result).toContain('Error');
				expect(result).not.toContain('root:');
			});

			it('should reject resource discriminator with path traversal', () => {
				const result = getNodeTypes(
					[
						{
							nodeId: 'n8n-nodes-base.splitResourceNode',
							resource: '../../../etc/passwd',
							operation: 'get',
						},
					],
					{ nodeDefinitionDirs: [tempDir] },
				);

				expect(result).toContain('Error');
				expect(result).not.toContain('root:');
			});

			it('should reject mode discriminator with path traversal', () => {
				const result = getNodeTypes(
					[
						{
							nodeId: 'n8n-nodes-base.splitModeNode',
							mode: '../../etc/passwd',
						},
					],
					{ nodeDefinitionDirs: [tempDir] },
				);

				expect(result).toContain('Error');
				expect(result).not.toContain('root:');
			});
		});
	});
});
