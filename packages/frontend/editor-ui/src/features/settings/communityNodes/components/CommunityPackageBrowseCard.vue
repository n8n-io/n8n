<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import {
	N8nButton,
	N8nText,
	N8nBadge,
	N8nIcon,
	N8nExternalLink,
	N8nTooltip,
} from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import OfficialIcon from 'virtual:icons/mdi/verified';
import type { CommunityPackageSummary } from '../communityNodes.types';
import { useInstallNode } from '../composables/useInstallNode';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { NPM_PACKAGE_DOCS_BASE_URL } from '@/app/constants';
import { computed, ref } from 'vue';

const props = defineProps<{
	pkg: CommunityPackageSummary;
}>();

const emit = defineEmits<{
	installed: [];
}>();

const i18n = useI18n();
const telemetry = useTelemetry();
const { installNode, loading } = useInstallNode();
const installedLocally = ref(false);
const installed = computed(() => props.pkg.isInstalled || installedLocally.value);

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

const docsUrl = computed(() => `${NPM_PACKAGE_DOCS_BASE_URL}${props.pkg.packageName}`);

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
		installedLocally.value = true;
		emit('installed');
	}
}
</script>

<template>
	<div :class="$style.card" data-test-id="community-package-browse-card">
		<div :class="$style.cardTop">
			<NodeIcon
				v-if="firstNodeType"
				:class="$style.nodeIcon"
				:node-type="firstNodeType"
				:show-tooltip="false"
			/>
			<div :class="$style.nameBlock">
				<div :class="$style.titleRow">
					<N8nExternalLink :href="docsUrl" :class="$style.packageName">
						<N8nText :bold="true" size="medium">{{ pkg.packageName }}</N8nText>
					</N8nExternalLink>
					<N8nTooltip v-if="pkg.isOfficialNode" placement="bottom" :show-after="500">
						<template #content>
							{{
								i18n.baseText('generic.officialNode.tooltip', {
									interpolate: { author: pkg.authorName },
								})
							}}
						</template>
						<OfficialIcon :class="$style.officialIcon" />
					</N8nTooltip>
				</div>
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText('settings.communityNodes.browse.card.by', {
							interpolate: { author: pkg.authorName },
						})
					}}
				</N8nText>
			</div>
		</div>

		<N8nText size="small" color="text-light" :class="$style.description">
			{{ pkg.description }}
		</N8nText>

		<div :class="$style.cardBottom">
			<div :class="$style.stats">
				<div :class="$style.stat">
					<N8nIcon :class="$style.statIcon" icon="box" />
					<N8nText color="text-light" size="xsmall" :bold="true">
						{{
							i18n.baseText('settings.communityNodes.browse.card.nodes', {
								adjustToNumber: nodeCount,
							})
						}}
					</N8nText>
				</div>
				<div :class="$style.stat">
					<N8nIcon :class="$style.statIcon" icon="hard-drive-download" />
					<N8nText color="text-light" size="xsmall" :bold="true">
						{{
							i18n.baseText('settings.communityNodes.browse.card.downloads', {
								interpolate: { count: formattedDownloads },
							})
						}}
					</N8nText>
				</div>
			</div>
			<div :class="$style.installAction">
				<N8nBadge v-if="installed" theme="success">
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
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	transition: border-color 0.2s ease;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}
}

.cardTop {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.nodeIcon {
	--node--icon--size: 36px;
	flex-shrink: 0;
}

.nameBlock {
	flex: 1;
	min-width: 0;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.packageName {
	padding: 0;
	overflow: hidden;

	> span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.officialIcon {
	display: inline-flex;
	flex-shrink: 0;
	color: var(--color--text);
	width: 14px;
}

.description {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	flex: 1;
}

.cardBottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: auto;
}

.stats {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.stat {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.statIcon {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	width: 12px;
}

.installAction {
	flex-shrink: 0;
}
</style>
