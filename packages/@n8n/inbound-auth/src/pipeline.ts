import type { ProtectedResourceRef } from '@n8n/permissions';

import type { TrustedSource } from './trusted-source';
import type { SurfaceId } from './trusted-source-config';

/** Stamped by the surface, never by the caller. */
export type Inbound = {
	surface: SurfaceId;
	resource: ProtectedResourceRef;
	/** A trigger's selected source narrows the set of sources accepted on the surface. */
	acceptedSourceIds?: string[];
	request: {
		method: string;
		url: string;
		headers: Readonly<Record<string, string | string[] | undefined>>;
		ip: string;
	};
	receivedAt: Date;
};

/** A union: more kinds (API key, signed request) are added here, not on the pipeline. */
export type Credential = { kind: 'bearer'; token: string };

export type Extracted = Inbound & { credential: Credential };

/** The token does not travel past authentication, so no later step can leak it. */
export type Verified = Omit<Extracted, 'credential'> & {
	credentialKind: Credential['kind'];
	source: TrustedSource;
	claims: Readonly<Record<string, unknown>>;
	expiresAt: Date;
};

/** Closed: this is the vocabulary of the log line and of the 401 description. */
export type RejectReason =
	| 'no-credential'
	| 'malformed-credential'
	| 'unknown-issuer'
	| 'source-not-accepted'
	| 'source-unusable'
	| 'signature-invalid'
	| 'expired'
	| 'audience-mismatch'
	| 'not-an-access-token'
	| 'unknown-subject'
	| 'binding-inactive'
	| 'link-refused'
	| 'provision-refused'
	| 'no-role';

export type Reject = { ok: false; reason: RejectReason; detail?: string };
export type Ok<T> = { ok: true; value: T };
export type Result<T> = Ok<T> | Reject;
