import type { Response } from 'express';

import type { ExportPackageResult } from '../n8n-packages.types';

export async function streamPackageExport(
	res: Response,
	{ stream, counts }: ExportPackageResult,
): Promise<Response> {
	const countsHeader = 'X-N8n-Export-Counts';
	res.setHeader('Content-Type', 'application/gzip');
	res.setHeader('Content-Disposition', 'attachment; filename="export.n8np"');
	res.setHeader(countsHeader, JSON.stringify(counts));
	res.setHeader('Access-Control-Expose-Headers', countsHeader);

	return await new Promise<Response>((resolve, reject) => {
		stream.on('error', reject);
		res.on('finish', () => resolve(res));
		res.on('close', () => {
			if (!res.writableFinished) stream.destroy();
			resolve(res);
		});
		stream.pipe(res);
	});
}
