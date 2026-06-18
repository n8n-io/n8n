import { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { PassThrough } from 'node:stream';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';

const handler = require('../n8n-packages.handler');

// exportPackage = [publicApiCompositeScope(...), businessLogic]; index 1 is the handler under test.
const exportPackage = handler.exportPackage[1];

describe('n8n-packages handler', () => {
	let packagesEnabled: boolean;
	let mockService: { exportPackage: jest.Mock };

	function makeRequest(
		body: { workflowIds?: string[]; projectIds?: string[] },
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
		res.setHeader = jest.fn().mockReturnValue(res);
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
		jest.clearAllMocks();
		packagesEnabled = true;
		mockService = { exportPackage: jest.fn() };

		jest.spyOn(Container, 'get').mockImplementation((serviceClass) => {
			if (serviceClass === GlobalConfig) {
				return { publicApi: { packagesEnabled } } as never;
			}
			if (serviceClass === N8nPackagesService) {
				return mockService as never;
			}
			return {} as never;
		});
	});

	it('throws NotFoundError when packages are disabled', async () => {
		packagesEnabled = false;

		const caught = await run(
			makeRequest({ workflowIds: ['wf-1'] }, ['workflow:export']),
			makeResponse(),
		);

		expect(caught).toBeInstanceOf(NotFoundError);
		expect(mockService.exportPackage).not.toHaveBeenCalled();
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
			message: 'Provide either workflowIds or projectIds, not both',
		});
		expect(mockService.exportPackage).not.toHaveBeenCalled();
	});

	it('throws BadRequestError when neither workflowIds nor projectIds are provided', async () => {
		const caught = await run(makeRequest({}, ['workflow:export']), makeResponse());

		expect(caught).toBeInstanceOf(BadRequestError);
		expect(caught).toMatchObject({
			message: 'At least one workflowId or projectId is required',
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
			projectIds: ['project-1'],
		});
	});
});
