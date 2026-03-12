<script lang="ts" setup>
import { computed } from 'vue';
import {
	N8nIcon,
	N8nInput,
	N8nInputNumber,
	N8nSelect,
	N8nOption,
	N8nInputLabel,
} from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useSettingsField } from './useSettingsField';

const i18n = useI18n();
const { store, getString, getNumber, getBool } = useSettingsField();

const showDaytonaFields = computed(() => {
	const provider = store.draft.sandboxProvider ?? store.settings?.sandboxProvider ?? 'daytona';
	return provider === 'daytona';
});
</script>

<template>
	<div :class="$style.section">
		<div :class="$style.sectionHeader">
			<N8nIcon icon="box" size="small" />
			{{ i18n.baseText('instanceAi.settings.section.sandbox') }}
		</div>

		<div :class="$style.switchRow">
			<span :class="$style.switchLabel">{{
				i18n.baseText('instanceAi.settings.sandboxEnabled.label')
			}}</span>
			<ElSwitch
				:model-value="getBool('sandboxEnabled')"
				@update:model-value="store.setField('sandboxEnabled', Boolean($event))"
			/>
		</div>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.sandboxProvider.label')"
			:bold="false"
			size="small"
		>
			<N8nSelect
				:model-value="getString('sandboxProvider') || 'daytona'"
				size="small"
				@update:model-value="store.setField('sandboxProvider', String($event))"
			>
				<N8nOption value="daytona" label="Daytona" />
				<N8nOption value="local" label="Local" />
			</N8nSelect>
		</N8nInputLabel>

		<template v-if="showDaytonaFields">
			<N8nInputLabel
				:label="i18n.baseText('instanceAi.settings.daytonaApiUrl.label')"
				:bold="false"
				size="small"
			>
				<N8nInput
					:model-value="getString('daytonaApiUrl')"
					size="small"
					@update:model-value="store.setField('daytonaApiUrl', $event)"
				/>
			</N8nInputLabel>

			<N8nInputLabel :bold="false" size="small">
				<template #label>
					<div :class="$style.labelWithBadge">
						{{ i18n.baseText('instanceAi.settings.daytonaApiKey.label') }}
						<span
							:class="[
								$style.badge,
								store.settings?.hasDaytonaApiKey ? $style.badgeSet : $style.badgeUnset,
							]"
						>
							{{
								store.settings?.hasDaytonaApiKey
									? i18n.baseText('instanceAi.settings.apiKey.set')
									: i18n.baseText('instanceAi.settings.apiKey.notSet')
							}}
						</span>
					</div>
				</template>
				<N8nInput
					:model-value="store.draft.daytonaApiKey ?? ''"
					size="small"
					type="password"
					placeholder="••••••••"
					@update:model-value="store.setField('daytonaApiKey', $event)"
				/>
			</N8nInputLabel>
		</template>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.sandboxImage.label')"
			:bold="false"
			size="small"
		>
			<N8nInput
				:model-value="getString('sandboxImage')"
				size="small"
				@update:model-value="store.setField('sandboxImage', $event)"
			/>
		</N8nInputLabel>

		<N8nInputLabel
			:label="i18n.baseText('instanceAi.settings.sandboxTimeout.label')"
			:bold="false"
			size="small"
		>
			<N8nInputNumber
				:model-value="getNumber('sandboxTimeout') ?? 300000"
				size="small"
				:min="0"
				:step="10000"
				@update:model-value="store.setField('sandboxTimeout', $event ?? 300000)"
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

.switchRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--4xs) 0;
}

.switchLabel {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
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
