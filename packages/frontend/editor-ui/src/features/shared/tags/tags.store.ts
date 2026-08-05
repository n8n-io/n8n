import { createTagsApi } from './tags.api';
import { STORES } from '@n8n/stores';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref } from 'vue';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { Scope } from '@n8n/permissions';

const apiMapping = {
	[STORES.TAGS]: createTagsApi('/tags'),
	[STORES.ANNOTATION_TAGS]: createTagsApi('/annotation-tags'),
} as const;

const scopeMapping: Record<
	typeof STORES.TAGS | typeof STORES.ANNOTATION_TAGS,
	{ list: Scope; create: Scope; update: Scope; delete: Scope }
> = {
	[STORES.TAGS]: {
		list: 'tag:list',
		create: 'tag:create',
		update: 'tag:update',
		delete: 'tag:delete',
	},
	[STORES.ANNOTATION_TAGS]: {
		list: 'annotationTag:list',
		create: 'annotationTag:create',
		update: 'annotationTag:update',
		delete: 'annotationTag:delete',
	},
};

const createTagsStore = (id: typeof STORES.TAGS | typeof STORES.ANNOTATION_TAGS) => {
	const tagsApi = apiMapping[id];
	const scopes = scopeMapping[id];

	return defineStore(
		id,
		() => {
			const tagsById = ref<Record<string, ITag>>({});
			const loading = ref(false);
			const fetchedAll = ref(false);
			const fetchedUsageCount = ref(false);

			const rootStore = useRootStore();
			const workflowDocumentStore = injectWorkflowDocumentStore();

			// Computed

			const allTags = computed(() => {
				return Object.values(tagsById.value).sort((a, b) => a.name.localeCompare(b.name));
			});

			const isLoading = computed(() => loading.value);

			const hasTags = computed(() => Object.keys(tagsById.value).length > 0);

			// Methods

			const setAllTags = (loadedTags: ITag[]) => {
				tagsById.value = loadedTags.reduce((accu: { [id: string]: ITag }, tag: ITag) => {
					accu[tag.id] = tag;

					return accu;
				}, {});
				fetchedAll.value = true;
			};

			const upsertTags = (toUpsertTags: ITag[]) => {
				toUpsertTags.forEach((toUpsertTag) => {
					const tagId = toUpsertTag.id;
					const currentTag = tagsById.value[tagId];
					if (currentTag) {
						const newTag = {
							...currentTag,
							...toUpsertTag,
						};
						tagsById.value = {
							...tagsById.value,
							[tagId]: newTag,
						};
					} else {
						tagsById.value = {
							...tagsById.value,
							[tagId]: toUpsertTag,
						};
					}
				});
			};

			const deleteTag = (id: string) => {
				const { [id]: deleted, ...rest } = tagsById.value;
				tagsById.value = rest;
			};

			const fetchAll = async (params?: { force?: boolean; withUsageCount?: boolean }) => {
				if (!hasPermission(['rbac'], { rbac: { scope: scopes.list } })) {
					return [];
				}

				const { force = false, withUsageCount = false } = params ?? {};
				if (!force && fetchedAll.value && fetchedUsageCount.value === withUsageCount) {
					return Object.values(tagsById.value);
				}

				loading.value = true;
				const retrievedTags = await tagsApi.getTags(rootStore.restApiContext, {
					withUsageCount,
				});
				setAllTags(retrievedTags);
				loading.value = false;
				return retrievedTags;
			};

			const create = async (
				name: string,
				{ incrementExisting }: { incrementExisting?: boolean } = {},
			) => {
				if (!hasPermission(['rbac'], { rbac: { scope: scopes.create } })) {
					throw new Error('Insufficient permissions to create tags');
				}

				let tagName = name;

				if (incrementExisting) {
					const tagNameRegex = new RegExp(tagName);
					const existingTags = allTags.value.filter((tag) => tagNameRegex.test(tag.name));
					if (existingTags.length > 0) {
						tagName = `${tagName} (${existingTags.length + 1})`;
					}
				}
				const createdTag = await tagsApi.createTag(rootStore.restApiContext, { name: tagName });
				upsertTags([createdTag]);

				return createdTag;
			};

			const rename = async ({ id, name }: { id: string; name: string }) => {
				if (!hasPermission(['rbac'], { rbac: { scope: scopes.update } })) {
					throw new Error('Insufficient permissions to update tags');
				}

				const updatedTag = await tagsApi.updateTag(rootStore.restApiContext, id, { name });
				upsertTags([updatedTag]);
				return updatedTag;
			};

			const deleteTagById = async (id: string) => {
				if (!hasPermission(['rbac'], { rbac: { scope: scopes.delete } })) {
					throw new Error('Insufficient permissions to delete tags');
				}

				const deleted = await tagsApi.deleteTag(rootStore.restApiContext, id);

				if (deleted) {
					deleteTag(id);
					workflowDocumentStore.value.removeTag(id);
				}

				return deleted;
			};

			return {
				allTags,
				isLoading,
				hasTags,
				tagsById,
				fetchAll,
				create,
				rename,
				deleteTagById,
				upsertTags,
				deleteTag,
			};
		},
		{},
	);
};

export const useTagsStore = createTagsStore(STORES.TAGS);

export const useAnnotationTagsStore = createTagsStore(STORES.ANNOTATION_TAGS);
