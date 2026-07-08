<script setup lang="ts">
import type { AgentJsonVectorStoreConfig } from '@n8n/api-types';
import {
	N8nActionBox,
	N8nActionDropdown,
	N8nIcon,
	N8nIconButton,
	N8nTableBase,
	N8nTooltip,
} from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS } from '../vector-stores';

const props = withDefaults(
	defineProps<{
		vectorStores: AgentJsonVectorStoreConfig[];
		disabled?: boolean;
	}>(),
	{
		disabled: false,
	},
);

const emit = defineEmits<{
	connect: [];
	edit: [vectorStore: AgentJsonVectorStoreConfig];
	remove: [vectorStore: AgentJsonVectorStoreConfig];
}>();

type VectorStoreAction = 'edit' | 'remove';

const i18n = useI18n();

function locatorLabel(vectorStore: AgentJsonVectorStoreConfig): string {
	switch (vectorStore.provider) {
		case 'pinecone':
			return vectorStore.indexName;
		case 'qdrant':
			return vectorStore.collectionName;
		case 'supabase':
		case 'postgres':
			return vectorStore.tableName;
	}
}

function rowActions(): Array<ActionDropdownItem<VectorStoreAction>> {
	return [
		{
			id: 'edit',
			label: i18n.baseText('agents.builder.vectorStores.panel.edit'),
			icon: 'pen',
			disabled: props.disabled,
		},
		{
			id: 'remove',
			label: i18n.baseText('agents.builder.vectorStores.panel.remove'),
			icon: 'trash-2',
			disabled: props.disabled,
		},
	];
}

function onAction(actionId: VectorStoreAction, vectorStore: AgentJsonVectorStoreConfig) {
	if (actionId === 'edit') {
		emit('edit', vectorStore);
	} else if (actionId === 'remove') {
		emit('remove', vectorStore);
	}
}
</script>

<template>
	<div :class="$style.panel" data-testid="agent-vector-stores-panel">
		<div :class="$style.toolbar">
			<span :class="$style.title" data-testid="agent-vector-stores-title">
				{{ i18n.baseText('agents.builder.vectorStores.panel.title') }}
				<N8nTooltip
					:content="i18n.baseText('agents.builder.vectorStores.panel.titleTooltip')"
					placement="top"
				>
					<N8nIcon icon="circle-help" size="small" :class="$style.titleIcon" />
				</N8nTooltip>
			</span>
			<N8nTooltip
				:content="i18n.baseText('agents.builder.vectorStores.panel.connectButton')"
				placement="top"
			>
				<N8nIconButton
					variant="ghost"
					size="small"
					icon="plus"
					:disabled="props.disabled"
					:aria-label="i18n.baseText('agents.builder.vectorStores.panel.connectButton')"
					data-testid="agent-vector-stores-connect"
					@click="emit('connect')"
				/>
			</N8nTooltip>
		</div>

		<div v-if="props.vectorStores.length > 0" :class="$style.tableContainer">
			<N8nTableBase>
				<tbody>
					<tr
						v-for="vectorStore in props.vectorStores"
						:key="vectorStore.name"
						:class="$style.row"
						data-testid="agent-vector-stores-list-row"
					>
						<td :class="$style.titleCell">
							<span :class="$style.rowTitle">
								<CredentialIcon
									:credential-type-name="
										AGENT_VECTOR_STORE_PROVIDER_DEFINITIONS[vectorStore.provider].credentialType
									"
									:size="20"
									:class="$style.rowIcon"
								/>
								<span
									:class="$style.rowName"
									:title="vectorStore.name"
									data-testid="agent-vector-store-name"
								>
									{{ vectorStore.name }}
								</span>
							</span>
						</td>
						<td
							:class="$style.locatorCell"
							:title="locatorLabel(vectorStore)"
							data-testid="agent-vector-store-locator"
						>
							{{ locatorLabel(vectorStore) }}
						</td>
						<td
							:class="$style.useWhenCell"
							:title="vectorStore.useWhen"
							data-testid="agent-vector-store-use-when"
						>
							{{ vectorStore.useWhen }}
						</td>
						<td :class="$style.actionCell" @click.stop>
							<N8nActionDropdown
								:items="rowActions()"
								:disabled="props.disabled"
								activator-icon="ellipsis"
								data-testid="agent-vector-stores-actions"
								@select="onAction($event, vectorStore)"
							/>
						</td>
					</tr>
				</tbody>
			</N8nTableBase>
		</div>

		<N8nActionBox
			v-else
			:icon="{ type: 'icon', value: 'database' }"
			:heading="i18n.baseText('agents.builder.vectorStores.panel.empty.title')"
			:description="i18n.baseText('agents.builder.vectorStores.panel.empty.description')"
			:button-text="i18n.baseText('agents.builder.vectorStores.panel.connectButton')"
			:button-disabled="props.disabled"
			data-testid="agent-vector-stores-empty"
			@click:button="emit('connect')"
		/>
	</div>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	width: 100%;
}

.title {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--sm);
}

.titleIcon {
	color: var(--text-color--subtler);
}

.tableContainer {
	width: 100%;
	overflow-x: auto;
	scrollbar-width: thin;
	scrollbar-color: var(--border-color) transparent;
}

.titleCell {
	width: 24%;
	max-width: 0;
}

.rowTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.rowIcon {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

.rowName {
	display: block;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.locatorCell,
.useWhenCell {
	max-width: 220px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-color--subtler);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.actionCell {
	width: 1%;
	min-width: var(--spacing--2xl);
	color: var(--text-color--subtler);
	text-align: right;
	white-space: nowrap;
}

.row {
	td {
		color: var(--text-color--subtler);
	}

	&:hover {
		background-color: var(--background--hover);
	}
}
</style>
