import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { createRequire } from 'node:module';
import { availableParallelism } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export type Transformers = typeof import('@huggingface/transformers');

let transformersPromise: Promise<Transformers> | undefined;

function wasmDirectory(): string {
	const requireFromTransformers = createRequire(require.resolve('@huggingface/transformers'));
	return path.dirname(requireFromTransformers.resolve('onnxruntime-node'));
}

export async function loadTransformers(): Promise<Transformers> {
	transformersPromise ??= import('@huggingface/transformers').then((transformers) => {
		const { env } = transformers;
		env.cacheDir = path.join(Container.get(InstanceSettings).n8nFolder, 'transformers');
		env.allowLocalModels = false;
		const onnx = env.backends.onnx;
		if (onnx.versions?.web && onnx.wasm) {
			onnx.wasm.wasmPaths = `${pathToFileURL(wasmDirectory()).href}/`;
			onnx.wasm.numThreads = Math.min(4, availableParallelism());
			env.useWasmCache = false;
		}
		return transformers;
	});
	return await transformersPromise;
}

export async function cached<T>(
	cache: Map<string, Promise<T>>,
	key: string,
	load: () => Promise<T>,
): Promise<T> {
	let value = cache.get(key);
	if (!value) {
		value = load();
		value.catch(() => cache.delete(key));
		cache.set(key, value);
	}
	return await value;
}

export const isVectorList = (value: unknown): value is number[][] =>
	Array.isArray(value) &&
	value.every((row) => Array.isArray(row) && row.every((cell) => typeof cell === 'number'));

export function normalize(vector: number[]): number[] {
	const length = Math.hypot(...vector) || 1;
	return vector.map((value) => value / length);
}
