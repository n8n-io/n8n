import type { Request, Response } from 'express';

declare module 'sse-channel' {
	declare class Channel {
		constructor();

		on(event: string, handler: (channel: string, res: Response) => void): void;

		removeClient: (res: Response) => void;

		addClient: (req: Request, res: Response) => void;

		send: (msg: string, clients?: Response[]) => void;
	}

	export = Channel;
}
