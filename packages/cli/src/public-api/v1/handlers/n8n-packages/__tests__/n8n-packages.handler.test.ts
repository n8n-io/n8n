import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { PassThrough } from 'node:stream';
import type { Mocked } from 'vitest';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
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
// exportPackage = [publicApiCompositeScope(...), businessLogic]; index 1 is the handler under test.
let exportPackage: (...args: unknown[]) => unknown;

beforeAll(async () => {
	handler = (await import('../n8n-packages.handler')) as unknown as typeof handler;
	exportPackage = handler.exportPackage[1];
});

describe('n8n-packages handler', () => {
	let mockService: Mocked<N8nPackagesService>;

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

	beforeEach(() => {
		vi.clearAllMocks();
		mockService = mockInstance(N8nPackagesService);

		vi.spyOn(Container, 'get').mockImplementation((serviceClass) => {
			if (
				serviceClass === N8nPackagesService ||
				(typeof serviceClass === 'function' && serviceClass.name === 'N8nPackagesService')
			) {
				return mockService;
			}
			return {} as never;
		});
	});

	it('throws BadRequestError when the payload fails DTO validation', async () => {
		const caught = await run(
			makeRequest({ workflowIds: [''] }, ['workflow:export']),
			makeResponse(),
		);

		expect(caught).toBeInstanceOf(BadRequestError);
		expect(mockService.exportPackage).not.toHaveBeenCalled();
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
	});

	it('streams the export for a valid project request', async () => {
		const stream = new PassThrough();
		mockService.exportPackage.mockResolvedValue(stream);
		const res = makeResponse();

		const resultPromise = run(makeRequest({ projectIds: ['project-1'] }, ['project:export']), res);
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
