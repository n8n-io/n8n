import type { Project, ProjectRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { ExportContext } from '../../import-export.types';
import type { PackageWriter } from '../../package-writer';
import { ProjectExporter } from '../project.exporter';
import type { ProjectSerializer } from '../project.serializer';

describe('ProjectExporter', () => {
	let exporter: ProjectExporter;
	let mockProjectRepository: MockProxy<ProjectRepository>;
	let mockSerializer: MockProxy<ProjectSerializer>;
	let mockWriter: MockProxy<PackageWriter>;
	let context: ExportContext;

	beforeEach(() => {
		jest.clearAllMocks();

		mockProjectRepository = mock<ProjectRepository>();
		mockSerializer = mock<ProjectSerializer>();
		mockWriter = mock<PackageWriter>();

		exporter = new ProjectExporter(mockProjectRepository, mockSerializer);

		context = {
			user: mock(),
			projectIds: ['project-1'],
		};
	});

	it('should have key "projects"', () => {
		expect(exporter.key).toBe('projects');
	});

	it('should export a team project', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		mockProjectRepository.find.mockResolvedValue([project]);
		mockSerializer.serialize.mockReturnValue({ id: project.id, name: project.name });

		const entries = await exporter.export(context, mockWriter);

		expect(entries).toHaveLength(1);
		expect(entries[0].id).toBe(project.id);
		expect(entries[0].name).toBe('billing');
		expect(entries[0].target).toMatch(/^projects\/billing-550e84$/);

		expect(mockWriter.writeDirectory).toHaveBeenCalledWith('projects/billing-550e84');
		expect(mockWriter.writeFile).toHaveBeenCalledWith(
			'projects/billing-550e84/project.json',
			expect.any(String),
		);
	});

	it('should throw BadRequestError for personal projects', async () => {
		const project = {
			id: 'personal-1',
			name: 'Personal',
			type: 'personal',
		} as Project;

		mockProjectRepository.find.mockResolvedValue([project]);

		await expect(exporter.export(context, mockWriter)).rejects.toThrow(BadRequestError);
	});

	it('should export multiple projects', async () => {
		const projects = [
			{ id: 'aaaaaa-1111', name: 'billing', type: 'team' } as Project,
			{ id: 'bbbbbb-2222', name: 'marketing', type: 'team' } as Project,
		];

		context.projectIds = ['aaaaaa-1111', 'bbbbbb-2222'];
		mockProjectRepository.find.mockResolvedValue(projects);
		mockSerializer.serialize
			.mockReturnValueOnce({ id: projects[0].id, name: projects[0].name })
			.mockReturnValueOnce({ id: projects[1].id, name: projects[1].name });

		const entries = await exporter.export(context, mockWriter);

		expect(entries).toHaveLength(2);
		expect(mockWriter.writeDirectory).toHaveBeenCalledTimes(2);
		expect(mockWriter.writeFile).toHaveBeenCalledTimes(2);
	});

	it('should serialize project data as JSON in the written file', async () => {
		const project = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'billing',
			type: 'team',
		} as Project;

		const serialized = { id: project.id, name: 'billing', description: 'A billing project' };
		mockProjectRepository.find.mockResolvedValue([project]);
		mockSerializer.serialize.mockReturnValue(serialized);

		await exporter.export(context, mockWriter);

		const writtenContent = mockWriter.writeFile.mock.calls[0][1] as string;
		expect(JSON.parse(writtenContent)).toEqual(serialized);
	});
});
