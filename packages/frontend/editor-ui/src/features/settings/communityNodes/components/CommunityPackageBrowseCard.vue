<script setup lang="ts">
import type { CommunityNodeType } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nText, N8nBadge } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useInstallNode } from '../composables/useInstallNode';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { computed, ref } from 'vue';

interface CommunityPackageSummary {
	packageName: string;
	authorName: string;
	description: string;
	isOfficialNode: boolean;
	isInstalled: boolean;
	numberOfDownloads: number;
	npmVersion: string;
	nodes: CommunityNodeType[];
}

const props = defineProps<{
	pkg: CommunityPackageSummary;
}>();

const emit = defineEmits<{
	installed: [];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const { installNode, loading } = useInstallNode();
const installed = ref(props.pkg.isInstalled);

const nodeCount = computed(() => props.pkg.nodes.length);

const formattedDownloads = computed(() => {
	const count = props.pkg.numberOfDownloads;
	if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
	return count.toString();
});

const firstNodeType = computed(() => {
	const node = props.pkg.nodes[0];
	return node?.nodeDescription ?? null;
});

async function onInstall() {
	if (!props.pkg.nodes.length) return;

	telemetry.track('user clicked cnr install button', {
		package_name: props.pkg.packageName,
		source: 'cnr settings browse',
	});

	const result = await installNode({
		type: 'verified',
		packageName: props.pkg.packageName,
		nodeType: props.pkg.nodes[0].name,
		telemetry: { hasQuickConnect: false, source: 'cnr settings browse' },
	});

	if (result.success) {
		installed.value = true;
		emit('installed');
	}
}
</script>

<template>
	<div :class="$style.card" data-test-id="community-package-browse-card">
		<div :class="$style.cardHeader">
			<div :class="$style.iconWrapper">
				<NodeIcon
					v-if="firstNodeType"
					:node-type="firstNodeType"
					:size="28"
					:show-tooltip="false"
				/>
			</div>
			<div :class="$style.headerInfo">
				<div :class="$style.titleRow">
					<N8nText :bold="true" size="medium">{{ pkg.packageName }}</N8nText>
					<N8nBadge v-if="pkg.isOfficialNode" :class="$style.officialBadge" theme="primary">
						{{ i18n.baseText('settings.communityNodes.browse.card.official') }}
					</N8nBadge>
				</div>
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText('settings.communityNodes.browse.card.by', {
							interpolate: { author: pkg.authorName },
						})
					}}
				</N8nText>
			</div>
			<div :class="$style.installAction">
				<N8nBadge v-if="installed || pkg.isInstalled" theme="success">
					{{ i18n.baseText('settings.communityNodes.browse.card.installed') }}
				</N8nBadge>
				<N8nButton
					v-else
					size="small"
					:label="
						loading
							? i18n.baseText('settings.communityNodes.browse.card.installing')
							: i18n.baseText('settings.communityNodes.browse.card.install')
					"
					:loading="loading"
					@click="onInstall"
				/>
			</div>
		</div>
		<div :class="$style.cardBody">
			<N8nText size="small" color="text-light" :class="$style.description">
				{{ pkg.description }}
			</N8nText>
		</div>
		<div :class="$style.cardFooter">
			<N8nText size="small" color="text-light">
				{{
					i18n.baseText('settings.communityNodes.browse.card.nodes', { adjustToNumber: nodeCount })
				}}
			</N8nText>
			<span :class="$style.separator">·</span>
			<N8nText size="small" color="text-light">
				{{
					i18n.baseText('settings.communityNodes.browse.card.downloads', {
						interpolate: { count: formattedDownloads },
					})
				}}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	transition: border-color 0.2s ease;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}
}

.cardHeader {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
}

.iconWrapper {
	flex-shrink: 0;
	width: 28px;
	height: 28px;
}

.headerInfo {
	flex: 1;
	min-width: 0;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-wrap: wrap;
}

.officialBadge {
	flex-shrink: 0;
}

.installAction {
	flex-shrink: 0;
	margin-left: auto;
}

.cardBody {
	margin-top: var(--spacing--2xs);
}

.description {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.cardFooter {
	display: flex;
	align-items: center;
	margin-top: var(--spacing--2xs);
	gap: var(--spacing--4xs);
}

.separator {
	color: var(--color--text--tint-2);
}
</style>
