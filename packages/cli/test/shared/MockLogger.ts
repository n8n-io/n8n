import { Logger } from '@/Logger';

export class MockLogger extends Logger {
	debug = jest.fn();

	error = jest.fn();

	info = jest.fn();

	warn = jest.fn();

	verbose = jest.fn();
}
