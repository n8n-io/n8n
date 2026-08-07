<script lang="ts" setup>
import { N8nBadge, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { CommitInfo } from '@/features/branch-sync/branchSync.types';
import { shortSha } from '@/features/branch-sync/branchSync.utils';

defineProps<{
	commits: CommitInfo[];
	/** Selected pin target sha; undefined = track head. */
	modelValue: string | undefined;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string | undefined];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nSelect
		:model-value="modelValue"
		:placeholder="i18n.baseText('branchSync.pin.label')"
		size="small"
		clearable
		data-test-id="branch-sync-commit-picker"
		@update:model-value="emit('update:modelValue', ($event as string) || undefined)"
	>
		<N8nOption
			v-for="commit in commits"
			:key="commit.sha"
			:value="commit.sha"
			:label="`${shortSha(commit.sha)} ${commit.message}`"
		>
			<span :class="$style.option">
				<N8nText size="small" :class="$style.sha">{{ shortSha(commit.sha) }}</N8nText>
				<N8nText size="small" :class="$style.message">{{ commit.message }}</N8nText>
				<N8nBadge v-if="commit.isTarget" theme="primary" size="small">
					{{ i18n.baseText('branchSync.pin.targetBadge') }}
				</N8nBadge>
				<N8nBadge v-if="commit.isBase" theme="secondary" size="small">
					{{ i18n.baseText('branchSync.pin.baseBadge') }}
				</N8nBadge>
			</span>
		</N8nOption>
	</N8nSelect>
</template>

<style lang="scss" module>
.option {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	max-width: 100%;
}

.sha {
	font-family: var(--font-family--monospace);
}

.message {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
