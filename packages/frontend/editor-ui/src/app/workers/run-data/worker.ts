import * as Comlink from 'comlink';
import { databaseConfig } from '@/app/workers/run-data/db';
import { initializeDatabase } from '@/app/workers/database';
import { loadNodeTypes } from '@/app/workers/run-data/loaders/loadNodeTypes';
import type { NodeExecuteAfterData } from '@n8n/api-types/push/execution';
import type { WorkerState } from '@/app/workers/run-data/types';

const state: WorkerState = {
	initialized: false,
	database: undefined,
	baseUrl: '',
};

export const actions = {
	async initialize({ baseUrl }: { baseUrl: string }) {
		console.log('SharedWorker / initialize');

		if (state.initialized) return;

		const database = await initializeDatabase(databaseConfig);

		state.database = database;
		state.baseUrl = baseUrl;

		// await loadNodeTypes(state);

		state.initialized = true;
	},

	onNodeExecuteAfterData(buffer: ArrayBuffer) {
		const data = new TextDecoder('utf-8').decode(new Uint8Array(buffer));

		let parsedData: NodeExecuteAfterData;
		try {
			parsedData = JSON.parse(data) as NodeExecuteAfterData;
		} catch (_error) {
			return;
		}

		// eslint-disable-next-line no-console
		console.log('nodeExecuteAfterData in worker', parsedData);
	},
};

export type RunDataWorker = typeof actions;

const ports = new Set<MessagePort>();

self.onconnect = (e: MessageEvent) => {
	const port = e.ports[0];
	ports.add(port);
	port.onclose = () => ports.delete(port);
	Comlink.expose(actions, port);
};
