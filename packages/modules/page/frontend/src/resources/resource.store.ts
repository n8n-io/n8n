import type { PageResourceReference } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { createRestResourceFetchers } from './resource.api';
import {
	createResourceNameResolver,
	toResourceKey,
	type ResourceDetails,
} from './resourceNameResolver';

/** `missing` means that the resource does not exist or that the user cannot read it. */
export type ResourceResolution =
	| { status: 'loading' }
	| ({ status: 'found' } & ResourceDetails)
	| { status: 'missing' };

const LOADING: ResourceResolution = { status: 'loading' };

function toResolution(details: ResourceDetails | undefined): ResourceResolution {
	return details === undefined ? { status: 'missing' } : { status: 'found', ...details };
}

/** The details that a resolution holds. A resource that is not found has none. */
function detailsOf(resolution: ResourceResolution): Partial<ResourceDetails> {
	const { status, ...details } = resolution;
	return status === 'found' ? details : {};
}

/** The current names and details of the resources that pages link to. */
export const usePageResourceStore = defineStore('pageResource', () => {
	const rootStore = useRootStore();
	const resolver = createResourceNameResolver(
		createRestResourceFetchers(() => rootStore.restApiContext),
	);

	const resolutions = ref<Record<string, ResourceResolution>>({});

	function setResolution(reference: PageResourceReference, resolution: ResourceResolution): void {
		resolutions.value = { ...resolutions.value, [toResourceKey(reference)]: resolution };
	}

	/** Reads what is known now. Does not start a request. */
	function resolutionOf(reference: PageResourceReference): ResourceResolution {
		return resolutions.value[toResourceKey(reference)] ?? LOADING;
	}

	/**
	 * Resolves the current name of a resource and keeps it with its details in `resolutions`.
	 * Many calls for the same resource make one request.
	 */
	async function resolveName(reference: PageResourceReference): Promise<string | undefined> {
		const details = await resolver.resolve(reference);
		setResolution(reference, toResolution(details));
		return details?.name;
	}

	/** Records a name that this client just read or wrote, without a request. Known details stay. */
	function rememberName(reference: PageResourceReference, name: string): void {
		setResolution(reference, toResolution({ ...detailsOf(resolutionOf(reference)), name }));
	}

	/** Asks the server again for a resource. */
	async function refreshName(reference: PageResourceReference): Promise<string | undefined> {
		resolver.forget(reference);
		return await resolveName(reference);
	}

	return { resolutions, resolutionOf, resolveName, rememberName, refreshName };
});
