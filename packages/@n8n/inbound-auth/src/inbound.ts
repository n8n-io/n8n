import type { ProtectedResource } from './contracts';
import type { Extracted, Inbound, Result } from './pipeline';

/** Derives `Inbound` from the resource, so a surface integration cannot stamp it wrong. */
export function inboundFrom(resource: ProtectedResource, request: Inbound['request']): Inbound {
	const acceptedSourceIds = resource.getAcceptedSourceIds?.();
	const grant = resource.getGrant?.();
	return {
		surface: resource.surface,
		resource: { url: resource.getResourceUrl(), acceptedAudiences: resource.getAudiences() },
		...(acceptedSourceIds !== undefined && { acceptedSourceIds }),
		...(grant !== undefined && { grant }),
		request,
		receivedAt: new Date(),
	};
}

// RFC 9110: the scheme is case-insensitive; the token is the rest, without surrounding blanks.
const BEARER = /^bearer\s+(\S+)\s*$/i;

/** Extraction belongs to the surface; this is the shared parser for the `Authorization: Bearer` case. */
export function extractBearer(inbound: Inbound): Result<Extracted> {
	const entry = Object.entries(inbound.request.headers).find(
		([name]) => name.toLowerCase() === 'authorization',
	);
	const header = Array.isArray(entry?.[1]) ? entry[1][0] : entry?.[1];
	if (header === undefined) return { ok: false, reason: 'no-credential' };

	const token = BEARER.exec(header)?.[1];
	if (token === undefined) return { ok: false, reason: 'malformed-credential' };

	return { ok: true, value: { ...inbound, credential: { kind: 'bearer', token } } };
}
