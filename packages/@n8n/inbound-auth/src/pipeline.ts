import type { ProtectedResourceRef, ResourceGrant } from '@n8n/permissions';

import type { TrustedSource } from './trusted-source';
import type { SurfaceId } from './trusted-source-config';

/** Stamped by the surface, never by the caller. */
export type Inbound = {
	surface: SurfaceId;
	resource: ProtectedResourceRef;
	/** A trigger's selected source narrows the set of sources accepted on the surface. */
	acceptedSourceIds?: string[];
	/** What the resource hands out to a caller. Absent when the resource issues no grant. */
	grant?: ResourceGrant;
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

/**
 * The token does not travel past authentication, so no later step can leak it. The request
 * headers stop here as well, because the credential arrived in one of them.
 */
export type Verified = Omit<Extracted, 'credential' | 'request'> & {
	request: Omit<Inbound['request'], 'headers'>;
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
	| 'user-disabled'
	| 'binding-inactive'
	| 'link-refused'
	| 'provision-refused'
	| 'no-role';

/** The caller as the trusted source describes it, before n8n looks for a matching user. */
export type ExternalIdentity = {
	subject: string;
	email?: string;
	emailVerified?: boolean;
	displayName?: string;
	clientId?: string;
	scopes: string[];
	assurance?: { acr?: string; amr?: string[]; authTime?: Date };
	raw: Readonly<Record<string, unknown>>;
};

export type Reject = { ok: false; reason: RejectReason; detail?: string };
export type Ok<T> = { ok: true; value: T };
export type Result<T> = Ok<T> | Reject;
