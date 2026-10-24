import { Container } from '@n8n/di';
import type { NextFunction, Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { isScimAvailable, scimOptInGate } from '../scim-opt-in';
import { ScimConfig } from '../scim.config';

describe('SCIM opt-in', () => {
	const makeRes = () => {
		const res = { status: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() };
		return res as unknown as Response & { status: typeof res.status; send: typeof res.send };
	};

	afterEach(() => {
		delete process.env.N8N_SCIM_OPT_IN;
		Container.reset();
	});

	it.each([
		[undefined, false],
		['true', true],
		['false', false],
	])('reads N8N_SCIM_OPT_IN=%j as %s', (value, expected) => {
		if (value !== undefined) process.env.N8N_SCIM_OPT_IN = value;

		expect(isScimAvailable()).toBe(expected);
	});

	it('passes the request on while the opt-in is on', () => {
		Container.get(ScimConfig).optIn = true;
		const res = makeRes();
		const next: NextFunction = vi.fn();

		scimOptInGate(mock<Request>(), res, next);

		expect(next).toHaveBeenCalledWith();
		expect(res.status).not.toHaveBeenCalled();
	});

	it('answers 404 while the opt-in is off', () => {
		const res = makeRes();
		const next: NextFunction = vi.fn();

		scimOptInGate(mock<Request>(), res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(next).not.toHaveBeenCalled();
	});
});
