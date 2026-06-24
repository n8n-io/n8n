import { Config, Env } from '../decorators';

/**
 * Real-time collaborative editing (CRDT) for the workflow editor.
 *
 * - `off`    – collaborative editing is disabled.
 * - `local`  – documents sync across tabs of the same browser only
 *              (client-side BroadcastChannel, no backend involvement).
 * - `server` – documents sync through this instance's CRDT WebSocket endpoint,
 *              so edits and presence are shared across browsers and users.
 */
@Config
export class CollaborationConfig {
	/** Collaborative editing mode for the workflow editor. */
	@Env('N8N_COLLABORATION_CRDT')
	crdt: 'off' | 'local' | 'server' = 'off';
}
