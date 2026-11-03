import type { IRestApiContext } from '../../types';
import * as utils from '../../utils';
import { exportReport, notifyFindingOwners, updateFindingStatuses } from '../breaking-changes';

// Keep the error class real: the export test builds one.
vi.mock('../../utils', async (importOriginal) => ({
	...(await importOriginal<typeof utils>()),
	makeRestApiRequest: vi.fn(),
	requestResponse: vi.fn(),
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
	const restContext = {
		baseUrl: 'http://localhost:5678/rest',
		pushRef: 'push-1',
	} as IRestApiContext;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	function csvResponse(blob: Blob, contentDisposition?: string) {
		return {
			data: blob,
			headers: contentDisposition ? { 'content-disposition': contentDisposition } : {},
		} as unknown as Awaited<ReturnType<typeof utils.requestResponse>>;
	}

	it('requests the CSV as a blob through the shared helper and returns it with the server file name', async () => {
		const blob = new Blob(['target_version\r\n'], { type: 'text/csv' });
		vi.mocked(utils.requestResponse).mockResolvedValueOnce(
			csvResponse(blob, 'attachment; filename="migration-report-v3-2026-10-20.csv"'),
		);

		const result = await exportReport(restContext, { version: 'v3' });

		expect(result).toEqual({ blob, filename: 'migration-report-v3-2026-10-20.csv' });
		expect(utils.requestResponse).toHaveBeenCalledWith({
			method: 'GET',
			baseURL: 'http://localhost:5678/rest',
			endpoint: '/breaking-changes/report/export',
			headers: { 'push-ref': 'push-1' },
			data: { version: 'v3' },
			responseType: 'blob',
		});
	});

	it('falls back to a fixed file name when the server names none', async () => {
		vi.mocked(utils.requestResponse).mockResolvedValueOnce(csvResponse(new Blob()));

		const result = await exportReport(restContext);

		expect(result.filename).toBe('migration-report.csv');
	});

	it('lets the shared helper surface a refused export', async () => {
		const error = new utils.ResponseError('Forbidden', { httpStatusCode: 403 });
		vi.mocked(utils.requestResponse).mockRejectedValueOnce(error);

		await expect(exportReport(restContext)).rejects.toBe(error);
	});
});
