import { CreateWorkflowDto } from '../create-workflow.dto';

describe('CreateWorkflowDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'minimal workflow',
				request: {
					name: 'My Workflow',
					nodes: [],
					connections: {},
				},
			},
			{
				name: 'with all optional fields',
				request: {
					name: 'Complete Workflow',
					nodes: [],
					connections: {},
					description: 'A test workflow',
					settings: { saveExecutionProgress: true },
					staticData: { key: 'value' },
					meta: { version: '1.0' },
					pinData: {},
					hash: 'abc123',
					tags: ['tag1', 'tag2'],
					projectId: 'proj123',
					parentFolderId: 'folder123',
					uiContext: 'workflow_list',
					aiBuilderAssisted: true,
					autosaved: false,
				},
			},
			{
				name: 'with tags as objects (backward compatibility)',
				request: {
					name: 'Tagged Workflow',
					nodes: [],
					connections: {},
					tags: [
						{ id: 'tag1', name: 'Tag 1' },
						{ id: 'tag2', name: 'Tag 2' },
					],
				},
			},
		])('should validate $name', ({ request }) => {
			const result = CreateWorkflowDto.safeParse(request);
			expect(result.success).toBe(true);
		});

		test('should transform tags from objects to string array', () => {
			const result = CreateWorkflowDto.safeParse({
				name: 'Test',
				nodes: [],
				connections: {},
				tags: [
					{ id: 'tag1', name: 'Tag 1' },
					{ id: 'tag2', name: 'Tag 2' },
				],
			});

			expect(result.success).toBe(true);
			expect(result.data?.tags).toEqual(['tag1', 'tag2']);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing name',
				request: { nodes: [], connections: {} },
				expectedErrorPath: ['name'],
			},
			{
				name: 'empty name',
				request: { name: '', nodes: [], connections: {} },
				expectedErrorPath: ['name'],
			},
			{
				name: 'name too long',
				request: { name: 'a'.repeat(129), nodes: [], connections: {} },
				expectedErrorPath: ['name'],
			},
			{
				name: 'missing nodes',
				request: { name: 'Test', connections: {} },
				expectedErrorPath: ['nodes'],
			},
			{
				name: 'missing connections',
				request: { name: 'Test', nodes: [] },
				expectedErrorPath: ['connections'],
			},
			{
				name: 'connections as array',
				request: { name: 'Test', nodes: [], connections: [] },
				expectedErrorPath: ['connections'],
			},
			{
				name: 'settings as array',
				request: { name: 'Test', nodes: [], connections: {}, settings: [] },
				expectedErrorPath: ['settings'],
			},
			{
				name: 'staticData as array',
				request: { name: 'Test', nodes: [], connections: {}, staticData: [] },
				expectedErrorPath: ['staticData'],
			},
			{
				name: 'pinData as array',
				request: { name: 'Test', nodes: [], connections: {}, pinData: [] },
				expectedErrorPath: ['pinData'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = CreateWorkflowDto.safeParse(request);
			expect(result.success).toBe(false);
			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});

	describe('Security: Mass assignment protection', () => {
		describe('Activation fields', () => {
			test('should not accept active field', () => {
				const result = CreateWorkflowDto.safeParse({
					name: 'Test',
					nodes: [],
					connections: {},
					active: true,
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('active');
			});

			test('should not accept activeVersionId field', () => {
				const result = CreateWorkflowDto.safeParse({
					name: 'Test',
					nodes: [],
					connections: {},
					activeVersionId: 'version123',
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('activeVersionId');
			});

			test('should not accept activeVersion field', () => {
				const result = CreateWorkflowDto.safeParse({
					name: 'Test',
					nodes: [],
					connections: {},
					activeVersion: { versionId: 'v1', workflowId: 'w1' },
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('activeVersion');
			});
		});

		describe('Sharing and permissions', () => {
			test('should not accept shared field', () => {
				const result = CreateWorkflowDto.safeParse({
					name: 'Test',
					nodes: [],
					connections: {},
					shared: [{ role: 'owner' }],
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('shared');
			});

			test('should not accept sharedWithProjects field', () => {
				const result = CreateWorkflowDto.safeParse({
					name: 'Test',
					nodes: [],
					connections: {},
					sharedWithProjects: [{ id: 'proj1', name: 'Project' }],
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('sharedWithProjects');
			});

			test('should not accept homeProject field', () => {
				const result = CreateWorkflowDto.safeParse({
					name: 'Test',
					nodes: [],
					connections: {},
					homeProject: { id: 'proj1', name: 'Project' },
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('homeProject');
			});
		});

		describe('Internal counters and metadata', () => {
			test('should not accept triggerCount field (billing bypass)', () => {
				const result = CreateWorkflowDto.safeParse({
					name: 'Test',
					nodes: [],
					connections: {},
					triggerCount: 999,
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('triggerCount');
			});

			test('should not accept versionCounter field', () => {
				const result = CreateWorkflowDto.safeParse({
					name: 'Test',
					nodes: [],
					connections: {},
					versionCounter: 100,
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('versionCounter');
			});

			test('should not accept versionId field', () => {
				const result = CreateWorkflowDto.safeParse({
					name: 'Test',
					nodes: [],
					connections: {},
					versionId: 'custom-version-id',
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('versionId');
			});

			test('should not accept isArchived field', () => {
				const result = CreateWorkflowDto.safeParse({
					name: 'Test',
					nodes: [],
					connections: {},
					isArchived: true,
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('isArchived');
			});
		});

		describe('Timestamps', () => {
			test('should not accept createdAt field', () => {
				const result = CreateWorkflowDto.safeParse({
					name: 'Test',
					nodes: [],
					connections: {},
					createdAt: new Date().toISOString(),
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('createdAt');
			});

			test('should not accept updatedAt field', () => {
				const result = CreateWorkflowDto.safeParse({
					name: 'Test',
					nodes: [],
					connections: {},
					updatedAt: new Date().toISOString(),
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('updatedAt');
			});
		});

		describe('Multiple malicious fields at once', () => {
			test('should strip all internal fields when multiple are provided', () => {
				const result = CreateWorkflowDto.safeParse({
					name: 'Test',
					nodes: [],
					connections: {},
					active: true,
					activeVersionId: 'v1',
					triggerCount: 999,
					versionCounter: 100,
					isArchived: true,
					shared: [{ role: 'owner' }],
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('active');
				expect(result.data).not.toHaveProperty('activeVersionId');
				expect(result.data).not.toHaveProperty('triggerCount');
				expect(result.data).not.toHaveProperty('versionCounter');
				expect(result.data).not.toHaveProperty('isArchived');
				expect(result.data).not.toHaveProperty('shared');
				expect(result.data).not.toHaveProperty('createdAt');
				expect(result.data).not.toHaveProperty('updatedAt');
				// Valid fields should remain
				expect(result.data?.name).toBe('Test');
				expect(result.data?.nodes).toEqual([]);
				expect(result.data?.connections).toEqual({});
			});
		});
	});
});
