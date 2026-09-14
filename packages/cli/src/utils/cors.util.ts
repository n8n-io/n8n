import type { Request, Response } from 'express';

export interface ApplyCorsOptions {
	/** Extra header names allowed on top of `Content-Type`. */
	extraAllowedHeaders?: string[];
	/** `Access-Control-Max-Age`, in seconds. Omitted unless set. */
	maxAge?: number;
}

export function applyCors(req: Request, res: Response, options?: ApplyCorsOptions) {
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
	res.setHeader(
		'Access-Control-Allow-Headers',
		['Content-Type', ...(options?.extraAllowedHeaders ?? [])].join(', '),
	);
	if (options?.maxAge !== undefined) {
		res.setHeader('Access-Control-Max-Age', String(options.maxAge));
	}
}
