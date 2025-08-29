import * as Comlink from 'comlink';
import { databaseConfig } from '@/workers/run-data/db';
import { useDatabase } from '@/workers/database';
import type { Promiser } from '@sqlite.org/sqlite-wasm';

const state: {
	promiser: Promiser | null;
	dbId: string | null;
} = {
	promiser: null,
	dbId: null,
};

export const actions = {
	async initialize() {
		const { promiser, dbId } = await useDatabase(databaseConfig);

		state.promiser = promiser;
		state.dbId = dbId;
	},
};

export type RunDataWorker = typeof actions;

Comlink.expose(actions);
