import { createEventBus } from '@n8n/utils/event-bus';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LinkActionFn = (...args: any[]) => void;

export type RegisterCustomActionOpts = {
	key: string;
	action: LinkActionFn;
};

export interface GlobalLinkActionsEventBusEvents {
	/** See useGlobalLinkActions.ts */
	registerGlobalLinkAction: RegisterCustomActionOpts;
}

export const globalLinkActionsEventBus = createEventBus<GlobalLinkActionsEventBusEvents>();
