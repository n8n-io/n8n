/* eslint-disable @typescript-eslint/promise-function-async */
import type {
	BuiltVectorStoreBackend,
	VectorFilter,
	VectorQueryResult,
	VectorRecord,
} from '../types/sdk/vector-store';
import type { JSONObject } from '../types/utils/json';

export abstract class BaseVectorStore<TConstructorOptions extends JSONObject = JSONObject>
	implements BuiltVectorStoreBackend
{
	constructor(
		protected readonly name: string,
		protected readonly constructorOptions: TConstructorOptions,
	) {}

	upsert(_records: VectorRecord[]): Promise<void> {
		throw new Error('Method not implemented.');
	}
	query(
		_vector: number[],
		_opts: { topK: number; filter?: VectorFilter },
	): Promise<VectorQueryResult[]> {
		throw new Error('Method not implemented.');
	}
	delete(_opts: { ids: string[] }): Promise<void> {
		throw new Error('Method not implemented.');
	}

	close?(): void | Promise<void>;
}
