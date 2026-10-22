import type { AgentFileDto } from '@n8n/api-types';
import type { Response } from 'express';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';
import multer from 'multer';

import { BadRequestError, NotFoundError } from '@n8n/errors';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import type { Telemetry } from '@/telemetry';

import type { KnowledgeAvailabilityService } from '@/modules/knowledge/knowledge-availability.service';
import { makeKnowledgeAvailabilityService } from '@/modules/knowledge/__tests__/test-utils/knowledge-availability.service';

import {
	AgentKnowledgeUploadError,
	type AgentKnowledgeUploadFailureReason,
} from '../agent-knowledge-upload.error';
import { AgentKnowledgeController } from '../agent-knowledge.controller';
import type { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

function makeController({
	agentKnowledgeService = mock<AgentKnowledgeService>(),
	knowledgeAvailabilityService = makeKnowledgeAvailabilityService(),
	runtimeCacheService = mock<AgentRuntimeCacheService>(),
	telemetry = mock<Telemetry>(),
}: {
	agentKnowledgeService?: Mocked<AgentKnowledgeService>;
	knowledgeAvailabilityService?: KnowledgeAvailabilityService;
	runtimeCacheService?: Mocked<AgentRuntimeCacheService>;
	telemetry?: Mocked<Telemetry>;
} = {}) {
	return {
		controller: new AgentKnowledgeController(
			agentKnowledgeService,
			knowledgeAvailabilityService,
			runtimeCacheService,
			telemetry,
		),
		agentKnowledgeService,
		runtimeCacheService,
		telemetry,
	};
}

describe('AgentKnowledgeController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentKnowledgeController);

	const routes = getRoutesByHandlerName(AgentKnowledgeController);

	it.each([
		['listFiles', 'agent:read'],
		['uploadFiles', 'agent:update'],
		['deleteFile', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentKnowledgeController file uploads', () => {
	it('uploads files to storage and clears runtime cache', async () => {
		const { controller, agentKnowledgeService, runtimeCacheService } = makeController();
		const files = [{ path: '/tmp/uploaded-file' }];
		const uploaded = [{ id: 'file-1', name: 'uploaded-file' }];
		agentKnowledgeService.uploadFiles.mockResolvedValue(
			uploaded.map((file) => ({ file })) as never,
		);

		await expect(
			controller.uploadFiles(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					files,
				} as never,
				undefined as never,
				'project-1',
				'agent-1',
			),
		).resolves.toEqual(uploaded);

		expect(agentKnowledgeService.uploadFiles).toHaveBeenCalledWith('agent-1', 'project-1', files);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith('agent-1');
	});

	it('rejects empty uploads', async () => {
		const { controller } = makeController();

		await expect(
			controller.uploadFiles(
				{ params: { projectId: 'project-1' }, user: { id: 'user-1' }, files: [] } as never,
				undefined as never,
				'project-1',
				'agent-1',
			),
		).rejects.toThrow(BadRequestError);
	});

	it('maps multer upload validation errors to bad requests', async () => {
		const { controller } = makeController();

		await expect(
			controller.uploadFiles(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
					fileUploadError: new multer.MulterError('LIMIT_FILE_COUNT'),
				} as never,
				undefined as never,
				'project-1',
				'agent-1',
			),
		).rejects.toThrow(BadRequestError);
	});
});

describe('AgentKnowledgeController upload telemetry', () => {
	type UploadRequest = Parameters<AgentKnowledgeController['uploadFiles']>[0];

	// A mock() request answers every unset property, so `fileUploadError` would always be set.
	function fakeUploadRequest(overrides: Partial<UploadRequest> = {}): UploadRequest {
		const request = {
			params: { projectId: 'project-1' },
			user: { id: 'user-1' },
			files: [{ path: '/tmp/uploaded-file' }],
			...overrides,
		};

		return request as unknown as UploadRequest;
	}

	function fakeFileDto(
		file: Pick<AgentFileDto, 'id' | 'mimeType' | 'fileSizeBytes'>,
	): AgentFileDto {
		return {
			agentId: 'agent-1',
			fileName: `${file.id}.txt`,
			createdAt: '2026-01-01T00:00:00.000Z',
			...file,
		};
	}

	it('tracks the uploaded files after a successful upload', async () => {
		const { controller, agentKnowledgeService, telemetry } = makeController();

		agentKnowledgeService.uploadFiles.mockResolvedValue([
			{
				file: fakeFileDto({ id: 'file-1', mimeType: 'application/pdf', fileSizeBytes: 2048 }),
				contentHash: 'a'.repeat(64),
			},
			{ file: fakeFileDto({ id: 'file-2', mimeType: 'text/csv', fileSizeBytes: 512 }) },
		]);

		const response = await controller.uploadFiles(
			fakeUploadRequest(),
			mock<Response>(),
			'project-1',
			'agent-1',
		);
		expect(response).toEqual([
			fakeFileDto({ id: 'file-1', mimeType: 'application/pdf', fileSizeBytes: 2048 }),
			fakeFileDto({ id: 'file-2', mimeType: 'text/csv', fileSizeBytes: 512 }),
		]);
		const payload = telemetry.track.mock.calls[0][1];
		expect(
			TELEMETRY_EVENT.AGENTS.USER_UPLOADED_AGENT_KNOWLEDGE_FILES.properties.safeParse(payload)
				.success,
		).toBe(true);

		expect(telemetry.track).toHaveBeenCalledTimes(1);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_UPLOADED_AGENT_KNOWLEDGE_FILES,
			{
				agent_id: 'agent-1',
				project_id: 'project-1',
				user_id: 'user-1',
				file_count: 2,
				total_bytes: 2048 + 512,
				files: [
					{ mime_type: 'application/pdf', size_bytes: 2048, content_hash: 'a'.repeat(64) },
					{ mime_type: 'text/csv', size_bytes: 512 },
				],
			},
		);
	});

	it.each([
		['the upload has no files', { files: [] }],
		['multer rejects the upload', { fileUploadError: new multer.MulterError('LIMIT_FILE_SIZE') }],
	])('does not send the upload event when %s', async (_case, overrides) => {
		const { controller, telemetry } = makeController();

		await expect(
			controller.uploadFiles(
				fakeUploadRequest(overrides),
				mock<Response>(),
				'project-1',
				'agent-1',
			),
		).rejects.toThrow(BadRequestError);

		expect(telemetry.track).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_UPLOADED_AGENT_KNOWLEDGE_FILES,
			expect.anything(),
		);
	});

	it('does not send the upload event when storing the files fails', async () => {
		const { controller, agentKnowledgeService, telemetry } = makeController();

		agentKnowledgeService.uploadFiles.mockRejectedValue(
			new BadRequestError('Knowledge base limit reached'),
		);

		await expect(
			controller.uploadFiles(fakeUploadRequest(), mock<Response>(), 'project-1', 'agent-1'),
		).rejects.toThrow(BadRequestError);

		expect(telemetry.track).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_UPLOADED_AGENT_KNOWLEDGE_FILES,
			expect.anything(),
		);
	});

	describe('failed uploads', () => {
		function expectFailureEvent(
			telemetry: Mocked<Telemetry>,
			fileCount: number,
			reason: AgentKnowledgeUploadFailureReason | 'unknown',
		) {
			expect(telemetry.track).toHaveBeenCalledTimes(1);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_FAILED_AGENT_KNOWLEDGE_UPLOAD,
				{
					stage: 'server',
					agent_id: 'agent-1',
					project_id: 'project-1',
					user_id: 'user-1',
					file_count: fileCount,
					reason,
				},
			);
		}

		it.each([
			['LIMIT_FILE_SIZE', 'files', 'file_size'],
			['LIMIT_UNEXPECTED_FILE', 'files', 'too_many_files'],
			['LIMIT_UNEXPECTED_FILE', 'attachments', 'unknown'],
			['LIMIT_PART_COUNT', undefined, 'unknown'],
		] as const)('reports the multer code %s on field %s as %s', async (code, field, reason) => {
			const { controller, telemetry } = makeController();

			await expect(
				controller.uploadFiles(
					fakeUploadRequest({ fileUploadError: new multer.MulterError(code, field) }),
					mock<Response>(),
					'project-1',
					'agent-1',
				),
			).rejects.toThrow(BadRequestError);

			expectFailureEvent(telemetry, 1, reason);
		});

		it('reports a rejected file type with its reason', async () => {
			const { controller, telemetry } = makeController();
			const fileUploadError = new AgentKnowledgeUploadError('Only CSV…', 'file_type');

			await expect(
				controller.uploadFiles(
					fakeUploadRequest({ fileUploadError }),
					mock<Response>(),
					'project-1',
					'agent-1',
				),
			).rejects.toBe(fileUploadError);

			expectFailureEvent(telemetry, 1, 'file_type');
		});

		it('reports an upload without files as unknown', async () => {
			const { controller, telemetry } = makeController();

			await expect(
				controller.uploadFiles(
					fakeUploadRequest({ files: [] }),
					mock<Response>(),
					'project-1',
					'agent-1',
				),
			).rejects.toThrow('No files uploaded');

			expectFailureEvent(telemetry, 0, 'unknown');
		});

		it.each([
			[
				'a check of the service',
				new AgentKnowledgeUploadError('exists', 'duplicate_name'),
				'duplicate_name',
			],
			['an unexpected error', new Error('disk full'), 'unknown'],
		] as const)('reports %s', async (_case, error, reason) => {
			const { controller, agentKnowledgeService, telemetry } = makeController();
			agentKnowledgeService.uploadFiles.mockRejectedValue(error);

			await expect(
				controller.uploadFiles(fakeUploadRequest(), mock<Response>(), 'project-1', 'agent-1'),
			).rejects.toBe(error);

			expectFailureEvent(telemetry, 1, reason);
		});

		it('does not report a missing agent', async () => {
			const { controller, agentKnowledgeService, telemetry } = makeController();
			agentKnowledgeService.uploadFiles.mockRejectedValue(new NotFoundError('Agent not found'));

			await expect(
				controller.uploadFiles(fakeUploadRequest(), mock<Response>(), 'project-1', 'agent-1'),
			).rejects.toThrow(NotFoundError);

			expect(telemetry.track).not.toHaveBeenCalled();
		});

		it('does not report an upload when the knowledge base is disabled', async () => {
			const { controller, telemetry } = makeController({
				knowledgeAvailabilityService: makeKnowledgeAvailabilityService({ isSandboxEnabled: false }),
			});

			await expect(
				controller.uploadFiles(fakeUploadRequest(), mock<Response>(), 'project-1', 'agent-1'),
			).rejects.toThrow(NotFoundError);

			expect(telemetry.track).not.toHaveBeenCalled();
		});
	});
});

