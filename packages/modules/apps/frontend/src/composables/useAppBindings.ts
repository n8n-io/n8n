import {
	appBindingSchema,
	type AppBinding,
	type AppBindingsResponse,
	type AppBindingWarning,
	type AppDescribedBinding,
	type AppResponse,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';

import { getAppBindings, setAppBindings } from '../apps.api';

function toAppBinding(binding: AppDescribedBinding): AppBinding {
	return appBindingSchema.parse(binding);
}

export function useAppBindings(app: MaybeRefOrGetter<AppResponse>) {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();

	const bindings = ref<AppDescribedBinding[]>([]);
	const warnings = ref<AppBindingWarning[]>([]);
	const loading = ref(false);
	const loaded = ref(false);
	let versionId = toValue(app).draftVersionId;
	let pendingSave = Promise.resolve();

	const warningsByKey = computed(
		() => new Map(warnings.value.map((warning) => [warning.key, warning])),
	);

	function apply(response: AppBindingsResponse) {
		versionId = response.versionId;
		bindings.value = response.bindings;
		warnings.value = response.warnings;
		loaded.value = true;
	}

	async function load() {
		const { projectId, id } = toValue(app);
		loading.value = true;
		try {
			apply(await getAppBindings(rootStore.restApiContext, projectId, id));
			return true;
		} catch (error) {
			loaded.value = false;
			toast.showError(error, i18n.baseText('apps.configure.connections.loadError'));
			return false;
		} finally {
			loading.value = false;
		}
	}

	async function change(next: AppBinding[]) {
		const { projectId, id } = toValue(app);
		try {
			const response = await setAppBindings(
				rootStore.restApiContext,
				projectId,
				id,
				versionId,
				next,
			);
			apply(response);
			return response;
		} catch (error) {
			toast.showError(error, i18n.baseText('apps.configure.connections.saveError'));
			if (error instanceof ResponseError && error.httpStatusCode === 409) await load();
			return undefined;
		}
	}

	async function save(update: (current: AppBinding[]) => AppBinding[]) {
		const result = pendingSave.then(async () => {
			if (!loaded.value && !(await load())) return undefined;
			return await change(update(bindings.value.map(toAppBinding)));
		});
		pendingSave = result.then(() => undefined);
		return await result;
	}

	return { bindings, warningsByKey, loading, loaded, load, save };
}
