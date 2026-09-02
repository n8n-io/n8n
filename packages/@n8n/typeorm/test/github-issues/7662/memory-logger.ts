import { Logger } from '../../../src/logger/Logger';

export class MemoryLogger implements Logger {
	constructor(public enabled = true) {}

	private _queries: string[] = [];
	get queries() {
		return this._queries;
	}

	logQuery(query: string) {
		if (this.enabled) {
			this._queries.push(query);
		}
	}

	logQueryError(error: string, query: string) {}

	logQuerySlow(time: number, query: string) {}

	logSchemaBuild(message: string) {}

	logMigration(message: string) {}

	log(level: 'log' | 'info' | 'warn', message: any) {}

	clear() {
		this._queries = [];
	}
}
