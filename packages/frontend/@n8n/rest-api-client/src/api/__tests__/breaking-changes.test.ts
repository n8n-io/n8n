import type { IRestApiContext } from '../../types';
import * as utils from '../../utils';
import { exportReport, notifyFindingOwners, updateFindingStatuses } from '../breaking-changes';

// Keep the error class real: the export throws it, and the test inspects it.
vi.mock('../../utils', async (importOriginal) => ({
	...(await importOriginal<typeof utils>()),
	makeRestApiRequest: vi.fn(),
}));

const context = {} as IRestApiContext;

describe('updateFindingStatuses', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('sends a PATCH to the rule workflows endpoint with the workflow IDs and status', async () => {
		vi.mocked(utils.makeRestApiRequest).mockResolvedValueOnce(undefined);

		await updateFindingStatuses(context, 'removed-nodes-v3', ['wf-1', 'wf-2'], 'wont_fix');

		expect(utils.makeRestApiRequest).toHaveBeenCalledTimes(1);
		expect(utils.makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'PATCH',
			'/breaking-changes/report/removed-nodes-v3/workflows',
			{ workflowIds: ['wf-1', 'wf-2'], status: 'wont_fix' },
		);
	});
});

describe('notifyFindingOwners', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('sends a POST to the notify endpoint with the workflow IDs and returns the result', async () => {
		const expected = { notifiedWorkflowIds: ['wf-1'], skipped: [] };
		vi.mocked(utils.makeRestApiRequest).mockResolvedValueOnce(expected);

		const result = await notifyFindingOwners(context, 'removed-nodes-v3', ['wf-1']);

		expect(result).toBe(expected);
		expect(utils.makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'POST',
			'/breaking-changes/report/removed-nodes-v3/workflows/notify',
			{ workflowIds: ['wf-1'] },
		);
	});
});

describe('exportReport', () => {
	const fetchMock = vi.fn();
	const restContext = { baseUrl: 'http://localhost:5678/rest' } as IRestApiContext;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal('fetch', fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function okResponse(blob: Blob, contentDisposition?: string) {
		return {
			ok: true,
			headers: new Headers(contentDisposition ? { 'Content-Disposition': contentDisposition } : {}),
			blob: async () => blob,
		};
	}

	it('fetches the CSV export with the version and returns the body with the server file name', async () => {
		const blob = new Blob(['target_version\r\n'], { type: 'text/csv' });
		fetchMock.mockResolvedValueOnce(
			okResponse(blob, 'attachment; filename="migration-report-v3-2026-10-20.csv"'),
		);

		const result = await exportReport(restContext, { version: 'v3' });

		expect(result).toEqual({ blob, filename: 'migration-report-v3-2026-10-20.csv' });
		expect(fetchMock).toHaveBeenCalledWith(
			'http://localhost:5678/rest/breaking-changes/report/export?version=v3',
			expect.objectContaining({ method: 'GET', credentials: 'include' }),
		);
	});

	it('falls back to a fixed file name when the server names none', async () => {
		fetchMock.mockResolvedValueOnce(okResponse(new Blob()));

		const result = await exportReport(restContext);

		expect(result.filename).toBe('migration-report.csv');
	});

	it('fetches the default version when none is given', async () => {
		fetchMock.mockResolvedValueOnce(okResponse(new Blob()));

		await exportReport(restContext);

		expect(fetchMock).toHaveBeenCalledWith(
			'http://localhost:5678/rest/breaking-changes/report/export',
			expect.anything(),
		);
	});

	it('throws the server message when the export is refused', async () => {
		fetchMock.mockResolvedValueOnce({
			ok: false,
			status: 403,
			json: async () => ({ message: 'Forbidden' }),
		});

		await expect(exportReport(restContext)).rejects.toMatchObject({
			message: 'Forbidden',
			httpStatusCode: 403,
		});
	});
});
