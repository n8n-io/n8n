import { TestCredentialsBodyDto } from '../test-credentials-body.dto';

describe('TestCredentialsBodyDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'with minimal credentials',
				request: {
					credentials: {
						id: 'cred-123',
						name: 'Test Credentials',
						type: 'apiKey',
					},
				},
			},
			{
				name: 'with minimal credentials without name',
				request: {
					credentials: {
						id: 'cred-123',
						type: 'apiKey',
					},
				},
			},
			{
				name: 'with data',
				request: {
					credentials: {
						id: 'cred-123',
						name: 'Test Credentials',
						type: 'apiKey',
						data: { apiKey: 'secret-key' },
					},
				},
			},
			{
				name: 'with homeProject',
				request: {
					credentials: {
						id: 'cred-123',
						name: 'Test Credentials',
						type: 'apiKey',
						homeProject: {
							id: 'proj-123',
							name: 'My Project',
							icon: { type: 'emoji', value: '🚀' },
							type: 'personal',
							createdAt: '2024-01-01T00:00:00Z',
							updatedAt: '2024-01-01T00:00:00Z',
						},
					},
				},
			},
			{
				name: 'with null project name and icon',
				request: {
					credentials: {
						id: 'cred-123',
						name: 'Test Credentials',
						type: 'apiKey',
						homeProject: {
							id: 'proj-123',
							name: null,
							icon: null,
							type: 'team',
							createdAt: '2024-01-01T00:00:00Z',
							updatedAt: '2024-01-01T00:00:00Z',
						},
					},
				},
			},
			{
				name: 'with sharedWithProjects',
				request: {
					credentials: {
						id: 'cred-123',
						name: 'Test Credentials',
						type: 'apiKey',
						sharedWithProjects: [
							{
								id: 'proj-1',
								name: 'Project 1',
								icon: { type: 'icon', value: 'folder' },
								type: 'team',
								createdAt: '2024-01-01T00:00:00Z',
								updatedAt: '2024-01-01T00:00:00Z',
							},
						],
					},
				},
			},
			{
				name: 'with isGlobal and isResolvable',
				request: {
					credentials: {
						id: 'cred-123',
						name: 'Test Credentials',
						type: 'apiKey',
						isGlobal: true,
						isResolvable: false,
					},
				},
			},
			{
				name: 'with all fields',
				request: {
					credentials: {
						id: 'cred-123',
						name: 'Full Credentials',
						type: 'oauth2',
						data: { accessToken: 'token', refreshToken: 'refresh' },
						homeProject: {
							id: 'proj-home',
							name: 'Home Project',
							icon: { type: 'emoji', value: '🏠' },
							type: 'personal',
							createdAt: '2024-01-01T00:00:00Z',
							updatedAt: '2024-01-02T00:00:00Z',
						},
						sharedWithProjects: [
							{
								id: 'proj-shared',
								name: 'Shared Project',
								icon: null,
								type: 'public',
								createdAt: '2024-01-01T00:00:00Z',
								updatedAt: '2024-01-01T00:00:00Z',
							},
						],
						isGlobal: false,
						isResolvable: true,
					},
				},
			},
		])('should validate $name', ({ request }) => {
			const result = TestCredentialsBodyDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'missing credentials',
				request: {},
				expectedErrorPath: ['credentials'],
			},
			{
				name: 'credentials missing id',
				request: {
					credentials: {
						name: 'Test',
						type: 'apiKey',
					},
				},
				expectedErrorPath: ['credentials', 'id'],
			},
			{
				name: 'credentials missing type',
				request: {
					credentials: {
						id: 'cred-123',
						name: 'Test',
					},
				},
				expectedErrorPath: ['credentials', 'type'],
			},
			{
				name: 'invalid homeProject structure',
				request: {
					credentials: {
						id: 'cred-123',
						name: 'Test',
						type: 'apiKey',
						homeProject: {
							id: 'proj-123',
							// missing required fields
						},
					},
				},
				expectedErrorPath: ['credentials', 'homeProject', 'name'],
			},
			{
				name: 'invalid project type',
				request: {
					credentials: {
						id: 'cred-123',
						name: 'Test',
						type: 'apiKey',
						homeProject: {
							id: 'proj-123',
							name: 'Project',
							icon: null,
							type: 'invalid',
							createdAt: '2024-01-01T00:00:00Z',
							updatedAt: '2024-01-01T00:00:00Z',
						},
					},
				},
				expectedErrorPath: ['credentials', 'homeProject', 'type'],
			},
			{
				name: 'invalid icon type',
				request: {
					credentials: {
						id: 'cred-123',
						name: 'Test',
						type: 'apiKey',
						homeProject: {
							id: 'proj-123',
							name: 'Project',
							icon: { type: 'image', value: 'url' },
							type: 'personal',
							createdAt: '2024-01-01T00:00:00Z',
							updatedAt: '2024-01-01T00:00:00Z',
						},
					},
				},
				expectedErrorPath: ['credentials', 'homeProject', 'icon', 'type'],
			},
			{
				name: 'invalid sharedWithProjects item',
				request: {
					credentials: {
						id: 'cred-123',
						name: 'Test',
						type: 'apiKey',
						sharedWithProjects: [{ id: 'invalid' }],
					},
				},
				expectedErrorPath: ['credentials', 'sharedWithProjects', 0, 'name'],
			},
			{
				name: 'isGlobal not a boolean',
				request: {
					credentials: {
						id: 'cred-123',
						name: 'Test',
						type: 'apiKey',
						isGlobal: 'true',
					},
				},
				expectedErrorPath: ['credentials', 'isGlobal'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = TestCredentialsBodyDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
