import { defineStore } from 'pinia';
import { useRootStore } from '@/stores/n8nRootStore';
import * as formsApi from '@/api/forms.ee';
import { computed, ComputedRef, ref } from 'vue';
import { IForm } from '@/Interface';
import { INodeListSearchResult } from 'n8n-workflow';

export const useFormsStore = defineStore('forms', () => {
	const rootStore = useRootStore();
	const forms = ref<IForm[]>([]);

	function formById(id: IForm['id']): ComputedRef<IForm | undefined> {
		return computed(() => forms.value.find((form) => form.id === id));
	}

	async function fetchAllForms() {
		forms.value = await formsApi.getForms(rootStore.getRestApiContext);
		return forms.value;
	}

	async function fetchFormsForRLC(): Promise<INodeListSearchResult> {
		const data = await formsApi.getForms(rootStore.getRestApiContext);
		const results: INodeListSearchResult['results'] = data.map((form) => ({
			name: form.title,
			value: form.id,
			url: `/form/${form.id}`,
		}));

		return { results };
	}

	async function fetchForm({ id }: { id: IForm['id'] }) {
		const foundFormIndex = forms.value.findIndex((form) => form.id === id);
		const data = await formsApi.getForm(rootStore.getRestApiContext, id);

		if (foundFormIndex !== -1) {
			forms.value.unshift(data);
		} else {
			forms.value.splice(foundFormIndex, 1, data);
		}

		return data;
	}

	async function createForm(data: Omit<IForm, 'id'>) {
		const { id } = await formsApi.createForm(rootStore.getRestApiContext, data);
		forms.value.push({ id, ...data });
		return id;
	}

	async function updateForm({ id, ...data }: IForm) {
		const updatedForm = await formsApi.updateForm(rootStore.getRestApiContext, id, data);
		const formIndex = forms.value.findIndex((form) => form.id === id);
		forms.value[formIndex] = updatedForm;
		return updatedForm;
	}

	async function deleteForm({ id }: { id: IForm['id'] }) {
		await formsApi.deleteForm(rootStore.getRestApiContext, id);
		forms.value = forms.value.filter((form) => form.id !== id);
	}

	return {
		forms,
		formById,
		fetchAllForms,
		fetchForm,
		createForm,
		updateForm,
		deleteForm,
		fetchFormsForRLC,
	};
});
