<script lang="ts" setup>
import { N8nIcon, N8nInput, N8nInputLabel } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsField } from './useSettingsField';

const i18n = useI18n();
const { store, getString } = useSettingsField();
</script>

<template>
	<div :class="$style.section">
		<div :class="$style.sectionHeader">
			<N8nIcon icon="search" size="small" />
			{{ i18n.baseText('instanceAi.settings.section.search') }}
		</div>

		<N8nInputLabel :bold="false" size="small">
			<template #label>
				<div :class="$style.labelWithBadge">
					{{ i18n.baseText('instanceAi.settings.braveSearchApiKey.label') }}
					<span
						:class="[
							$style.badge,
							store.settings?.hasBraveSearchApiKey ? $style.badgeSet : $style.badgeUnset,
						]"
					>
						{{
							store.settings?.hasBraveSearchApiKey
								? i18n.baseText('instanceAi.settings.apiKey.set')
								: i18n.baseText('instanceAi.settings.apiKey.notSet')
						}}
					</span>
				</div>
			</template>
			<N8nInput
				:model-value="store.draft.braveSearchApiKey ?? ''"
				size="small"
				type="password"
				placeholder="••••••••"
				@update:model-value="store.setField('braveSearchApiKey', $event)"
			/>
		</N8nInputLabel>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.searxngUrl.label')"
			:bold="false"
			size="small"
		>
			<N8nInput
				:model-value="getString('searxngUrl')"
				size="small"
				@update:model-value="store.setField('searxngUrl', $event)"
			/>
		</N8nInputLabel>
	</div>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.sectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	padding-bottom: var(--spacing--4xs);
	border-bottom: var(--border);
}

.labelWithBadge {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.badge {
	font-size: var(--font-size--3xs);
	padding: 1px var(--spacing--4xs);
	border-radius: var(--radius--sm);
	font-weight: var(--font-weight--bold);
	line-height: 1.4;
}

.badgeSet {
	background: color-mix(in srgb, var(--color--success) 15%, transparent);
	color: var(--color--success);
}

.badgeUnset {
	background: var(--color--foreground);
	color: var(--color--text);
}
</style>
