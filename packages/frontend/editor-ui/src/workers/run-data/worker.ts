import * as Comlink from 'comlink';
import { databaseConfig } from '@/workers/run-data/db';
import { useDatabase } from '@/workers/database';
import type { Promiser } from '@sqlite.org/sqlite-wasm';

const state: {
	initialized: boolean;
	promiser: Promiser | null;
	dbId: string | null;
} = {
	initialized: false,
	promiser: null,
	dbId: null,
};

export const actions = {
	async initialize() {
		if (state.initialized) return;

		const { promiser, dbId } = await useDatabase(databaseConfig);

		state.promiser = promiser;
		state.dbId = dbId;
		state.initialized = true;
	},
};

export type RunDataWorker = typeof actions;

Comlink.expose(actions);
