import { ILogger, LoggerProxy } from 'n8n-workflow';

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
