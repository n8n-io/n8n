import type { NextFunction, Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { scimOptInGate } from '../scim-opt-in';

describe('scimOptInGate', () => {
	const makeRes = () => {
		const res = { status: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() };
		return res as unknown as Response & { status: typeof res.status; send: typeof res.send };
	};

	afterEach(() => {
		delete process.env.N8N_ENV_FEAT_SCIM;
	});

	it('passes the request on while N8N_ENV_FEAT_SCIM is true', () => {
		process.env.N8N_ENV_FEAT_SCIM = 'true';
		const res = makeRes();
		const next: NextFunction = vi.fn();

		scimOptInGate(mock<Request>(), res, next);

		expect(next).toHaveBeenCalledWith();
		expect(res.status).not.toHaveBeenCalled();
	});

	it.each([undefined, 'false', '1'])('answers 404 while N8N_ENV_FEAT_SCIM is %j', (value) => {
		if (value !== undefined) process.env.N8N_ENV_FEAT_SCIM = value;
		const res = makeRes();
		const next: NextFunction = vi.fn();

		scimOptInGate(mock<Request>(), res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(next).not.toHaveBeenCalled();
	});
});
