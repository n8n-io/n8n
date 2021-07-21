import * as express from 'express';

export type ClerkWebhookPayload = {
  data: Record<string, string | number>;
  object: 'event';
  type: ClerkEvent;
};

export type ClerkEvent =
	| 'session.created'
	| 'session.ended'
	| 'session.removed'
	| 'session.revoked'
	| 'user.created'
	| 'user.deleted'
	| 'user.updated'
	| '*';

export type ClerkRequest = express.Request & {
	rawBody: Buffer;
	headers: Record<string, string>;
}

export type ClerkCredentials = {
	webhookSecret: string;
};
