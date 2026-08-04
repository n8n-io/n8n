import type { Request, Response } from 'express';

export function applyCors(req: Request, res: Response) {
	if (res.getHeader('Access-Control-Allow-Origin')) {
		return;
	}

	const origin = req.headers.origin;

	if (!origin || origin === 'null') {
		res.setHeader('Access-Control-Allow-Origin', '*');
	} else {
		res.setHeader('Access-Control-Allow-Origin', origin);
	}

	res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
