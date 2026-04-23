<script lang="ts" setup>
import { computed } from 'vue';
import { N8nTooltip, N8nIconButton, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import { useSettingsField } from './useSettingsField';

const i18n = useI18n();
const { store } = useSettingsField();

const isLocalGatewayDisabled = computed(() => store.preferences?.localGatewayDisabled ?? false);

const CATEGORY_META: Record<string, { icon: IconName; labelKey: BaseTextKey }> = {
	filesystem: { icon: 'folder-open', labelKey: 'instanceAi.filesystem.category.filesystem' },
	browser: { icon: 'globe', labelKey: 'instanceAi.filesystem.category.browser' },
	screenshot: { icon: 'mouse-pointer', labelKey: 'instanceAi.filesystem.category.computerUse' },
	'mouse-keyboard': {
		icon: 'mouse-pointer',
		labelKey: 'instanceAi.filesystem.category.computerUse',
	},
	shell: { icon: 'terminal', labelKey: 'instanceAi.filesystem.category.shell' },
};

const displayCategories = computed(() => {
	const seen = new Set<string>();
	const result: Array<{
		key: string;
		icon: IconName;
		label: string;
		enabled: boolean;
		sublabel?: string;
	}> = [];

	for (const cat of store.gatewayToolCategories) {
		const meta = CATEGORY_META[cat.name];
		if (!meta) continue;
		const labelKey = meta.labelKey;

		if (seen.has(labelKey)) {
			if (cat.enabled) {
				const existing = result.find((r) => r.label === i18n.baseText(labelKey));
				if (existing) existing.enabled = true;
			}
			continue;
		}
		seen.add(labelKey);

		let sublabel: string | undefined;
		if (cat.name === 'filesystem' && cat.enabled) {
			sublabel = cat.writeAccess
				? i18n.baseText('instanceAi.filesystem.access.readWrite')
				: i18n.baseText('instanceAi.filesystem.access.read');
		}

		result.push({
			key: cat.name,
			icon: meta.icon,
			label: i18n.baseText(labelKey),
			enabled: cat.enabled,
			sublabel,
		});
	}
	return result.sort((a, b) => Number(b.enabled) - Number(a.enabled));
});
</script>

<template>
	<div :class="$style.section">
		<div :class="$style.switchRow">
			<div>
				<N8nHeading tag="h2" size="small">
					{{ i18n.baseText('instanceAi.filesystem.label') }}
				</N8nHeading>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('instanceAi.filesystem.description') }}
				</N8nText>
			</div>
			<ElSwitch
				:model-value="!isLocalGatewayDisabled"
				:disabled="store.isLocalGatewayDisabled"
				@update:model-value="store.persistLocalGatewayPreference(!$event)"
			/>
		</div>

		<div v-if="store.isLocalGatewayDisabled" :class="$style.warningRow">
			<N8nIcon icon="triangle-alert" size="small" />
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('settings.n8nAgent.computerUse.disabled.warning') }}
			</N8nText>
		</div>

		<template v-if="!store.isLocalGatewayDisabledForUser">
			<div v-if="store.isGatewayConnected" :class="$style.connectedBlock">
				<div :class="$style.statusRow">
					<span :class="[$style.dot, $style.dotConnected]" />
					<N8nText size="small" :bold="true">
						{{ store.gatewayHostIdentifier ?? store.gatewayDirectory }}
					</N8nText>
				</div>
				<div
					v-if="store.gatewayHostIdentifier && store.gatewayDirectory"
					:class="$style.directoryRow"
				>
					<N8nText size="small" color="text-light">
						{{ store.gatewayDirectory }}
					</N8nText>
				</div>
				<div v-if="displayCategories.length" :class="$style.toolCategories">
					<span
						v-for="cat in displayCategories"
						:key="cat.key"
						:class="[$style.categoryPill, !cat.enabled && $style.categoryPillDisabled]"
					>
						<N8nIcon :icon="cat.icon" size="xsmall" />
						{{ cat.label }}
						<span v-if="cat.sublabel" :class="$style.categorySublabel"> ({{ cat.sublabel }}) </span>
					</span>
				</div>
			</div>

			<!-- No gateway connected — show setup instructions -->
			<template v-else>
				<!-- Daemon connecting -->
				<div v-if="store.isDaemonConnecting" :class="$style.connectingRow">
					<span :class="$style.spinner" />
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('instanceAi.filesystem.connectWaiting') }}
					</N8nText>
				</div>

				<!-- Setup command -->
				<div v-else :class="$style.setupBlock">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('instanceAi.filesystem.setupCommand') }}
					</N8nText>
					<div :class="$style.commandBlock">
						<code :class="$style.commandText">{{ displayCommand }}</code>
						<N8nTooltip :content="copied ? i18n.baseText('instanceAi.filesystem.copied') : 'Copy'">
							<N8nIconButton
								:icon="copied ? 'check' : 'copy'"
								variant="ghost"
								size="mini"
								@click="copyCommand"
							/>
						</N8nTooltip>
					</div>
					<div :class="$style.connectingRow">
						<span :class="$style.spinner" />
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('instanceAi.filesystem.connectWaiting') }}
						</N8nText>
					</div>
				</div>
			</template>
		</template>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.switchRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--4xs) 0;
}

.warningRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) 0;
	color: var(--color--warning);
}

.connectedBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius--lg);
}

.statusRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.directoryRow {
	padding-left: calc(8px + var(--spacing--3xs));
}

.toolCategories {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	padding-left: calc(8px + var(--spacing--3xs));
}

.categoryPill {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	background: var(--color--background);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.categoryPillDisabled {
	opacity: 0.4;
}

.categorySublabel {
	color: var(--color--text--tint-1);
}

.dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}

.dotConnected {
	background: var(--color--success);
}

.connectRow {
	display: flex;
	justify-content: flex-start;
}
</style>
