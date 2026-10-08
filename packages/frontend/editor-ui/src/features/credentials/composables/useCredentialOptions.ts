import { useRootStore } from '@n8n/stores/useRootStore';
import isEqual from 'lodash/isEqual';
import type {
	ICredentialDataDecryptedObject,
	INodeListSearchItems,
	INodeProperties,
} from 'n8n-workflow';
import { computed, onScopeDispose, ref, watch } from 'vue';

import { getCredentialOptions, type CredentialOptionsDestination } from '../credentials.api';

export interface CredentialOptionsContext {
	credentialType?: string;
	credentialId?: string;
	n8nProjectId?: string;
	isInstanceCredential?: boolean;
	credentialData: ICredentialDataDecryptedObject;
	credentialProperties: INodeProperties[];
}

export function useCredentialOptions(
	context: CredentialOptionsContext & { parameter: INodeProperties },
) {
	const rootStore = useRootStore();
	const options = ref<INodeListSearchItems[]>([]);
	const loading = ref(false);
	const failed = ref(false);
	const open = ref(false);
	let loaded = false;
	let revision = 0;
	const destination = computed<CredentialOptionsDestination | undefined>(() => {
		if (context.credentialId) return { kind: 'stored', credentialId: context.credentialId };
		if (context.isInstanceCredential) return { kind: 'instance' };
		if (context.n8nProjectId) return { kind: 'project', projectId: context.n8nProjectId };
		return undefined;
	});
	const dependencies = computed(() => context.parameter.typeOptions?.loadOptionsDependsOn ?? []);
	const canLoad = computed(() => {
		if (!context.credentialType || !destination.value) return false;
		return dependencies.value.every((name) => {
			// Instance overwrites can supply fields that the form does not show.
			if (!context.credentialProperties.some((property) => property.name === name)) return true;
			const value = context.credentialData[name];
			return typeof value === 'string' ? value.trim() !== '' : value !== undefined;
		});
	});

	async function loadOptions() {
		const target = destination.value;
		if (!context.credentialType || !target || !canLoad.value || loading.value || loaded) return;
		const requestRevision = revision;
		const request = {
			type: context.credentialType,
			data: { ...context.credentialData },
			propertyName: context.parameter.name,
		};
		loading.value = true;
		failed.value = false;
		options.value = [];
		try {
			let paginationToken: string | undefined;
			do {
				const response = await getCredentialOptions(rootStore.restApiContext, target, {
					...request,
					paginationToken,
				});
				if (requestRevision !== revision) return;
				options.value.push(...response.results);
				paginationToken = response.paginationToken;
			} while (paginationToken);
			loaded = true;
		} catch {
			if (requestRevision === revision) failed.value = true;
		} finally {
			if (requestRevision === revision) loading.value = false;
		}
	}

	watch(
		() => [
			context.credentialType,
			destination.value,
			context.parameter.name,
			...dependencies.value.map((name) => context.credentialData[name]),
		],
		(current, previous) => {
			if (isEqual(current, previous)) return;
			revision++;
			options.value = [];
			loaded = false;
			loading.value = false;
			failed.value = false;
			if (open.value) void loadOptions();
		},
		{ flush: 'sync' },
	);
	onScopeDispose(() => revision++);

	function onVisibleChange(visible: boolean) {
		open.value = visible;
		if (visible) void loadOptions();
	}

	return { options, loading, failed, canLoad, onVisibleChange };
}
