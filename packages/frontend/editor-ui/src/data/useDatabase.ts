import type { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm';
import type { SimplifiedExecution } from '@/Interface';
import { useSQLite } from '@/data/useSQLite';
import { databaseConfig } from '@/data/schema';
import { ref } from 'vue';

export function useDatabase() {
	const isLoading = ref(false);
	const error = ref<Error | null>(null);
	const isInitialized = ref(false);

	const promiser = ref<ReturnType<typeof sqlite3Worker1Promiser> | null>(null);
	const dbId = ref<string | null>(null);

	async function initialize() {
		if (isInitialized.value) {
			return;
		}

		const db = await useSQLite();
		promiser.value = db.promiser;
		dbId.value = db.dbId;
	}

	async function executeQuery(sql: string, params: unknown[] = []) {
		if (!dbId.value || !promiser.value) {
			await initialize();
		}

		isLoading.value = true;
		error.value = null;

		try {
			const result = await promiser.value!('exec', {
				dbId: dbId.value as DbId,
				sql,
				bind: params,
				returnValue: 'resultRows',
			});

			if (result.type === 'error') {
				throw new Error(result.result.message);
			}

			return result;
		} catch (err) {
			error.value = err instanceof Error ? err : new Error('Query execution failed');
			throw error.value;
		} finally {
			isLoading.value = false;
		}
	}

	async function insertExecution(data: SimplifiedExecution) {
		try {
			console.log('INSERTING EXECUTION', data);

			return await executeQuery(
				'INSERT INTO executions (id, workflow_id, data, workflow) VALUES (?, ?, ?, ?)',
				[
					data.id,
					data.workflowData.id,
					JSON.stringify(data.data),
					JSON.stringify(data.workflowData),
				],
			);
		} catch (error) {
			console.error('Error inserting into executions:', error);
			throw error;
		}
	}

	return {
		executeQuery,
		insertExecution,
	};
}
