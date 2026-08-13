<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { N8nButton, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { computed } from 'vue';
import ShieldIcon from 'virtual:icons/fa-solid/shield-alt';

const props = defineProps<{
	nodeType: INodeTypeDescription;
	configuredNode?: INode;
	enabled?: boolean;
	mode: 'configured' | 'available';
	/** Uninstalled verified community preview — show Install CTA + verified badge. */
	communityPreview?: boolean;
	installing?: boolean;
	/** Non-admin cannot install; button is disabled with contact-admin tooltip. */
	installDisabled?: boolean;
}>();

const emit = defineEmits<{
	toggle: [enabled: boolean];
	configure: [];
	remove: [];
	add: [];
}>();

const i18n = useI18n();

const description = computed(() => {
	if (props.configuredNode && props.configuredNode.name !== props.nodeType.displayName) {
		return props.nodeType.displayName;
	}
	return props.nodeType.description;
});

const displayName = computed(() => {
	if (props.configuredNode) {
		return props.configuredNode.name;
	}
	return props.nodeType.displayName;
});

const actionLabel = computed(() =>
	props.communityPreview
		? i18n.baseText('communityNodeDetails.install')
		: i18n.baseText('chatHub.toolsManager.add'),
);

const actionDisabled = computed(
	() => props.communityPreview && (props.installing || props.installDisabled),
);
</script>

<template>
	<div :class="[$style.item, { [$style.configured]: mode === 'configured' }]">
		<div :class="$style.iconWrapper">
			<NodeIcon :node-type="nodeType" :size="32" />
		</div>

		<div :class="$style.content">
			<div :class="$style.nameRow">
				<N8nText :class="$style.name" size="small" color="text-dark">
					{{ displayName }}
				</N8nText>
				<N8nTooltip
					v-if="communityPreview"
					:content="i18n.baseText('communityNodeInfo.approved')"
					placement="top"
				>
					<ShieldIcon :class="$style.verifiedIcon" data-test-id="chat-tool-verified-badge" />
				</N8nTooltip>
			</div>
			<N8nText :class="$style.description" size="small" color="text-light">
				{{ description }}
			</N8nText>
		</div>

		<div :class="$style.actions">
			<template v-if="mode === 'configured'">
				<N8nTooltip :content="i18n.baseText('chatHub.toolsManager.configure')">
					<N8nIconButton
						icon="settings"
						variant="ghost"
						text
						:class="$style.actionButton"
						@click="emit('configure')"
					/>
				</N8nTooltip>

				<N8nTooltip :content="i18n.baseText('chatHub.toolsManager.remove')">
					<N8nIconButton
						icon="trash-2"
						variant="ghost"
						text
						:class="$style.actionButton"
						@click="emit('remove')"
					/>
				</N8nTooltip>

				<N8nTooltip
					:content="
						enabled
							? i18n.baseText('chatHub.toolsManager.disableTool')
							: i18n.baseText('chatHub.toolsManager.enableTool')
					"
				>
					<ElSwitch
						:model-value="enabled"
						:class="$style.toggle"
						@update:model-value="emit('toggle', Boolean($event))"
					/>
				</N8nTooltip>
			</template>

			<template v-else>
				<N8nTooltip
					v-if="communityPreview && installDisabled && !installing"
					:content="i18n.baseText('communityNodeInfo.contact.admin')"
					placement="top"
				>
					<span>
						<N8nButton
							variant="subtle"
							size="small"
							icon="plus"
							:loading="installing"
							:disabled="true"
							data-test-id="chat-tool-install-button"
						>
							{{ actionLabel }}
						</N8nButton>
					</span>
				</N8nTooltip>
				<N8nButton
					v-else
					variant="subtle"
					size="small"
					icon="plus"
					:loading="installing"
					:disabled="actionDisabled"
					:data-test-id="communityPreview ? 'chat-tool-install-button' : 'chat-tool-add-button'"
					@click="emit('add')"
				>
					{{ actionLabel }}
				</N8nButton>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) 0;
	border-radius: var(--radius--lg);

	&.configured {
		.actionButton {
			opacity: 0;
		}

		&:hover {
			.actionButton {
				opacity: 1;
			}
		}
	}
}

.iconWrapper {
	flex-shrink: 0;
	width: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.content {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.nameRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.verifiedIcon {
	flex-shrink: 0;
	width: 12px;
	height: 12px;
	color: var(--color--success);
}

.name {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--md);
}

.description {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--md);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.toggle {
	margin-left: var(--spacing--2xs);
}
</style>
