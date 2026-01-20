import { UpdateWorkflowDto } from '../update-workflow.dto';

describe('UpdateWorkflowDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'empty update',
				request: {},
			},
			{
				name: 'update name only',
				request: { name: 'Updated Name' },
			},
			{
				name: 'update nodes and connections',
				request: {
					nodes: [{ id: 'node1', name: 'Node', type: 'test', position: [0, 0], parameters: {} }],
					connections: { node1: { main: [[]] } },
				},
			},
			{
				name: 'update tags as strings',
				request: { tags: ['tag1', 'tag2'] },
			},
			{
				name: 'update tags as objects',
				request: {
					tags: [
						{ id: 'tag1', name: 'Tag 1' },
						{ id: 'tag2', name: 'Tag 2' },
					],
				},
			},
			{
				name: 'update multiple fields',
				request: {
					name: 'Updated Workflow',
					description: 'Updated description',
					settings: { saveExecutionProgress: false },
					meta: { version: '2.0' },
				},
			},
		])('should validate $name', ({ request }) => {
			const result = UpdateWorkflowDto.safeParse(request);
			expect(result.success).toBe(true);
		});

		test('should transform tags from objects to string array', () => {
			const result = UpdateWorkflowDto.safeParse({
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
				name: 'empty name',
				request: { name: '' },
				expectedErrorPath: ['name'],
			},
			{
				name: 'name too long',
				request: { name: 'a'.repeat(129) },
				expectedErrorPath: ['name'],
			},
			{
				name: 'invalid nodes type',
				request: { nodes: 'not-an-array' },
				expectedErrorPath: ['nodes'],
			},
			{
				name: 'invalid connections type',
				request: { connections: 'not-an-object' },
				expectedErrorPath: ['connections'],
			},
			{
				name: 'connections as array',
				request: { connections: [] },
				expectedErrorPath: ['connections'],
			},
			{
				name: 'settings as array',
				request: { settings: [] },
				expectedErrorPath: ['settings'],
			},
			{
				name: 'staticData as array',
				request: { staticData: [] },
				expectedErrorPath: ['staticData'],
			},
			{
				name: 'pinData as array',
				request: { pinData: [] },
				expectedErrorPath: ['pinData'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = UpdateWorkflowDto.safeParse(request);
			expect(result.success).toBe(false);
			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});

	describe('Security: Mass assignment protection', () => {
		describe('Internal counters and metadata', () => {
			test('should not accept triggerCount field (billing bypass)', () => {
				const result = UpdateWorkflowDto.safeParse({
					name: 'Updated',
					triggerCount: 999,
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('triggerCount');
			});

			test('should not accept versionCounter field', () => {
				const result = UpdateWorkflowDto.safeParse({
					name: 'Updated',
					versionCounter: 100,
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('versionCounter');
			});

			test('should not accept versionId field', () => {
				const result = UpdateWorkflowDto.safeParse({
					name: 'Updated',
					versionId: 'custom-version-id',
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('versionId');
			});

			test('should not accept isArchived field', () => {
				const result = UpdateWorkflowDto.safeParse({
					name: 'Updated',
					isArchived: true,
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('isArchived');
			});
		});

		describe('Activation fields', () => {
			test('should not accept active field', () => {
				const result = UpdateWorkflowDto.safeParse({
					name: 'Updated',
					active: true,
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('active');
			});

			test('should not accept activeVersionId field', () => {
				const result = UpdateWorkflowDto.safeParse({
					name: 'Updated',
					activeVersionId: 'version123',
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('activeVersionId');
			});

			test('should not accept activeVersion field', () => {
				const result = UpdateWorkflowDto.safeParse({
					name: 'Updated',
					activeVersion: { versionId: 'v1', workflowId: 'w1' },
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('activeVersion');
			});
		});

		describe('Sharing and permissions', () => {
			test('should not accept shared field', () => {
				const result = UpdateWorkflowDto.safeParse({
					name: 'Updated',
					shared: [{ role: 'owner' }],
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('shared');
			});

			test('should not accept projectId field', () => {
				const result = UpdateWorkflowDto.safeParse({
					name: 'Updated',
					projectId: 'malicious-project-id',
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('projectId');
			});

			test('should not accept id field', () => {
				const result = UpdateWorkflowDto.safeParse({
					name: 'Updated',
					id: 'malicious-id',
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('id');
			});
		});

		describe('Timestamps', () => {
			test('should not accept createdAt field', () => {
				const result = UpdateWorkflowDto.safeParse({
					name: 'Updated',
					createdAt: new Date().toISOString(),
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('createdAt');
			});

			test('should not accept updatedAt field', () => {
				const result = UpdateWorkflowDto.safeParse({
					name: 'Updated',
					updatedAt: new Date().toISOString(),
				});

				expect(result.success).toBe(true);
				expect(result.data).not.toHaveProperty('updatedAt');
			});
		});

		describe('Multiple malicious fields at once', () => {
			test('should strip all internal fields when multiple are provided', () => {
				const result = UpdateWorkflowDto.safeParse({
					name: 'Updated',
					active: true,
					activeVersionId: 'v1',
					triggerCount: 999,
					versionCounter: 100,
					isArchived: true,
					shared: [{ role: 'owner' }],
					projectId: 'malicious-project',
					id: 'malicious-id',
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
				expect(result.data).not.toHaveProperty('projectId');
				expect(result.data).not.toHaveProperty('id');
				expect(result.data).not.toHaveProperty('createdAt');
				expect(result.data).not.toHaveProperty('updatedAt');
				// Valid fields should remain
				expect(result.data?.name).toBe('Updated');
			});
		});
	});
});
