import type { Class } from '../types';

type ShutdownHandlerFn = () => Promise<void> | void;
export type ShutdownServiceClass = Class<Record<string, ShutdownHandlerFn>>;

export interface ShutdownHandler {
	serviceClass: ShutdownServiceClass;
	methodName: string;
}
