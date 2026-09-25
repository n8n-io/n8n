import z from 'zod';

import { Config, Env } from '../decorators';

const crdtModeSchema = z.enum(['off', 'local', 'server']);

export type CrdtMode = z.infer<typeof crdtModeSchema>;

@Config
export class CollaborationConfig {
	/** CRDT collaborative editing mode. 'off' disables it; 'local' enables cross-tab (BroadcastChannel) sync; 'server' enables YJS-server-backed sync. */
	@Env('N8N_COLLABORATION_CRDT', crdtModeSchema)
	crdt: CrdtMode = 'off';
}