describe('AgentKnowledgeController file deletion', () => {
	it('deletes the file and clears runtime cache', async () => {
		const { controller, agentKnowledgeService, runtimeCacheService } = makeController();

		await expect(
			controller.deleteFile(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
				} as never,
				undefined as never,
				'project-1',
				'agent-1',
				'file-1',
			),
		).resolves.toEqual({ success: true });

		expect(agentKnowledgeService.deleteFile).toHaveBeenCalledWith('agent-1', 'project-1', 'file-1');
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith('agent-1');
	});

	it('reports the removal when a file is deleted', async () => {
		const { controller, agentKnowledgeService, telemetry } = makeController();
		agentKnowledgeService.deleteFile.mockResolvedValue(true);

		await controller.deleteFile(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			undefined as never,
			'project-1',
			'agent-1',
			'file-1',
		);

		expect(telemetry.track).toHaveBeenCalledTimes(1);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_REMOVED_AGENT_KNOWLEDGE,
			{
				agent_id: 'agent-1',
				project_id: 'project-1',
				user_id: 'user-1',
			},
		);
	});

	it('does not report a removal when the agent has no such file', async () => {
		const { controller, agentKnowledgeService, telemetry } = makeController();
		agentKnowledgeService.deleteFile.mockResolvedValue(false);

		await controller.deleteFile(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			undefined as never,
			'project-1',
			'agent-1',
			'missing-file',
		);

		expect(telemetry.track).not.toHaveBeenCalled();
	});
});

