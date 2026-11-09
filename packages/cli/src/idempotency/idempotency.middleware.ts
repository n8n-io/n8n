import { isAuthenticatedRequest } from '@n8n/db';
import type { Request, RequestHandler, Response } from 'express';

import {
	honorsIdempotencyKey,
	parseIdempotencyKey,
	requestFingerprint,
} from '@/idempotency/idempotency-request';
import type { IdempotencyClaim, IdempotencyStore } from '@/idempotency/idempotency.types';

export const IDEMPOTENCY_KEY_INVALID_MESSAGE =
	'Idempotency-Key must be 1 to 128 visible ASCII characters.';

export const IDEMPOTENCY_KEY_IN_PROGRESS_MESSAGE =
	'A request with this Idempotency-Key is already in progress.';

export const IDEMPOTENCY_KEY_MISMATCH_MESSAGE =
	'This Idempotency-Key was already used with a different request.';

const IDEMPOTENCY_CLAIM_LOCAL = 'idempotencyClaimId';

export function createIdempotencyMiddleware(store: IdempotencyStore): RequestHandler {
	return async (req, res, next) => {
		try {
			const key = idempotencyKeyFor(req, res);
			if (!key) {
				if (!res.headersSent) next();
				return;
			}

			const claim = await store.claim({
				userId: key.userId,
				idempotencyKey: key.value,
				fingerprint: requestFingerprint(req),
			});

			applyClaim(res, claim, () => next());
		} catch (error) {
			if (res.headersSent) return;
			next(error);
		}
	};
}

export function takeIdempotencyClaimId(res: Response): string | undefined {
	const id = res.locals[IDEMPOTENCY_CLAIM_LOCAL];
	if (typeof id !== 'string') return undefined;

	delete res.locals[IDEMPOTENCY_CLAIM_LOCAL];
	return id;
}

function idempotencyKeyFor(
	req: Request,
	res: Response,
): { userId: string; value: string } | undefined {
	if (!isAuthenticatedRequest(req)) return undefined;
	if (!honorsIdempotencyKey(req.method, req.originalUrl || req.url)) return undefined;

	const parsed = parseIdempotencyKey(req.headers['idempotency-key']);
	if (parsed.kind === 'absent') return undefined;
	if (parsed.kind === 'invalid') {
		res.status(400).json({ message: IDEMPOTENCY_KEY_INVALID_MESSAGE });
		return undefined;
	}

	return { userId: req.user.id, value: parsed.value };
}

function applyClaim(res: Response, claim: IdempotencyClaim, onClaimed: () => void): void {
	switch (claim.outcome) {
		case 'replay':
			sendStored(res, claim.responseStatus, claim.responseBody);
			return;
		case 'processing':
			res.status(409).json({ message: IDEMPOTENCY_KEY_IN_PROGRESS_MESSAGE });
			return;
		case 'mismatch':
			res.status(422).json({ message: IDEMPOTENCY_KEY_MISMATCH_MESSAGE });
			return;
		case 'claimed':
			res.locals[IDEMPOTENCY_CLAIM_LOCAL] = claim.id;
			onClaimed();
			return;
	}
}

function sendStored(res: Response, status: number, body: unknown): void {
	if (status === 204 || body === null) {
		res.status(status).send();
		return;
	}

	res.status(status).json(body);
}
