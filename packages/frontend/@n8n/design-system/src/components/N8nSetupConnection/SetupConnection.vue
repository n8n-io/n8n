<script setup lang="ts">
import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nDropdownMenu from '../N8nDropdownMenu/DropdownMenu.vue';
import N8nIcon from '../N8nIcon';
import type { SetupConnectionProps } from './SetupConnection.types';

defineProps<SetupConnectionProps>();
const emit = defineEmits<{
	action: [];
	select: [id: string];
}>();
const { t } = useI18n();
</script>

<template>
	<div :class="$style.connection">
		<template v-if="connected">
			<div :class="$style.field">
				<span v-if="valueLabel" :class="$style.label">{{ valueLabel }}</span>
				<div :class="$style.saved">
					<span :class="$style.value" :title="value">{{ value || t('setupPanel.connected') }}</span>
					<N8nDropdownMenu
						v-if="actions.length"
						:items="actions"
						:disabled="disabled || loading"
						:modal="false"
						placement="bottom-end"
						@select="emit('select', $event)"
					>
						<template #trigger>
							<N8nButton
								variant="ghost"
								size="xsmall"
								icon-only
								:disabled="disabled || loading"
								:aria-label="t('setupPanel.changeConnection')"
							>
								<N8nIcon icon="pencil" size="small" />
							</N8nButton>
						</template>
					</N8nDropdownMenu>
				</div>
			</div>
		</template>
		<template v-else>
			<slot />
			<div :class="$style.footer">
				<div v-if="$slots['action-leading']" :class="$style.actionLeading">
					<slot name="action-leading" />
				</div>
				<div :class="$style.actions">
					<N8nButton
						size="small"
						:variant="actionVariant"
						:class="{ [$style.splitAction]: actions.length > 0 }"
						:disabled="disabled || actionDisabled || loading"
						:loading="loading"
						@click="emit('action')"
					>
						{{ actionLabel }}
					</N8nButton>
					<N8nDropdownMenu
						v-if="actions.length"
						:items="actions"
						:disabled="disabled || loading"
						:modal="false"
						placement="bottom-end"
						@select="emit('select', $event)"
					>
						<template #trigger>
							<N8nButton
								size="small"
								:variant="actionVariant"
								icon-only
								:class="$style.splitMenu"
								:disabled="disabled || loading"
								:aria-label="t('setupPanel.moreOptions')"
							>
								<N8nIcon icon="chevron-down" size="small" />
							</N8nButton>
						</template>
					</N8nDropdownMenu>
				</div>
			</div>
			<slot name="footer" />
		</template>
	</div>
</template>

<style lang="scss" module>
.connection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.label {
	color: var(--text-color--subtle);
}

.saved {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	min-height: var(--height--md);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	background: var(--background--subtle);
}

.value {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--text-color--subtle);
}

.actions {
	display: flex;
	flex-shrink: 0;
}

.footer {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}

.actionLeading {
	flex: 1;
	min-width: 0;
	color: var(--text-color--subtle);
}

.splitAction {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
}

.splitMenu {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
	border-left: var(--border);
}
</style>