describe('AgentKnowledgeController knowledge base gating', () => {
	it.each([
		{ reason: 'the sandbox is disabled', availability: { isSandboxEnabled: false } },
		{ reason: 'the knowledge module is inactive', availability: { isKnowledgeActive: false } },
	])('returns not found for file endpoints when $reason', async ({ availability }) => {
		const { controller, agentKnowledgeService } = makeController({
			knowledgeAvailabilityService: makeKnowledgeAvailabilityService(availability),
		});

		await expect(
			controller.listFiles(
				{ params: { projectId: 'project-1' } } as never,
				undefined as never,
				'project-1',
				'agent-1',
			),
		).rejects.toThrow(NotFoundError);
		await expect(
			controller.uploadFiles(
				{ params: { projectId: 'project-1' }, files: [] } as never,
				undefined as never,
				'project-1',
				'agent-1',
			),
		).rejects.toThrow(NotFoundError);
		await expect(
			controller.deleteFile(
				{ params: { projectId: 'project-1' } } as never,
				undefined as never,
				'project-1',
				'agent-1',
				'file-1',
			),
		).rejects.toThrow(NotFoundError);
		expect(agentKnowledgeService.listFiles).not.toHaveBeenCalled();
		expect(agentKnowledgeService.uploadFiles).not.toHaveBeenCalled();
		expect(agentKnowledgeService.deleteFile).not.toHaveBeenCalled();
	});
});
