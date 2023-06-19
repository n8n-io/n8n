import type { ILogger } from 'n8n-workflow';
import { LoggerProxy } from 'n8n-workflow';

const fakeLogger = {
	log: () => {},
	debug: () => {},
	verbose: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
} as ILogger;

export const initLogger = () => {
	LoggerProxy.init(fakeLogger);
};
