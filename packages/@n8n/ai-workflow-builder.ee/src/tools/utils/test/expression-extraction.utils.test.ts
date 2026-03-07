import type { IConnections, INodeParameters } from 'n8n-workflow';

import { createNode } from '../../../../test/test-utils';
import type { WorkflowMetadata } from '../../../types/tools';
import type { SimpleWorkflow } from '../../../types/workflow';
import type { FetchWorkflowsResult } from '../../web/templates';
import * as templates from '../../web/templates';
import {
	extractExpressionsFromParameters,
	extractFieldPaths,
	getDirectChildren,
	extractExpressionExamplesForNode,
	collectExpressionExamplesFromTemplates,
	formatExpressionExamples,
	fetchAndFormatExpressionExamples,
} from '../expression-extraction.utils';

jest.mock('../../web/templates');

describe('expression-extraction.utils', () => {
	describe('extractExpressionsFromParameters', () => {
		it('should extract expression from a simple string value', () => {
			const parameters: INodeParameters = {
				url: '={{ $json.data.url }}',
				method: 'GET',
			};

			const result = extractExpressionsFromParameters(parameters);

			expect(result).toEqual([{ parameterPath: 'url', expression: '={{ $json.data.url }}' }]);
		});

		it('should extract expressions from nested objects', () => {
			const parameters: INodeParameters = {
				options: {
					headers: {
						auth: '={{ $json.token }}',
					},
				},
			};

			const result = extractExpressionsFromParameters(parameters);

			expect(result).toEqual([
				{ parameterPath: 'options.headers.auth', expression: '={{ $json.token }}' },
			]);
		});

		it('should extract expressions from arrays', () => {
			const parameters: INodeParameters = {
				values: [
					{ field: 'name', value: '={{ $json.name }}' },
					{ field: 'id', value: '={{ $json.id }}' },
				],
			};

			const result = extractExpressionsFromParameters(parameters);

			expect(result).toEqual([
				{ parameterPath: 'values.0.value', expression: '={{ $json.name }}' },
				{ parameterPath: 'values.1.value', expression: '={{ $json.id }}' },
			]);
		});

		it('should ignore non-expression string values', () => {
			const parameters: INodeParameters = {
				url: 'https://example.com',
				method: 'POST',
				body: '={{ $json.data }}',
			};

			const result = extractExpressionsFromParameters(parameters);

			expect(result).toEqual([{ parameterPath: 'body', expression: '={{ $json.data }}' }]);
		});

		it('should return empty array for parameters with no expressions', () => {
			const parameters: INodeParameters = {
				url: 'https://example.com',
				method: 'GET',
			};

			const result = extractExpressionsFromParameters(parameters);

			expect(result).toEqual([]);
		});
	});

	describe('extractFieldPaths', () => {
		// -- $json dot notation --
		it('should extract a single field from $json.field', () => {
			expect(extractFieldPaths('={{ $json.field }}')).toEqual(['field']);
		});

		it('should extract nested dotted path from $json.field.nested.deep', () => {
			expect(extractFieldPaths('={{ $json.field.nested.deep }}')).toEqual(['field.nested.deep']);
		});

		// -- $json bracket notation --
		it('should extract field from $json["bracket_field"]', () => {
			expect(extractFieldPaths('={{ $json["bracket_field"] }}')).toEqual(['bracket_field']);
		});

		// -- multiple $json in one expression --
		it('should extract multiple $json fields from one expression', () => {
			const paths = extractFieldPaths('={{ $json.first_name + " " + $json.last_name }}');
			expect(paths).toContain('first_name');
			expect(paths).toContain('last_name');
			expect(paths).toHaveLength(2);
		});

		// -- $input patterns --
		it('should extract from $input.first().json.field', () => {
			expect(extractFieldPaths('={{ $input.first().json.field }}')).toEqual(['field']);
		});

		it('should extract from $input.last().json.field', () => {
			expect(extractFieldPaths('={{ $input.last().json.field }}')).toEqual(['field']);
		});

		it('should extract from $input.all().json.field', () => {
			expect(extractFieldPaths('={{ $input.all().json.field }}')).toEqual(['field']);
		});

		it('should extract from $input.all()[0].json.field (indexed)', () => {
			expect(extractFieldPaths('={{ $input.all()[0].json.field }}')).toEqual(['field']);
		});

		it('should extract from $input.item.json.field', () => {
			expect(extractFieldPaths('={{ $input.item.json.field }}')).toEqual(['field']);
		});

		it('should extract deeply nested path from $input.item.json.deeply.nested', () => {
			expect(extractFieldPaths('={{ $input.item.json.deeply.nested }}')).toEqual(['deeply.nested']);
		});

		// -- $('Name') patterns --
		it("should extract from $('Node').first().json.field (single quotes)", () => {
			expect(extractFieldPaths("={{ $('Node').first().json.field }}")).toEqual(['field']);
		});

		it('should extract from $("Node").first().json.field (double quotes)', () => {
			expect(extractFieldPaths('={{ $("Node").first().json.field }}')).toEqual(['field']);
		});

		it("should extract from $('Node').last().json.field", () => {
			expect(extractFieldPaths("={{ $('Node').last().json.field }}")).toEqual(['field']);
		});

		it("should extract from $('Node').all()[2].json.field (indexed)", () => {
			expect(extractFieldPaths("={{ $('Node').all()[2].json.field }}")).toEqual(['field']);
		});

		it("should extract from $('Node').item.json.field", () => {
			expect(extractFieldPaths("={{ $('Node').item.json.field }}")).toEqual(['field']);
		});

		it("should extract deep path from $('Node').item.json.a.b.c", () => {
			expect(extractFieldPaths("={{ $('Node').item.json.a.b.c }}")).toEqual(['a.b.c']);
		});

		// -- $binary --
		it('should extract $binary.data as binary:data', () => {
			expect(extractFieldPaths('={{ $binary.data }}')).toEqual(['binary:data']);
		});

		it('should extract $binary.attachment_0 as binary:attachment_0', () => {
			expect(extractFieldPaths('={{ $binary.attachment_0 }}')).toEqual(['binary:attachment_0']);
		});

		// -- method-call stripping --
		it('should strip method calls like .includes() from field paths', () => {
			expect(extractFieldPaths('={{ $json.items.includes("foo") }}')).toEqual(['items']);
		});

		it('should skip entirely when the whole path is a method call like $json.toString()', () => {
			expect(extractFieldPaths('={{ $json.toString() }}')).toEqual([]);
		});

		it('should strip .map() from field paths', () => {
			expect(extractFieldPaths('={{ $json.arr.map(x => x) }}')).toEqual(['arr']);
		});

		// -- edge cases --
		it('should return empty array for expressions without recognizable patterns', () => {
			expect(extractFieldPaths('={{ 1 + 2 }}')).toEqual([]);
			expect(extractFieldPaths('={{ Date.now() }}')).toEqual([]);
		});

		it('should return empty array for empty string', () => {
			expect(extractFieldPaths('')).toEqual([]);
		});

		// -- mixed patterns in one expression --
		it('should extract from mixed $json and named ref in one expression', () => {
			const paths = extractFieldPaths("={{ $json.x + $('Node').item.json.y }}");
			expect(paths).toContain('x');
			expect(paths).toContain('y');
			expect(paths).toHaveLength(2);
		});

		// -- deduplication --
		it('should deduplicate same path accessed via different patterns', () => {
			const paths = extractFieldPaths("={{ $json.field + $('Node').item.json.field }}");
			expect(paths).toEqual(['field']);
		});
	});

	describe('getDirectChildren', () => {
		it('should return direct children from connections', () => {
			const connections: IConnections = {
				'HTTP Request': {
					main: [[{ node: 'IF', type: 'main', index: 0 }]],
				},
			};

			expect(getDirectChildren(connections, 'HTTP Request')).toEqual(['IF']);
		});

		it('should return multiple children across outputs', () => {
			const connections: IConnections = {
				IF: {
					main: [
						[{ node: 'True Branch', type: 'main', index: 0 }],
						[{ node: 'False Branch', type: 'main', index: 0 }],
					],
				},
			};

			const children = getDirectChildren(connections, 'IF');
			expect(children).toContain('True Branch');
			expect(children).toContain('False Branch');
		});

		it('should return empty array when no connections exist', () => {
			const connections: IConnections = {};
			expect(getDirectChildren(connections, 'NonExistent')).toEqual([]);
		});

		it('should handle null entries in connection arrays', () => {
			const connections: IConnections = {
				Node: {
					main: [null, [{ node: 'Child', type: 'main', index: 0 }]],
				},
			};

			expect(getDirectChildren(connections, 'Node')).toEqual(['Child']);
		});
	});

	describe('extractExpressionExamplesForNode', () => {
		it('should extract direct $json expressions from immediate children', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					createNode({ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
					createNode({
						name: 'Set',
						type: 'n8n-nodes-base.set',
						parameters: {
							value: '={{ $json.data.id }}',
						},
					}),
				],
				connections: {
					'HTTP Request': { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			};

			const examples = extractExpressionExamplesForNode(workflow, 'HTTP Request');

			expect(examples).toHaveLength(1);
			expect(examples[0]).toMatchObject({
				fieldPath: 'data.id',
				referenceType: 'direct',
				consumerNodeType: 'n8n-nodes-base.set',
			});
		});

		it('should extract named references from any node in the workflow', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					createNode({ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
					createNode({ name: 'IF', type: 'n8n-nodes-base.if' }),
					createNode({
						name: 'Set',
						type: 'n8n-nodes-base.set',
						parameters: {
							value: "={{ $('HTTP Request').first().json.body }}",
						},
					}),
				],
				connections: {
					'HTTP Request': { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
					IF: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			};

			const examples = extractExpressionExamplesForNode(workflow, 'HTTP Request');

			expect(examples).toHaveLength(1);
			expect(examples[0]).toMatchObject({
				fieldPath: 'body',
				referenceType: 'named',
				consumerNodeType: 'n8n-nodes-base.set',
			});
		});

		it('should not capture $json expressions from non-child nodes as direct references', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					createNode({ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
					createNode({ name: 'IF', type: 'n8n-nodes-base.if' }),
					createNode({
						name: 'Set',
						type: 'n8n-nodes-base.set',
						parameters: {
							value: '={{ $json.data }}',
						},
					}),
				],
				connections: {
					'HTTP Request': { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
					IF: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
				},
			};

			const examples = extractExpressionExamplesForNode(workflow, 'HTTP Request');

			// Set is not a direct child of HTTP Request, so $json.data should not be captured
			expect(examples).toHaveLength(0);
		});

		it('should deduplicate by fieldPath', () => {
			const workflow: SimpleWorkflow = {
				name: 'Test',
				nodes: [
					createNode({ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
					createNode({
						name: 'Set1',
						type: 'n8n-nodes-base.set',
						parameters: { value: '={{ $json.data }}' },
					}),
					createNode({
						name: 'Set2',
						type: 'n8n-nodes-base.set',
						parameters: { value: '={{ $json.data }}' },
					}),
				],
				connections: {
					'HTTP Request': {
						main: [
							[
								{ node: 'Set1', type: 'main', index: 0 },
								{ node: 'Set2', type: 'main', index: 0 },
							],
						],
					},
				},
			};

			const examples = extractExpressionExamplesForNode(workflow, 'HTTP Request');

			// Should be deduplicated to just one entry for fieldPath 'data'
			expect(examples).toHaveLength(1);
		});
	});

	describe('collectExpressionExamplesFromTemplates', () => {
		it('should collect examples from multiple templates', () => {
			const templates: WorkflowMetadata[] = [
				{
					templateId: 1,
					name: 'Template 1',
					workflow: {
						name: 'Template 1',
						nodes: [
							createNode({ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
							createNode({
								name: 'Set',
								type: 'n8n-nodes-base.set',
								parameters: { value: '={{ $json.data }}' },
							}),
						],
						connections: {
							'HTTP Request': { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
						},
					},
				},
				{
					templateId: 2,
					name: 'Template 2',
					workflow: {
						name: 'Template 2',
						nodes: [
							createNode({ name: 'Fetch API', type: 'n8n-nodes-base.httpRequest' }),
							createNode({
								name: 'IF',
								type: 'n8n-nodes-base.if',
								parameters: { condition: '={{ $json.body.status }}' },
							}),
						],
						connections: {
							'Fetch API': { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
						},
					},
				},
			];

			const examples = collectExpressionExamplesFromTemplates(
				templates,
				'n8n-nodes-base.httpRequest',
			);

			expect(examples.length).toBeGreaterThanOrEqual(2);
			const fieldPaths = examples.map((e) => e.fieldPath);
			expect(fieldPaths).toContain('data');
			expect(fieldPaths).toContain('body.status');
		});

		it('should deduplicate the same field path across templates', () => {
			const templates: WorkflowMetadata[] = [
				{
					templateId: 1,
					name: 'Template 1',
					workflow: {
						name: 'Template 1',
						nodes: [
							createNode({ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
							createNode({
								name: 'Set',
								type: 'n8n-nodes-base.set',
								parameters: { value: '={{ $json.data }}' },
							}),
						],
						connections: {
							'HTTP Request': { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
						},
					},
				},
				{
					templateId: 2,
					name: 'Template 2',
					workflow: {
						name: 'Template 2',
						nodes: [
							createNode({ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
							createNode({
								name: 'Code',
								type: 'n8n-nodes-base.code',
								parameters: { value: '={{ $json.data }}' },
							}),
						],
						connections: {
							'HTTP Request': { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
						},
					},
				},
			];

			const examples = collectExpressionExamplesFromTemplates(
				templates,
				'n8n-nodes-base.httpRequest',
			);

			// Should be deduplicated: same fieldPath "data"
			const dataExamples = examples.filter((e) => e.fieldPath === 'data');
			expect(dataExamples).toHaveLength(1);
		});

		it('should return empty array when no templates contain the node type', () => {
			const templates: WorkflowMetadata[] = [
				{
					templateId: 1,
					name: 'Template 1',
					workflow: {
						name: 'Template 1',
						nodes: [createNode({ name: 'Code', type: 'n8n-nodes-base.code' })],
						connections: {},
					},
				},
			];

			const examples = collectExpressionExamplesFromTemplates(
				templates,
				'n8n-nodes-base.httpRequest',
			);

			expect(examples).toEqual([]);
		});
	});

	describe('formatExpressionExamples', () => {
		it('should format examples as plain field paths', () => {
			const result = formatExpressionExamples('n8n-nodes-base.httpRequest', [
				{
					expression: '={{ $json.data }}',
					fieldPath: 'data',
					parameterPath: 'value',
					consumerNodeType: 'n8n-nodes-base.set',
					referenceType: 'direct',
				},
			]);

			expect(result).toContain('n8n-nodes-base.httpRequest');
			expect(result).toContain('- data');
			expect(result).not.toContain('$json');
		});

		it('should format named references as plain field paths', () => {
			const result = formatExpressionExamples('n8n-nodes-base.httpRequest', [
				{
					expression: "={{ $('HTTP Request').first().json.body }}",
					fieldPath: 'body',
					parameterPath: 'value',
					consumerNodeType: 'n8n-nodes-base.code',
					referenceType: 'named',
				},
			]);

			expect(result).toContain('- body');
			expect(result).not.toContain("$('HTTP Request')");
		});

		it('should return empty string when examples array is empty', () => {
			const result = formatExpressionExamples('n8n-nodes-base.httpRequest', []);
			expect(result).toBe('');
		});

		it('should respect maxChars budget', () => {
			const manyExamples = Array.from({ length: 100 }, (_, i) => ({
				expression: `={{ $json.field_${i}_with_a_very_long_name_that_takes_up_space }}`,
				fieldPath: `field_${i}_with_a_very_long_name_that_takes_up_space`,
				parameterPath: 'value',
				consumerNodeType: 'n8n-nodes-base.set',
				referenceType: 'direct' as const,
			}));

			const result = formatExpressionExamples('n8n-nodes-base.httpRequest', manyExamples, 500);

			// Should be truncated due to small maxChars
			expect(result.length).toBeLessThan(700);
		});
	});

	describe('fetchAndFormatExpressionExamples', () => {
		const mockFetchWorkflowsFromTemplates =
			templates.fetchWorkflowsFromTemplates as jest.MockedFunction<
				typeof templates.fetchWorkflowsFromTemplates
			>;

		beforeEach(() => {
			jest.clearAllMocks();
		});

		const createMockFetchResult = (workflows: WorkflowMetadata[]): FetchWorkflowsResult => ({
			workflows,
			totalFound: workflows.length,
			templateIds: workflows.map((_, i) => i + 1),
		});

		it('should supplement from API when fewer than 20 cached templates', async () => {
			const cachedTemplates: WorkflowMetadata[] = [
				{
					templateId: 1,
					name: 'Cached Workflow',
					workflow: {
						name: 'Cached Workflow',
						nodes: [
							createNode({
								name: 'HTTP Request',
								type: 'n8n-nodes-base.httpRequest',
								parameters: { url: 'https://example.com' },
							}),
							createNode({
								name: 'Set',
								type: 'n8n-nodes-base.set',
								parameters: { value: '={{ $json.data }}' },
							}),
						],
						connections: {
							'HTTP Request': { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
						},
					},
				},
			];

			mockFetchWorkflowsFromTemplates.mockResolvedValue(
				createMockFetchResult([
					{
						templateId: 2,
						name: 'API Workflow',
						workflow: {
							name: 'API Workflow',
							nodes: [
								createNode({
									name: 'HTTP Request',
									type: 'n8n-nodes-base.httpRequest',
								}),
								createNode({
									name: 'IF',
									type: 'n8n-nodes-base.if',
									parameters: { condition: '={{ $json.status }}' },
								}),
							],
							connections: {
								'HTTP Request': { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
							},
						},
					},
				]),
			);

			const result = await fetchAndFormatExpressionExamples(
				['n8n-nodes-base.httpRequest'],
				cachedTemplates,
			);

			// Includes cached + API results
			expect(result.formatted['n8n-nodes-base.httpRequest']).toContain('data');
			expect(result.formatted['n8n-nodes-base.httpRequest']).toContain('status');
			// API was called to supplement
			expect(mockFetchWorkflowsFromTemplates).toHaveBeenCalledWith(
				{ nodes: 'n8n-nodes-base.httpRequest', rows: 19 },
				expect.any(Object),
			);
			// Only API-fetched templates are returned as new
			expect(result.newTemplates).toHaveLength(1);
			expect(result.newTemplates[0].templateId).toBe(2);
		});

		it('should not fetch from API when 20+ cached templates exist', async () => {
			const cachedTemplates: WorkflowMetadata[] = Array.from({ length: 20 }, (_, i) => ({
				templateId: i + 1,
				name: `Cached Workflow ${i}`,
				workflow: {
					name: `Cached Workflow ${i}`,
					nodes: [
						createNode({
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
						}),
						createNode({
							name: 'Set',
							type: 'n8n-nodes-base.set',
							parameters: { value: `={{ $json.field_${i} }}` },
						}),
					],
					connections: {
						'HTTP Request': { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
					},
				},
			}));

			const result = await fetchAndFormatExpressionExamples(
				['n8n-nodes-base.httpRequest'],
				cachedTemplates,
			);

			expect(result.formatted['n8n-nodes-base.httpRequest']).toContain('field_0');
			expect(result.newTemplates).toHaveLength(0);
			expect(mockFetchWorkflowsFromTemplates).not.toHaveBeenCalled();
		});

		it('should fetch from API when no cached templates match', async () => {
			const fetchedWorkflows: WorkflowMetadata[] = [
				{
					templateId: 1,
					name: 'API Workflow',
					workflow: {
						name: 'API Workflow',
						nodes: [
							createNode({
								name: 'HTTP Request',
								type: 'n8n-nodes-base.httpRequest',
								parameters: { url: 'https://api.example.com' },
							}),
							createNode({
								name: 'Set',
								type: 'n8n-nodes-base.set',
								parameters: { value: '={{ $json.body.results }}' },
							}),
						],
						connections: {
							'HTTP Request': { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
						},
					},
				},
			];

			mockFetchWorkflowsFromTemplates.mockResolvedValue(createMockFetchResult(fetchedWorkflows));

			const result = await fetchAndFormatExpressionExamples(['n8n-nodes-base.httpRequest'], []);

			expect(result.formatted['n8n-nodes-base.httpRequest']).toContain('body.results');
			expect(result.newTemplates).toEqual(fetchedWorkflows);
			expect(mockFetchWorkflowsFromTemplates).toHaveBeenCalledWith(
				{ nodes: 'n8n-nodes-base.httpRequest', rows: 20 },
				expect.any(Object),
			);
		});

		it('should handle multiple node types', async () => {
			mockFetchWorkflowsFromTemplates
				.mockResolvedValueOnce(
					createMockFetchResult([
						{
							templateId: 1,
							name: 'HTTP Workflow',
							workflow: {
								name: 'HTTP Workflow',
								nodes: [
									createNode({
										name: 'HTTP Request',
										type: 'n8n-nodes-base.httpRequest',
									}),
									createNode({
										name: 'Set',
										type: 'n8n-nodes-base.set',
										parameters: { value: '={{ $json.data }}' },
									}),
								],
								connections: {
									'HTTP Request': {
										main: [[{ node: 'Set', type: 'main', index: 0 }]],
									},
								},
							},
						},
					]),
				)
				.mockResolvedValueOnce(
					createMockFetchResult([
						{
							templateId: 2,
							name: 'Code Workflow',
							workflow: {
								name: 'Code Workflow',
								nodes: [
									createNode({
										name: 'Code',
										type: 'n8n-nodes-base.code',
									}),
									createNode({
										name: 'IF',
										type: 'n8n-nodes-base.if',
										parameters: { condition: '={{ $json.success }}' },
									}),
								],
								connections: {
									Code: {
										main: [[{ node: 'IF', type: 'main', index: 0 }]],
									},
								},
							},
						},
					]),
				);

			const result = await fetchAndFormatExpressionExamples(
				['n8n-nodes-base.httpRequest', 'n8n-nodes-base.code'],
				[],
			);

			expect(result.formatted['n8n-nodes-base.httpRequest']).toContain('httpRequest');
			expect(result.formatted['n8n-nodes-base.code']).toContain('code');
			expect(result.newTemplates).toHaveLength(2);
			expect(mockFetchWorkflowsFromTemplates).toHaveBeenCalledTimes(2);
		});

		it('should handle API fetch failures gracefully', async () => {
			mockFetchWorkflowsFromTemplates.mockRejectedValue(new Error('Network error'));

			const result = await fetchAndFormatExpressionExamples(['n8n-nodes-base.httpRequest'], []);

			expect(result.formatted).toEqual({});
			expect(result.newTemplates).toHaveLength(0);
		});
	});

	describe('extractFieldPaths - method call stripping', () => {
		it('should strip method calls like .includes() from field paths', () => {
			const paths = extractFieldPaths(
				'={{ $json.issue.fields.labels.includes("product_approved") }}',
			);
			expect(paths).toEqual(['issue.fields.labels']);
		});

		it('should strip .concat() from field paths', () => {
			const paths = extractFieldPaths(
				"={{ $json.issue.fields.labels.concat('copilot_assigned') }}",
			);
			expect(paths).toEqual(['issue.fields.labels']);
		});

		it('should skip entirely when the whole path is a method call', () => {
			const paths = extractFieldPaths('={{ $json.toString() }}');
			expect(paths).toEqual([]);
		});

		it('should not strip segments that are not followed by (', () => {
			const paths = extractFieldPaths('={{ $json.issue.fields.labels }}');
			expect(paths).toEqual(['issue.fields.labels']);
		});
	});

	describe('real template extraction - Jira trigger (template 11728)', () => {
		/**
		 * Simplified version of template 11728 "Auto-resolve Jira tickets with
		 * GitHub Copilot using Port Context". This template has a Jira trigger
		 * with downstream nodes referencing its output via both direct $json and
		 * named $('On Jira ticket updated') expressions. It exercises:
		 * - Direct $json refs with method calls (.includes, .concat)
		 * - Named refs from deeply nested nodes
		 * - Long expression strings (the Port AI prompt)
		 */
		const template11728: WorkflowMetadata = {
			templateId: 11728,
			name: 'Auto-resolve Jira tickets with GitHub Copilot using Port Context',
			workflow: {
				name: 'Auto-resolve Jira tickets',
				nodes: [
					createNode({
						name: 'On Jira ticket updated',
						type: 'n8n-nodes-base.jiraTrigger',
						parameters: {
							events: ['jira:issue_updated'],
							additionalFields: {},
						},
					}),
					createNode({
						name: 'Is ready for assignment?',
						type: 'n8n-nodes-base.if',
						parameters: {
							options: {},
							conditions: {
								options: { version: 2, caseSensitive: true, typeValidation: 'strict' },
								combinator: 'and',
								conditions: [
									{
										operator: { type: 'boolean', operation: 'true', singleValue: true },
										leftValue:
											'={{ $json.webhookEvent == "jira:issue_updated" && $json.issue.fields.status.name == "In Progress" && $json.issue.fields.labels.includes("product_approved") && !$json.issue.fields.labels.includes("copilot_assigned") }}',
									},
								],
							},
						},
					}),
					createNode({
						name: 'Extract context from Port',
						type: '@port-labs/n8n-nodes-portio-experimental.portApiAi',
						parameters: {
							operation: 'generalInvoke',
							userPrompt:
								"=A Jira issue has moved. Key: {{ $('On Jira ticket updated').item.json.issue.key }} Title: {{ $('On Jira ticket updated').item.json.issue.fields.summary }} Type: {{ $('On Jira ticket updated').item.json.issue.fields.issuetype.name }} Description: {{ $('On Jira ticket updated').item.json.issue.fields.description }} Project Key: {{ $('On Jira ticket updated').item.json.issue.fields.project.key }} Project Name: {{ $('On Jira ticket updated').item.json.issue.fields.project.name }}",
						},
					}),
					createNode({
						name: 'Add issue link to Jira ticket',
						type: 'n8n-nodes-base.jira',
						parameters: {
							issueKey: "={{ $('On Jira ticket updated').item.json.issue.key }}",
							resource: 'issueComment',
						},
					}),
					createNode({
						name: 'Mark ticket as assigned',
						type: 'n8n-nodes-base.jira',
						parameters: {
							issueKey: "={{ $('On Jira ticket updated').item.json.issue.key }}",
							operation: 'update',
							updateFields: {
								labels:
									"={{ $('On Jira ticket updated').item.json.issue.fields.labels.concat('copilot_assigned') }}",
							},
						},
					}),
				],
				connections: {
					'On Jira ticket updated': {
						main: [[{ node: 'Is ready for assignment?', type: 'main', index: 0 }]],
					},
					'Is ready for assignment?': {
						main: [[{ node: 'Extract context from Port', type: 'main', index: 0 }]],
					},
				},
			},
		};

		it('should extract field paths from the Jira trigger without method calls', () => {
			const examples = extractExpressionExamplesForNode(
				template11728.workflow,
				'On Jira ticket updated',
			);

			const fieldPaths = examples.map((e) => e.fieldPath);

			// Direct $json refs from the immediate child IF node
			expect(fieldPaths).toContain('webhookEvent');
			expect(fieldPaths).toContain('issue.fields.status.name');
			expect(fieldPaths).toContain('issue.fields.labels');

			// Named refs from deeper nodes
			expect(fieldPaths).toContain('issue.key');
			expect(fieldPaths).toContain('issue.fields.summary');
			expect(fieldPaths).toContain('issue.fields.issuetype.name');
			expect(fieldPaths).toContain('issue.fields.description');
			expect(fieldPaths).toContain('issue.fields.project.key');
			expect(fieldPaths).toContain('issue.fields.project.name');

			// Method calls should NOT appear as field paths
			expect(fieldPaths).not.toContain('issue.fields.labels.includes');
			expect(fieldPaths).not.toContain('issue.fields.labels.concat');
		});

		it('should produce a concise formatted output with plain field paths', () => {
			const examples = collectExpressionExamplesFromTemplates(
				[template11728],
				'n8n-nodes-base.jiraTrigger',
			);
			const formatted = formatExpressionExamples('n8n-nodes-base.jiraTrigger', examples);

			// Header
			expect(formatted).toContain('n8n-nodes-base.jiraTrigger');

			// Field paths listed without $json or $('Name') prefix
			expect(formatted).toContain('- webhookEvent');
			expect(formatted).toContain('- issue.fields.status.name');
			expect(formatted).toContain('- issue.fields.labels');
			expect(formatted).toContain('- issue.key');
			expect(formatted).toContain('- issue.fields.summary');

			// Should NOT contain expression syntax
			expect(formatted).not.toContain('$json');
			expect(formatted).not.toContain("$('On Jira ticket updated')");

			// Should NOT contain the raw long expression text
			expect(formatted).not.toContain('A Jira issue has moved');
			expect(formatted).not.toContain('includes("product_approved")');

			// Output should be compact - no markdown tables
			expect(formatted).not.toContain('|');

			// Total output should be reasonable length
			expect(formatted.length).toBeLessThan(1000);
		});
	});
});
