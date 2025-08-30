import * as Comlink from 'comlink';
import { databaseConfig } from '@/workers/run-data/db';
import { initializeDatabase } from '@/workers/database';
import type { Promiser, DbId } from '@sqlite.org/sqlite-wasm';

const state: {
	initialized: boolean;
	promiser: Promiser | undefined;
	dbId: DbId;
} = {
	initialized: false,
	promiser: undefined,
	dbId: undefined,
};

export const actions = {
	async initialize() {
		if (state.initialized) return;

		const { promiser, dbId } = await initializeDatabase(databaseConfig);

		state.promiser = promiser;
		state.dbId = dbId;
		state.initialized = true;
	},
};

export type RunDataWorker = typeof actions;

Comlink.expose(actions);
