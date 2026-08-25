import { Container } from '@n8n/di';
import jwt from 'jsonwebtoken';
import { InstanceSettings } from 'n8n-core';
import type { INode, IUser } from 'n8n-workflow';

/** Long enough for a conversation, short enough to limit a leak out of the frame. */
const CHAT_USER_AUTH_TOKEN_TTL_SECONDS = 60 * 60;

type ChatUserAuthClaims = {
	sub: string;
	email: string;
	firstName: string;
	lastName: string;
	nid: string;
	wid: string;
};

function isChatUserAuthClaims(value: unknown): value is ChatUserAuthClaims {
	if (typeof value !== 'object' || value === null) return false;
	const c = value as Record<string, unknown>;
	return (
		typeof c.sub === 'string' &&
		typeof c.email === 'string' &&
		typeof c.firstName === 'string' &&
		typeof c.lastName === 'string' &&
		typeof c.nid === 'string' &&
		typeof c.wid === 'string'
	);
}

/**
 * The token the sandboxed frame sends as `x-auth-token` on every message: the frame's
 * opaque origin means the `n8n-auth` cookie is never sent from it (null site-for-cookies
 * + `SameSite=Lax`). The `nid`/`wid` claims stop it being replayed against another chat.
 */
export function generateChatUserAuthToken(node: INode, user: IUser): string {
	const secret = Container.get(InstanceSettings).hmacSignatureSecret;
	const payload: ChatUserAuthClaims = {
		sub: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		nid: node.id,
		wid: node.webhookId ?? '',
	};
	return jwt.sign(payload, secret, {
		algorithm: 'HS256',
		expiresIn: CHAT_USER_AUTH_TOKEN_TTL_SECONDS,
	});
}

/** Returns the encoded user, or `null` on any failure — the caller decides how to surface it. */
export function verifyChatUserAuthToken(token: string, node: INode): IUser | null {
	const secret = Container.get(InstanceSettings).hmacSignatureSecret;
	let claims: unknown;
	try {
		claims = jwt.verify(token, secret, { algorithms: ['HS256'] });
	} catch {
		return null;
	}
	if (!isChatUserAuthClaims(claims)) return null;
	if (claims.nid !== node.id) return null;
	if (claims.wid !== (node.webhookId ?? '')) return null;
	return {
		id: claims.sub,
		email: claims.email,
		firstName: claims.firstName,
		lastName: claims.lastName,
	};
}
