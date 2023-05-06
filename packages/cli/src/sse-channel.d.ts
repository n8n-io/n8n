import type { PushRequest, PushResponse } from './push/types';

declare module 'sse-channel' {
	declare class Channel {
		constructor();

		on(event: string, handler: (channel: string, res: PushResponse) => void): void;

		removeClient: (res: PushResponse) => void;

		addClient: (req: PushRequest, res: PushResponse) => void;

		send: (msg: string, clients?: PushResponse[]) => void;
	}

	export = Channel;
}
