import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { UserError } from 'n8n-workflow';
import { PassThrough } from 'node:stream';
import type { Mocked } from 'vitest';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import {
	PackageEntityAccessDeniedError,
	PackageEntityNotFoundError,
} from '@/modules/n8n-packages/entities/package-export.errors';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import * as middlewares from '@/public-api/v1/shared/middlewares/global.middleware';

const mockMiddleware = vi.fn(async (_req: unknown, _res: unknown, next: unknown) =>
	(next as () => void)(),
) as unknown as middlewares.ScopeTaggedMiddleware;
vi.spyOn(middlewares, 'publicApiCompositeScope').mockReturnValue(mockMiddleware);
vi.spyOn(middlewares, 'publicApiScope').mockReturnValue(mockMiddleware);

// Loaded after the middleware spies above are installed (the handler captures
// middleware at module-evaluation time). Typed loosely to invoke route entries.
let handler: Record<string, Array<(...args: unknown[]) => unknown>>;
// exportPackage/importPackage = [middleware(...), businessLogic]; index 1 is the handler under test.
let exportPackage: (...args: unknown[]) => unknown;
let importPackage: (...args: unknown[]) => unknown;

beforeAll(async () => {
	handler = (await import('../n8n-packages.handler')) as unknown as typeof handler;
	exportPackage = handler.exportPackage[1];
	importPackage = handler.importPackage[1];
});

