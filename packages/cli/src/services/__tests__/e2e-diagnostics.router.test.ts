import { mockInstance } from '@n8n/backend-test-utils';
import type { ProcessInternals } from '@n8n/api-types';
import { NotFoundError } from '@n8n/errors';
import express from 'express';
import { Readable } from 'node:stream';
import request from 'supertest';

import { createE2EDiagnosticsRouter } from '@/services/e2e-diagnostics.router';
import { HeapDiagnosticsService } from '@/services/heap-diagnostics.service';
import { ProcessInternalsService } from '@/services/process-internals.service';

describe('createE2EDiagnosticsRouter', () => {
	const heapDiagnostics = mockInstance(HeapDiagnosticsService);
	const processInternals = mockInstance(ProcessInternalsService);

	const createApp = () => express().use('/rest/e2e', createE2EDiagnosticsRouter());

	it('should serve process internals in the data envelope', async () => {
		const internals = { version: 1, instanceType: 'worker' } as ProcessInternals;
		processInternals.collect.mockReturnValue(internals);

		const response = await request(createApp()).get('/rest/e2e/internals').expect(200);

		expect(response.body).toEqual({ data: internals });
	});

	it('should run garbage collection', async () => {
		heapDiagnostics.collectGarbage.mockReturnValue({ success: true, message: 'ok' });

		const response = await request(createApp()).post('/rest/e2e/gc').expect(200);

		expect(response.body).toEqual({ data: { success: true, message: 'ok' } });
	});

	it('should write a heap snapshot and return its file name', async () => {
		heapDiagnostics.writeHeapSnapshot.mockReturnValue({
			success: true,
			filePath: 'Heap.1.heapsnapshot',
			sizeBytes: 10,
			sizeMB: 0,
		});

		const response = await request(createApp()).post('/rest/e2e/heap-snapshot').expect(200);

		expect(response.body.data).toMatchObject({ success: true, filePath: 'Heap.1.heapsnapshot' });
	});

	it('should stream a heap snapshot file', async () => {
		heapDiagnostics.openHeapSnapshot.mockReturnValue(
			Readable.from(['snapshot-bytes']) as ReturnType<HeapDiagnosticsService['openHeapSnapshot']>,
		);

		const response = await request(createApp())
			.get('/rest/e2e/heap-snapshot/Heap.1.heapsnapshot')
			.buffer(true)
			.parse((res, done) => {
				let body = '';
				res.on('data', (chunk: Buffer) => (body += chunk.toString()));
				res.on('end', () => done(null, body));
			})
			.expect(200);

		expect(heapDiagnostics.openHeapSnapshot).toHaveBeenCalledWith('Heap.1.heapsnapshot');
		expect(response.body).toBe('snapshot-bytes');
	});

	it('should return the status code of a response error', async () => {
		heapDiagnostics.openHeapSnapshot.mockImplementation(() => {
			throw new NotFoundError('Snapshot not found: missing.heapsnapshot');
		});

		await request(createApp()).get('/rest/e2e/heap-snapshot/missing.heapsnapshot').expect(404);
	});
});
