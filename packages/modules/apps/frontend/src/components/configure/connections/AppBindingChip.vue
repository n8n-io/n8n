<script setup lang="ts">
import type { AppBindingWarning, AppDescribedBinding } from '@n8n/api-types';
import {
	N8nButton,
	N8nContextMenu,
	N8nIcon,
	N8nTooltip,
	type ContextMenuNode,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { BINDING_KINDS, warningLabel } from './bindingKinds';

const props = defineProps<{
	binding: AppDescribedBinding;
	warning?: AppBindingWarning;
	canUpdate: boolean;
}>();

const emit = defineEmits<{ open: []; remove: [] }>();

const i18n = useI18n();

const config = computed(() => BINDING_KINDS[props.binding.kind]);
const warningText = computed(() =>
	props.warning ? i18n.baseText(warningLabel(props.warning.code, props.binding.kind)) : undefined,
);
const menuItems = computed<Array<ContextMenuNode<'remove'>>>(() => [
	{
		type: 'item',
		id: 'remove',
		label: i18n.baseText('apps.configure.connections.remove'),
		icon: { type: 'icon', value: 'trash-2' },
		variant: 'destructive',
	},
]);
</script>

<template>
	<!-- Right-click opens a menu with Remove, as on an Agent chip. -->
	<N8nContextMenu :items="menuItems" :disabled="!canUpdate" @select="emit('remove')">
		<template #trigger>
			<span :class="$style.trigger">
				<N8nTooltip :content="warningText" :disabled="!warningText" placement="top">
					<N8nButton
						variant="outline"
						size="medium"
						:class="[$style.chip, { [$style.warning]: warning }]"
						:aria-description="warningText"
						:data-test-id="`app-binding-${binding.key}`"
						@click="emit('open')"
					>
						<N8nIcon :icon="config.icon" :size="16" :class="$style.icon" />
						<span :class="$style.name">{{ binding.name }}</span>
						<N8nIcon
							v-if="warningText"
							icon="triangle-alert"
							:size="14"
							:class="$style.warningIcon"
							:data-test-id="`app-binding-${binding.key}-warning`"
						/>
					</N8nButton>
				</N8nTooltip>
			</span>
		</template>
	</N8nContextMenu>
</template>

<style lang="scss" module>
.trigger {
	display: inline-flex;
	max-width: 100%;
	user-select: none;
}

.chip {
	max-width: 100%;
}

/* Two classes so the warning border wins over the outline variant's own border. */
.chip.warning {
	--button--border--shadow: 0 0 0 1px var(--color--warning);
	--button--border--shadow--hover: 0 0 0 1px var(--color--warning);
	--button--border--shadow--active: 0 0 0 1px var(--color--warning);
}

.icon {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}

.name {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.warningIcon {
	flex-shrink: 0;
	color: var(--color--warning);
}
</style>
