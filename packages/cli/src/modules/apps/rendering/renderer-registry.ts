import type { AppBlockType } from '@n8n/api-types';

import type { BlockRenderer } from './types';

const renderers = new Map<AppBlockType, BlockRenderer>();

/** Each block type has one renderer; registering a second one is a wiring bug. */
export function registerBlockRenderer<T extends AppBlockType>(renderer: BlockRenderer<T>): void {
	if (renderers.has(renderer.type)) {
		throw new Error(`A renderer for block type '${renderer.type}' is already registered`);
	}
	// Erasure back to the map's default (union) type: storage is inherently
	// type-erased, since `getBlockRenderer` hands renderers out by runtime
	// value, not by the generic `T` this call site was instantiated with.
	renderers.set(renderer.type, renderer as unknown as BlockRenderer);
}

export function getBlockRenderer(type: AppBlockType): BlockRenderer | undefined {
	return renderers.get(type);
}
