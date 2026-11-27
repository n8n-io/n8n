<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { I18nT } from 'vue-i18n';
import type { KnowledgeCollectionAgentDto, KnowledgeCollectionDto } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';

import { useCollectionsStore } from '@/features/settings/context/collections.store';

/** Above this number, the agent names move from the warning text to a tooltip on the count. */
const MAX_INLINE_AGENT_NAMES = 5;

/** Rendered by the collections page while it deletes a collection: `close`, then `deleted`. */
const props = defineProps<{
	collection: KnowledgeCollectionDto;
	/** The agents that the parent loaded already. Without them, the dialog loads them itself. */
	agents?: KnowledgeCollectionAgentDto[];
}>();

const emit = defineEmits<{
	close: [];
	deleted: [collection: KnowledgeCollectionDto];
}>();

const i18n = useI18n();
const { showError, showMessage } = useToast();
const collectionsStore = useCollectionsStore();

const deleting = ref(false);
// Stays null while the names load and after a failed load.
const loadedAgents = ref<KnowledgeCollectionAgentDto[] | null>(null);
const agents = computed(() => props.agents ?? loadedAgents.value);

const agentCount = computed(() => props.collection.agentCount);

// Show the names only when they match the count of the table row.
const matchingAgents = computed(() =>
	agents.value?.length === agentCount.value ? agents.value : null,
);

function joinAgentNames(list: KnowledgeCollectionAgentDto[]) {
	const names = list.map((agent) => agent.name);

	return new Intl.ListFormat(i18n.locale, { type: 'unit', style: 'short' }).format(names);
}

async function loadAgents() {
	if (agentCount.value === 0 || props.agents) {
		return;
	}

	try {
		loadedAgents.value = await collectionsStore.listCollectionAgents(
			props.collection.homeProject.id,
			props.collection.id,
		);
	} catch {
		// Keep the count-only text: the count already tells the impact of the delete.
	}
}

onMounted(loadAgents);

function close() {
	// A delete that runs must end first, so its result has a dialog to report to.
	if (deleting.value) {
		return;
	}

	emit('close');
}

function onOpenChange(open: boolean) {
	if (!open) {
		close();
	}
}

async function deleteCollection() {
	if (deleting.value) {
		return;
	}

	const collection = props.collection;

	deleting.value = true;
	try {
		await collectionsStore.deleteCollection(collection.homeProject.id, collection.id);
		showMessage({
			title: i18n.baseText('settings.context.collections.delete.success', {
				interpolate: { name: collection.name },
			}),
			type: 'success',
		});
		emit('deleted', collection);
	} catch (error) {
		showError(error, i18n.baseText('settings.context.collections.error.delete'));
	} finally {
		deleting.value = false;
	}
}
</script>

<template>
	<N8nDialog
		open
		:header="
			i18n.baseText('settings.context.collections.delete.title', {
				interpolate: { name: collection.name },
			})
		"
		data-test-id="collection-delete-dialog"
		@update:open="onOpenChange"
	>
		<N8nDialogBody :class="$style.body">
			<N8nText tag="p">
				{{ i18n.baseText('settings.context.collections.delete.message') }}
			</N8nText>
			<N8nCallout
				v-if="agentCount > 0"
				theme="warning"
				:class="$style.agentsWarning"
				data-test-id="collection-delete-agents-warning"
			>
				<I18nT
					v-if="matchingAgents && agentCount > MAX_INLINE_AGENT_NAMES"
					keypath="settings.context.collections.delete.agentsTooltip"
					scope="global"
				>
					<template #agents>
						<N8nTooltip as-child placement="top">
							<span
								tabindex="0"
								:class="$style.agentsTrigger"
								data-test-id="collection-delete-agents-trigger"
								>{{
									i18n.baseText('settings.context.collections.delete.agentsTooltip.count', {
										interpolate: { count: agentCount },
									})
								}}</span
							>
							<template #content>
								<ul :class="$style.agentsList" data-test-id="collection-delete-agents-list">
									<li v-for="(agent, index) in matchingAgents ?? []" :key="agent.id">
										{{ agent.name
										}}<span v-if="index < agentCount - 1" :class="$style.srOnly">, </span>
									</li>
								</ul>
							</template>
						</N8nTooltip>
					</template>
				</I18nT>
				<template v-else-if="matchingAgents">
					{{
						i18n.baseText('settings.context.collections.delete.agentsNamed', {
							interpolate: { count: agentCount, names: joinAgentNames(matchingAgents) },
							adjustToNumber: agentCount,
						})
					}}
				</template>
				<template v-else>
					{{
						i18n.baseText('settings.context.collections.delete.agents', {
							interpolate: { count: agentCount },
							adjustToNumber: agentCount,
						})
					}}
				</template>
			</N8nCallout>
			<N8nText v-else tag="p" data-test-id="collection-delete-no-agents">
				{{ i18n.baseText('settings.context.collections.delete.noAgents') }}
			</N8nText>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				variant="outline"
				:disabled="deleting"
				:label="i18n.baseText('settings.context.collections.delete.cancel')"
				data-test-id="collection-delete-cancel"
				@click="close"
			/>
			<N8nButton
				variant="destructive"
				:loading="deleting"
				:label="i18n.baseText('settings.context.collections.delete.confirm')"
				data-test-id="collection-delete-confirm"
				@click="deleteCollection"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';
@use '@n8n/design-system/css/mixins/utils';

.body {
	gap: var(--spacing--sm);
}

// Agent names are free text, so a long name without spaces must not widen the dialog.
.agentsWarning {
	overflow-wrap: anywhere;
}

.agentsTrigger {
	text-decoration: underline;

	@include focus.focus-visible-ring;
}

// Screen readers read the tooltip as one text, so the names need a separator.
.srOnly {
	@include utils.utils-sr-only;
}

.agentsList {
	// The tooltip has no overflow rule, so a long list scrolls inside its own box.
	max-height: 12rem;
	margin: 0;
	padding: 0;
	overflow-y: auto;
	list-style-type: none;

	li + li {
		padding-top: var(--spacing--3xs);
	}
}
</style>
