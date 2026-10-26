<script setup lang="ts">
import { computed } from 'vue';
import { N8nCard, N8nIcon, N8nNewBadge, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT } from '@/app/constants/experiments';
import { useUIStore } from '@/app/stores/ui.store';
import { useMCPStore } from '@n8n/frontend-module-mcp';
import { SURFACE_MCP_ONBOARDING_MODAL_KEY } from '../constants';
import { useSurfaceMcpToNewCloudUsersStore } from '../stores/surfaceMcpToNewCloudUsers.store';
import SurfaceMcpTileLogos from './SurfaceMcpTileLogos.vue';

const i18n = useI18n();
const uiStore = useUIStore();
const mcpStore = useMCPStore();
const surfaceMcpStore = useSurfaceMcpToNewCloudUsersStore();

const ctaKey = computed<BaseTextKey>(() =>
	surfaceMcpStore.currentVariant === SURFACE_MCP_TO_NEW_CLOUD_USERS_EXPERIMENT.variant2
		? 'experiments.surfaceMcpToNewCloudUsers.emptyState.tile.variant2.cta'
		: 'experiments.surfaceMcpToNewCloudUsers.emptyState.tile.variant1.cta',
);

const badgeKey = computed<BaseTextKey>(() =>
	mcpStore.mcpAccessEnabled
		? 'experiments.surfaceMcpToNewCloudUsers.emptyState.tile.badge.enabled'
		: 'experiments.surfaceMcpToNewCloudUsers.emptyState.tile.badge.new',
);

function openOnboarding() {
	surfaceMcpStore.trackOpened('tile', {
		entryPoint: 'empty_state_tile',
		mcpAccessEnabled: mcpStore.mcpAccessEnabled,
	});
	uiStore.openModalWithData({
		name: SURFACE_MCP_ONBOARDING_MODAL_KEY,
		data: { surface: 'tile' },
	});
}
</script>

<template>
	<N8nCard
		:class="$style.card"
		hoverable
		data-test-id="mcp-onboarding-card"
		@click="openOnboarding"
	>
		<N8nNewBadge
			v-if="!mcpStore.mcpAccessEnabled"
			:class="$style.newBadge"
			:text="i18n.baseText(badgeKey)"
			data-test-id="mcp-onboarding-badge"
		/>
		<span v-else :class="$style.badge" data-test-id="mcp-onboarding-badge">
			<N8nIcon icon="check" size="xsmall" :stroke-width="2.5" />
			{{ i18n.baseText(badgeKey) }}
		</span>
		<div :class="$style.content">
			<SurfaceMcpTileLogos />
			<N8nText size="large" :bold="true" :class="$style.cta">
				{{ i18n.baseText(ctaKey) }}
			</N8nText>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	position: relative;
}

.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--md);
	gap: var(--spacing--sm);
	width: 100%;
}

.cta {
	letter-spacing: var(--letter-spacing--tight);
}

.newBadge,
.badge {
	position: absolute;
	top: var(--spacing--3xs);
	right: var(--spacing--3xs);
	z-index: 1;
}

.badge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--full);
	background: var(--color--green-100);
	color: var(--color--green-800);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	letter-spacing: var(--letter-spacing--wider);
	text-transform: uppercase;
	line-height: 1;
}
</style>
