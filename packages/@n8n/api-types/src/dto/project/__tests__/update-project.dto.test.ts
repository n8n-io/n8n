import { UpdateProjectWithRelationsDto } from '../update-project.dto';

describe('UpdateProjectWithRelationsDto', () => {
	describe('Valid requests', () => {
		test.each([
			{
				name: 'just the name',
				request: {
					name: 'My Updated Project',
				},
			},
			{
				name: 'name and emoji icon',
				request: {
					name: 'My Updated Project',
					icon: {
						type: 'emoji',
						value: '🚀',
					},
				},
			},
			{
				name: 'name and regular icon',
				request: {
					name: 'My Updated Project',
					icon: {
						type: 'icon',
						value: 'blah',
					},
				},
			},
			{
				name: 'just the description',
				request: {
					description: 'My Updated Project Description',
				},
			},
			{
				name: 'an empty description',
				request: {
					description: '',
				},
			},
			{
				name: 'just the relations',
				request: {
					relations: [
						{
							userId: 'user-123',
							role: 'project:admin',
						},
					],
				},
			},
			{
				name: 'all fields',
				request: {
					name: 'My Updated Project',
					icon: {
						type: 'emoji',
						value: '🚀',
					},
					relations: [
						{
							userId: 'user-123',
							role: 'project:admin',
						},
					],
					description: 'My Updated Project Description',
				},
			},
			{
				name: 'valid customTelemetryTags with unique keys',
				request: {
					customTelemetryTags: [
						{ key: 'env', value: 'production' },
						{ key: 'team', value: 'backend' },
					],
				},
			},
			{
				name: 'customTelemetryTags with keys that are unique after trim',
				request: {
					customTelemetryTags: [
						{ key: '  env  ', value: 'production' },
						{ key: 'team', value: 'backend' },
					],
				},
			},
		])('should pass validation for $name', ({ request }) => {
			const result = UpdateProjectWithRelationsDto.safeParse(request);
			expect(result.success).toBe(true);
		});
	});

	describe('Invalid requests', () => {
		test.each([
			{
				name: 'invalid name type',
				request: { name: 123 },
				expectedErrorPath: ['name'],
			},
			{
				name: 'empty name',
				request: { name: '', icon: { type: 'emoji', value: '🚀' } },
				expectedErrorPath: ['name'],
			},
			{
				name: 'name too long',
				request: { name: 'a'.repeat(256) },
				expectedErrorPath: ['name'],
			},
			{
				name: 'invalid icon type',
				request: { icon: { type: 'invalid', value: '🚀' } },
				expectedErrorPath: ['icon', 'type'],
			},
			{
				name: 'invalid icon value',
				request: { icon: { type: 'emoji', value: '' } },
				expectedErrorPath: ['icon', 'value'],
			},
			{
				name: 'invalid relations userId',
				request: {
					relations: [
						{
							userId: 123,
							role: 'project:admin',
						},
					],
				},
				expectedErrorPath: ['relations', 0, 'userId'],
			},
			{
				name: 'invalid relations role',
				request: {
					relations: [
						{
							userId: 'user-123',
							role: 'project:personalOwner',
						},
					],
				},
				expectedErrorPath: ['relations', 0, 'role'],
			},
			{
				name: 'invalid description type',
				request: { description: 123 },
				expectedErrorPath: ['description'],
			},
			{
				name: 'description too long',
				request: { description: 'a'.repeat(513) },
				expectedErrorPath: ['description'],
			},
			{
				name: 'duplicate keys in customTelemetryTags',
				request: {
					customTelemetryTags: [
						{ key: 'env', value: 'production' },
						{ key: 'env', value: 'staging' },
					],
				},
				expectedErrorPath: ['customTelemetryTags'],
			},
			{
				name: 'duplicate keys in customTelemetryTags after trim',
				request: {
					customTelemetryTags: [
						{ key: '  env  ', value: 'production' },
						{ key: 'env', value: 'staging' },
					],
				},
				expectedErrorPath: ['customTelemetryTags'],
			},
			{
				name: 'empty key in customTelemetryTags',
				request: {
					customTelemetryTags: [{ key: '', value: 'something' }],
				},
				expectedErrorPath: ['customTelemetryTags', 0, 'key'],
			},
			{
				name: 'whitespace-only key in customTelemetryTags',
				request: {
					customTelemetryTags: [{ key: '   ', value: 'something' }],
				},
				expectedErrorPath: ['customTelemetryTags', 0, 'key'],
			},
		])('should fail validation for $name', ({ request, expectedErrorPath }) => {
			const result = UpdateProjectWithRelationsDto.safeParse(request);

			expect(result.success).toBe(false);

			if (expectedErrorPath) {
				expect(result.error?.issues[0].path).toEqual(expectedErrorPath);
			}
		});
	});
});
