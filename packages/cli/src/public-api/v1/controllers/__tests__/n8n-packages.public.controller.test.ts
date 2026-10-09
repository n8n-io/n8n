import { ExportPackageRequestDto } from '@n8n/api-types';
import type { EventService } from '@n8n/backend-services';
import type { AuthenticatedRequest } from '@n8n/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Response } from 'express';
import { UserError } from 'n8n-workflow';
import { Readable, Writable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import type { RelayEventMap } from '@/events/maps/relay.event-map';
import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
	PackageExportBlockedError,
} from '@/modules/n8n-packages/entities/package-export.errors';
import type { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';

import { N8nPackagesPublicController } from '../n8n-packages.public.controller';

const EXPORT_COUNTS = {
	workflows: 2,
	folders: 1,
	credentials: 0,
	dataTables: 0,
	variables: 0,
	tags: 0,
};

const DEFAULT_SERVICE_OPTIONS = {
	user: { id: 'user-1' },
	workflowIds: [],
	folderIds: [],
	projectIds: [],
	includeVariableValues: true,
	canExportVariableValues: false,
	includeTags: true,
	missingWorkflowDependencyPolicy: 'fail',
	workflowVersionPolicy: 'latest',
	credentialExportPolicy: 'expression-values-only',
	includeArchivedWorkflows: false,
};

describe('N8nPackagesPublicController', () => {
	let controller: N8nPackagesPublicController;
	const mockService = mock<N8nPackagesService>();
	const mockEventService = mock<EventService>();

	function makeRequest(apiKeyScopes?: string[]) {
		return {
			user: { id: 'user-1' },
			tokenGrant: apiKeyScopes ? { apiKeyScopes } : undefined,
		} as unknown as AuthenticatedRequest;
	}

	// A writable sink, so `pipeline` in the controller can complete.
	function makeResponse() {
		const res = new Writable({
			write(_chunk, _encoding, callback) {
				callback();
			},
		}) as unknown as Response & Writable;
		res.setHeader = vi.fn().mockReturnValue(res);
		return res;
	}

	function mockExportStream() {
		mockService.exportPackage.mockResolvedValue({
			stream: Readable.from([Buffer.from('package-bytes')]),
			counts: EXPORT_COUNTS,
		});
	}

	async function runAndCatch(
		body: Record<string, unknown>,
		apiKeyScopes?: string[],
		res: Response = makeResponse(),
	) {
		try {
			await controller.exportPackage(
				makeRequest(apiKeyScopes),
				res,
				ExportPackageRequestDto.parse(body),
			);
			return undefined;
		} catch (error) {
			return error;
		}
	}

	function emittedEvent(name: 'n8n-package-export-failed' | 'n8n-package-import-failed') {
		const call = mockEventService.emit.mock.calls.find(([eventName]) => eventName === name);
		return call?.[1] as RelayEventMap[typeof name] | undefined;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		mockService.exportPackage.mockReset();
		controller = new N8nPackagesPublicController(mockService, mockEventService);
	});

	describe('exportPackage', () => {
		it('throws BadRequestError when both workflowIds and projectIds are provided', async () => {
			const caught = await runAndCatch({ workflowIds: ['wf-1'], projectIds: ['project-1'] }, [
				'workflow:export',
				'project:export',
			]);

			expect(caught).toBeInstanceOf(BadRequestError);
			expect(caught).toMatchObject({
				message: 'Provide either workflowIds/folderIds or projectIds, not both',
			});
			expect(mockService.exportPackage).not.toHaveBeenCalled();
		});

		it('throws BadRequestError when folderIds and projectIds are both provided', async () => {
			const caught = await runAndCatch({ folderIds: ['fld-1'], projectIds: ['project-1'] }, [
				'workflow:export',
				'project:export',
			]);

			expect(caught).toBeInstanceOf(BadRequestError);
			expect(caught).toMatchObject({
				message: 'Provide either workflowIds/folderIds or projectIds, not both',
			});
			expect(mockService.exportPackage).not.toHaveBeenCalled();
		});

		it('throws BadRequestError when neither workflowIds, folderIds nor projectIds are provided', async () => {
			const caught = await runAndCatch({}, ['workflow:export']);

			expect(caught).toBeInstanceOf(BadRequestError);
			expect(caught).toMatchObject({
				message: 'At least one workflowId, folderId, or projectId is required',
			});
			expect(mockService.exportPackage).not.toHaveBeenCalled();
		});

		it('throws ForbiddenError when the API key carries no scopes', async () => {
			const caught = await runAndCatch({ workflowIds: ['wf-1'] });

			expect(caught).toBeInstanceOf(ForbiddenError);
			expect(mockService.exportPackage).not.toHaveBeenCalled();
			expect(emittedEvent('n8n-package-export-failed')).toMatchObject({
				reason: 'access-denied',
				workflowIds: ['wf-1'],
			});
		});

		it('throws ForbiddenError when exporting workflows without workflow:export scope', async () => {
			const caught = await runAndCatch({ workflowIds: ['wf-1'] }, ['project:export']);

			expect(caught).toBeInstanceOf(ForbiddenError);
			expect(mockService.exportPackage).not.toHaveBeenCalled();
		});

		it('throws ForbiddenError when exporting projects without project:export scope', async () => {
			const caught = await runAndCatch({ projectIds: ['project-1'] }, ['workflow:export']);

			expect(caught).toBeInstanceOf(ForbiddenError);
			expect(mockService.exportPackage).not.toHaveBeenCalled();
		});

		it('throws ForbiddenError when exporting folders without workflow:export scope', async () => {
			const caught = await runAndCatch({ folderIds: ['fld-1'] }, ['project:export']);

			expect(caught).toBeInstanceOf(ForbiddenError);
			expect(mockService.exportPackage).not.toHaveBeenCalled();
		});

		it('does not reject upfront without variable:list scope; forwards canExportVariableValues=false for the service to enforce', async () => {
			mockExportStream();

			const caught = await runAndCatch({ workflowIds: ['wf-1'] }, ['workflow:export']);

			expect(caught).toBeUndefined();
			expect(mockService.exportPackage).toHaveBeenCalledWith({
				...DEFAULT_SERVICE_OPTIONS,
				workflowIds: ['wf-1'],
			});
		});

		it('allows value-less export without variable:list scope', async () => {
			mockExportStream();

			const caught = await runAndCatch({ workflowIds: ['wf-1'], includeVariableValues: false }, [
				'workflow:export',
			]);

			expect(caught).toBeUndefined();
			expect(mockService.exportPackage).toHaveBeenCalledWith({
				...DEFAULT_SERVICE_OPTIONS,
				workflowIds: ['wf-1'],
				includeVariableValues: false,
			});
		});

		it('propagates the ForbiddenError thrown by the service scope gate and emits access-denied', async () => {
			mockService.exportPackage.mockRejectedValue(
				new ForbiddenError('missing the variable:list scope'),
			);

			const caught = await runAndCatch({ workflowIds: ['wf-1'] }, ['workflow:export']);

			expect(caught).toBeInstanceOf(ForbiddenError);
			expect(emittedEvent('n8n-package-export-failed')).toMatchObject({
				reason: 'access-denied',
				workflowIds: ['wf-1'],
			});
		});

		it('emits n8n-package-export-failed with reason=entity-not-found when the service rejects with NotFoundError', async () => {
			mockService.exportPackage.mockRejectedValue(new NotFoundError('not found'));

			await runAndCatch({ workflowIds: ['wf-1'] }, ['workflow:export', 'variable:list']);

			expect(emittedEvent('n8n-package-export-failed')).toEqual({
				user: { id: 'user-1' },
				reason: 'entity-not-found',
				workflowIds: ['wf-1'],
			});
		});

		it('emits n8n-package-export-failed with reason=blocked when the service rejects a blocked export', async () => {
			mockService.exportPackage.mockRejectedValue(new PackageExportBlockedError('Export blocked'));

			await runAndCatch({ workflowIds: ['wf-1'] }, ['workflow:export', 'variable:list']);

			expect(emittedEvent('n8n-package-export-failed')).toEqual({
				user: { id: 'user-1' },
				reason: 'blocked',
				workflowIds: ['wf-1'],
			});
		});

		it.each([
			[
				'access-denied',
				new PackageEntityAccessDeniedError('workflows denied', { description: 'x' }),
			],
			[
				'entity-not-found',
				new PackageEntityNotFoundError('workflows missing', { description: 'y' }),
			],
		])(
			'rethrows %s as a generic UserError with the same message, hiding which case occurred',
			async (reason, thrownError) => {
				mockService.exportPackage.mockRejectedValue(thrownError);

				const caught = await runAndCatch({ workflowIds: ['wf-1'] }, [
					'workflow:export',
					'variable:list',
				]);

				expect(caught).toBeInstanceOf(UserError);
				expect(caught).not.toBeInstanceOf(PackageEntityAccessDeniedError);
				expect(caught).not.toBeInstanceOf(PackageEntityNotFoundError);
				expect(caught).toMatchObject({ message: thrownError.message });
				expect(emittedEvent('n8n-package-export-failed')).toMatchObject({ reason });
			},
		);

		it('does not emit n8n-package-export-failed when the client closes the connection mid-stream', async () => {
			const prematureClose = Object.assign(new Error('Premature close'), {
				code: 'ERR_STREAM_PREMATURE_CLOSE',
			});
			const stream = new Readable({
				read() {
					this.destroy(prematureClose);
				},
			});
			mockService.exportPackage.mockResolvedValue({ stream, counts: EXPORT_COUNTS });

			const caught = await runAndCatch({ workflowIds: ['wf-1'] }, [
				'workflow:export',
				'variable:list',
			]);

			expect(caught).toBeUndefined();
			expect(mockEventService.emit).not.toHaveBeenCalled();
		});

		it('streams the export for a valid workflow request', async () => {
			mockExportStream();
			const res = makeResponse();

			const caught = await runAndCatch(
				{ workflowIds: ['wf-1', 'wf-2'] },
				['workflow:export', 'variable:list'],
				res,
			);

			expect(caught).toBeUndefined();
			expect(mockService.exportPackage).toHaveBeenCalledWith({
				...DEFAULT_SERVICE_OPTIONS,
				workflowIds: ['wf-1', 'wf-2'],
				canExportVariableValues: true,
			});
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				'attachment; filename="export.n8np"',
			);
			expect(res.setHeader).toHaveBeenCalledWith(
				'X-N8n-Export-Counts',
				JSON.stringify(EXPORT_COUNTS),
			);
			expect(res.setHeader).toHaveBeenCalledWith(
				'Access-Control-Expose-Headers',
				'X-N8n-Export-Counts',
			);
			expect(mockEventService.emit).not.toHaveBeenCalled();
		});

		it('forwards a non-default missing workflow dependency policy', async () => {
			mockExportStream();

			const caught = await runAndCatch(
				{ workflowIds: ['wf-1'], missingWorkflowDependencyPolicy: 'reference-only' },
				['workflow:export'],
			);

			expect(caught).toBeUndefined();
			expect(mockService.exportPackage).toHaveBeenCalledWith({
				...DEFAULT_SERVICE_OPTIONS,
				workflowIds: ['wf-1'],
				missingWorkflowDependencyPolicy: 'reference-only',
			});
		});

		it('forwards a non-default workflow version policy', async () => {
			mockExportStream();

			const caught = await runAndCatch(
				{ workflowIds: ['wf-1'], workflowVersionPolicy: 'published-strict' },
				['workflow:export'],
			);

			expect(caught).toBeUndefined();
			expect(mockService.exportPackage).toHaveBeenCalledWith(
				expect.objectContaining({ workflowVersionPolicy: 'published-strict' }),
			);
		});

		it('forwards a non-default credential export policy', async () => {
			mockExportStream();

			const caught = await runAndCatch(
				{ workflowIds: ['wf-1'], credentialExportPolicy: 'no-values' },
				['workflow:export'],
			);

			expect(caught).toBeUndefined();
			expect(mockService.exportPackage).toHaveBeenCalledWith(
				expect.objectContaining({ credentialExportPolicy: 'no-values' }),
			);
		});

		it('forwards includeArchivedWorkflows', async () => {
			mockExportStream();

			const caught = await runAndCatch({ workflowIds: ['wf-1'], includeArchivedWorkflows: true }, [
				'workflow:export',
			]);

			expect(caught).toBeUndefined();
			expect(mockService.exportPackage).toHaveBeenCalledWith(
				expect.objectContaining({ includeArchivedWorkflows: true }),
			);
		});

		it('streams the export for a valid project request', async () => {
			mockExportStream();

			const caught = await runAndCatch({ projectIds: ['project-1'] }, [
				'project:export',
				'variable:list',
			]);

			expect(caught).toBeUndefined();
			expect(mockService.exportPackage).toHaveBeenCalledWith({
				...DEFAULT_SERVICE_OPTIONS,
				projectIds: ['project-1'],
				canExportVariableValues: true,
			});
		});

		it('streams the export for a valid folder request', async () => {
			mockExportStream();

			const caught = await runAndCatch({ folderIds: ['fld-1'] }, [
				'workflow:export',
				'variable:list',
			]);

			expect(caught).toBeUndefined();
			expect(mockService.exportPackage).toHaveBeenCalledWith({
				...DEFAULT_SERVICE_OPTIONS,
				folderIds: ['fld-1'],
				canExportVariableValues: true,
			});
		});

		it('forwards includeVariableValues=false to the service', async () => {
			mockExportStream();

			const caught = await runAndCatch({ workflowIds: ['wf-1'], includeVariableValues: false }, [
				'workflow:export',
			]);

			expect(caught).toBeUndefined();
			expect(mockService.exportPackage).toHaveBeenCalledWith({
				...DEFAULT_SERVICE_OPTIONS,
				workflowIds: ['wf-1'],
				includeVariableValues: false,
			});
		});

		it('forwards includeTags=false to the service', async () => {
			mockExportStream();

			const caught = await runAndCatch({ workflowIds: ['wf-1'], includeTags: false }, [
				'workflow:export',
			]);

			expect(caught).toBeUndefined();
			expect(mockService.exportPackage).toHaveBeenCalledWith({
				...DEFAULT_SERVICE_OPTIONS,
				workflowIds: ['wf-1'],
				includeTags: false,
			});
		});
	});
});