describe('n8n-packages handler', () => {
	let mockService: Mocked<N8nPackagesService>;
	let mockEventService: Mocked<EventService>;

	function makeRequest(
		body: { workflowIds?: string[]; folderIds?: string[]; projectIds?: string[] },
		apiKeyScopes?: string[],
	) {
		return {
			user: { id: 'user-1' },
			body,
			tokenGrant: apiKeyScopes ? { apiKeyScopes } : undefined,
		} as unknown as AuthenticatedRequest;
	}

	function makeImportRequest(
		body: Record<string, unknown>,
		apiKeyScopes?: string[],
		files: Express.Multer.File[] = [
			{ fieldname: 'package', buffer: Buffer.from('tar-bytes') } as Express.Multer.File,
		],
	) {
		return {
			user: { id: 'user-1' },
			body: { workflowConflictPolicy: 'fail', ...body },
			files,
			tokenGrant: apiKeyScopes ? { apiKeyScopes } : undefined,
		} as unknown as AuthenticatedRequest;
	}

	function makeResponse() {
		const res = new PassThrough() as unknown as Response & PassThrough;
		res.setHeader = vi.fn().mockReturnValue(res);
		return res;
	}

	async function run(req: AuthenticatedRequest, res: Response) {
		let caught: unknown;
		try {
			await exportPackage(req, res);
		} catch (error) {
			caught = error;
		}
		return caught;
	}

	async function runImport(req: AuthenticatedRequest, res: Response) {
		let caught: unknown;
		try {
			await importPackage(req, res);
		} catch (error) {
			caught = error;
		}
		return caught;
	}

	function emittedEvent(name: 'n8n-package-export-failed' | 'n8n-package-import-failed') {
		const call = mockEventService.emit.mock.calls.find(([eventName]) => eventName === name);
		return call?.[1] as RelayEventMap[typeof name] | undefined;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		mockService = mockInstance(N8nPackagesService);
		mockEventService = mockInstance(EventService);

		vi.spyOn(Container, 'get').mockImplementation((serviceClass) => {
			if (
				serviceClass === N8nPackagesService ||
				(typeof serviceClass === 'function' && serviceClass.name === 'N8nPackagesService')
			) {
				return mockService;
			}
			if (
				serviceClass === EventService ||
				(typeof serviceClass === 'function' && serviceClass.name === 'EventService')
			) {
				return mockEventService;
			}
			return {} as never;
		});
	});

	describe('exportPackage', () => {
		it('throws BadRequestError when the payload fails DTO validation', async () => {
			const caught = await run(
				makeRequest({ workflowIds: [''] }, ['workflow:export']),
				makeResponse(),
			);

			expect(caught).toBeInstanceOf(BadRequestError);
			expect(mockService.exportPackage).not.toHaveBeenCalled();
			expect(emittedEvent('n8n-package-export-failed')).toMatchObject({ reason: 'validation' });
		});

		it('throws BadRequestError when both workflowIds and projectIds are provided', async () => {
			const caught = await run(
				makeRequest({ workflowIds: ['wf-1'], projectIds: ['project-1'] }, [
					'workflow:export',
					'project:export',
				]),
				makeResponse(),
			);

			expect(caught).toBeInstanceOf(BadRequestError);
			expect(caught).toMatchObject({
				message: 'Provide either workflowIds/folderIds or projectIds, not both',
			});
			expect(mockService.exportPackage).not.toHaveBeenCalled();
		});

		it('throws BadRequestError when folderIds and projectIds are both provided', async () => {
			const caught = await run(
				makeRequest({ folderIds: ['fld-1'], projectIds: ['project-1'] }, [
					'workflow:export',
					'project:export',
				]),
				makeResponse(),
			);

			expect(caught).toBeInstanceOf(BadRequestError);
			expect(caught).toMatchObject({
				message: 'Provide either workflowIds/folderIds or projectIds, not both',
			});
			expect(mockService.exportPackage).not.toHaveBeenCalled();
		});

		it('throws BadRequestError when neither workflowIds, folderIds nor projectIds are provided', async () => {
			const caught = await run(makeRequest({}, ['workflow:export']), makeResponse());

			expect(caught).toBeInstanceOf(BadRequestError);
			expect(caught).toMatchObject({
				message: 'At least one workflowId, folderId, or projectId is required',
			});
			expect(mockService.exportPackage).not.toHaveBeenCalled();
		});

		it('throws ForbiddenError when the API key carries no scopes', async () => {
			const caught = await run(makeRequest({ workflowIds: ['wf-1'] }), makeResponse());

			expect(caught).toBeInstanceOf(ForbiddenError);
			expect(mockService.exportPackage).not.toHaveBeenCalled();
			expect(emittedEvent('n8n-package-export-failed')).toMatchObject({
				reason: 'access-denied',
				workflowIds: ['wf-1'],
			});
		});

		it('throws ForbiddenError when exporting workflows without workflow:export scope', async () => {
			const caught = await run(
				makeRequest({ workflowIds: ['wf-1'] }, ['project:export']),
				makeResponse(),
			);

			expect(caught).toBeInstanceOf(ForbiddenError);
			expect(mockService.exportPackage).not.toHaveBeenCalled();
		});

		it('throws ForbiddenError when exporting projects without project:export scope', async () => {
			const caught = await run(
				makeRequest({ projectIds: ['project-1'] }, ['workflow:export']),
				makeResponse(),
			);

			expect(caught).toBeInstanceOf(ForbiddenError);
			expect(mockService.exportPackage).not.toHaveBeenCalled();
		});

		it('throws ForbiddenError when exporting folders without workflow:export scope', async () => {
			const caught = await run(
				makeRequest({ folderIds: ['fld-1'] }, ['project:export']),
				makeResponse(),
			);

			expect(caught).toBeInstanceOf(ForbiddenError);
			expect(mockService.exportPackage).not.toHaveBeenCalled();
		});

		it('emits n8n-package-export-failed with reason=entity-not-found when the service rejects with NotFoundError', async () => {
			mockService.exportPackage.mockRejectedValue(new NotFoundError('not found'));

			await run(makeRequest({ workflowIds: ['wf-1'] }, ['workflow:export']), makeResponse());

			expect(emittedEvent('n8n-package-export-failed')).toEqual({
				user: { id: 'user-1' },
				reason: 'entity-not-found',
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

				const caught = await run(
					makeRequest({ workflowIds: ['wf-1'] }, ['workflow:export']),
					makeResponse(),
				);

				expect(caught).toBeInstanceOf(UserError);
				expect(caught).not.toBeInstanceOf(PackageEntityAccessDeniedError);
				expect(caught).not.toBeInstanceOf(PackageEntityNotFoundError);
				expect(caught).toMatchObject({ message: thrownError.message });
				expect(emittedEvent('n8n-package-export-failed')).toMatchObject({ reason });
			},
		);

		it('streams the export for a valid workflow request', async () => {
			const stream = new PassThrough();
			mockService.exportPackage.mockResolvedValue(stream);
			const res = makeResponse();

			const resultPromise = run(
				makeRequest({ workflowIds: ['wf-1', 'wf-2'] }, ['workflow:export']),
				res,
			);
			stream.end(Buffer.from('package-bytes'));
			const caught = await resultPromise;

			expect(caught).toBeUndefined();
			expect(mockService.exportPackage).toHaveBeenCalledWith({
				user: { id: 'user-1' },
				workflowIds: ['wf-1', 'wf-2'],
				folderIds: [],
				projectIds: [],
			});
			expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/gzip');
			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				'attachment; filename="export.n8np"',
			);
			expect(mockEventService.emit).not.toHaveBeenCalled();
		});

		it('streams the export for a valid project request', async () => {
			const stream = new PassThrough();
			mockService.exportPackage.mockResolvedValue(stream);
			const res = makeResponse();

			const resultPromise = run(
				makeRequest({ projectIds: ['project-1'] }, ['project:export']),
				res,
			);
			stream.end(Buffer.from('package-bytes'));
			const caught = await resultPromise;

			expect(caught).toBeUndefined();
			expect(mockService.exportPackage).toHaveBeenCalledWith({
				user: { id: 'user-1' },
				workflowIds: [],
				folderIds: [],
				projectIds: ['project-1'],
			});
		});

		it('streams the export for a valid folder request', async () => {
			const stream = new PassThrough();
			mockService.exportPackage.mockResolvedValue(stream);
			const res = makeResponse();

			const resultPromise = run(makeRequest({ folderIds: ['fld-1'] }, ['workflow:export']), res);
			stream.end(Buffer.from('package-bytes'));
			const caught = await resultPromise;

			expect(caught).toBeUndefined();
			expect(mockService.exportPackage).toHaveBeenCalledWith({
				user: { id: 'user-1' },
				workflowIds: [],
				folderIds: ['fld-1'],
				projectIds: [],
			});
		});
	});

	describe('importPackage', () => {
		it('throws ForbiddenError and emits access-denied with the requested projectId when the API key lacks workflow:import scope', async () => {
			const caught = await runImport(
				makeImportRequest({ projectId: 'proj-brie' }, ['project:export']),
				makeResponse(),
			);

			expect(caught).toBeInstanceOf(ForbiddenError);
			expect(mockService.importPackage).not.toHaveBeenCalled();
			expect(emittedEvent('n8n-package-import-failed')).toEqual({
				user: { id: 'user-1' },
				reason: 'access-denied',
				projectId: 'proj-brie',
			});
		});

		it('throws BadRequestError and emits validation with the requested projectId when the multipart package file is missing', async () => {
			const caught = await runImport(
				makeImportRequest({ projectId: 'proj-brie' }, ['workflow:import'], []),
				makeResponse(),
			);

			expect(caught).toBeInstanceOf(BadRequestError);
			expect(emittedEvent('n8n-package-import-failed')).toEqual({
				user: { id: 'user-1' },
				reason: 'validation',
				projectId: 'proj-brie',
			});
		});

		it('throws BadRequestError and emits validation when workflowConflictPolicy is missing', async () => {
			const caught = await runImport(
				makeImportRequest({ workflowConflictPolicy: undefined }, ['workflow:import']),
				makeResponse(),
			);

			expect(caught).toBeInstanceOf(BadRequestError);
			expect(emittedEvent('n8n-package-import-failed')).toMatchObject({ reason: 'validation' });
		});

		it('emits access-denied with projectId when the service rejects the target project as forbidden', async () => {
			mockService.importPackage.mockRejectedValue(
				new ForbiddenError('You do not have permission to import workflows into this project.'),
			);

			await runImport(
				makeImportRequest({ projectId: 'proj-brie' }, ['workflow:import']),
				makeResponse(),
			);

			expect(emittedEvent('n8n-package-import-failed')).toEqual({
				user: { id: 'user-1' },
				reason: 'access-denied',
				projectId: 'proj-brie',
			});
		});

		it('emits entity-not-found with projectId when the target project does not exist', async () => {
			mockService.importPackage.mockRejectedValue(new NotFoundError('Project not found: proj-x'));

			await runImport(
				makeImportRequest({ projectId: 'proj-x' }, ['workflow:import']),
				makeResponse(),
			);

			expect(emittedEvent('n8n-package-import-failed')).toEqual({
				user: { id: 'user-1' },
				reason: 'entity-not-found',
				projectId: 'proj-x',
			});
		});

		it('emits blocked when the import is rejected as blocked by a conflict', async () => {
			mockService.importPackage.mockRejectedValue(new ConflictError('Import blocked'));

			await runImport(
				makeImportRequest({ projectId: 'proj-brie' }, ['workflow:import']),
				makeResponse(),
			);

			expect(emittedEvent('n8n-package-import-failed')).toMatchObject({ reason: 'blocked' });
		});

		it('omits projectId/folderId from the audit event when the caller never sent them', async () => {
			const caught = await runImport(
				makeImportRequest({ workflowConflictPolicy: 'not-a-real-policy' }, ['workflow:import']),
				makeResponse(),
			);

			expect(caught).toBeInstanceOf(BadRequestError);
			expect(emittedEvent('n8n-package-import-failed')).toEqual({
				user: { id: 'user-1' },
				reason: 'validation',
			});
		});

		it('imports successfully for a caller with workflow:import scope and no emitted failure event', async () => {
			const result = { package: {}, workflows: [], bindings: {}, credentials: {} };
			mockService.importPackage.mockResolvedValue(result as never);
			const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;

			const caught = await runImport(
				makeImportRequest({ projectId: 'proj-brie' }, ['workflow:import']),
				res,
			);

			expect(caught).toBeUndefined();
			expect(mockService.importPackage).toHaveBeenCalledWith(
				expect.objectContaining({ projectId: 'proj-brie', workflowConflictPolicy: 'fail' }),
			);
			expect(mockEventService.emit).not.toHaveBeenCalled();
		});
	});
});
