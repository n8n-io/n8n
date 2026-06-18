import type { Project } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { ProjectSerializer } from '../project.serializer';

describe('ProjectSerializer', () => {
	const serializer = new ProjectSerializer();

	const baseProject = mock<Project>({
		id: '550e8400-e29b-41d4-a716-446655440000',
		name: 'billing',
		type: 'team',
		description: null,
		icon: null,
	});

	it('should serialize a project with only id and name when no optional fields', () => {
		const result = serializer.serialize(baseProject);

		expect(result).toEqual({
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
		});
	});

	it('should include description when non-null', () => {
		const project = { ...baseProject, description: 'Billing project' };
		const result = serializer.serialize(project as Project);

		expect(result).toEqual({
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			description: 'Billing project',
		});
	});

	it('should include icon when non-null', () => {
		const project = { ...baseProject, icon: { type: 'emoji' as const, value: 'receipt' } };
		const result = serializer.serialize(project as Project);

		expect(result).toEqual({
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			icon: { type: 'emoji', value: 'receipt' },
		});
	});

	it('should omit timestamps and relations', () => {
		const result = serializer.serialize(baseProject);

		expect(result).not.toHaveProperty('createdAt');
		expect(result).not.toHaveProperty('updatedAt');
		expect(result).not.toHaveProperty('type');
		expect(result).not.toHaveProperty('creatorId');
		expect(result).not.toHaveProperty('projectRelations');
	});
});
