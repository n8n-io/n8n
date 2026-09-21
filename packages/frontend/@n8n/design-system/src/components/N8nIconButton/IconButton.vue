<script lang="ts" setup>
import { computed } from 'vue';

import type { IconSize } from '../../types';
import type { IconButtonProps } from '../../types/button';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';

defineOptions({ name: 'N8nIconButton' });
const props = withDefaults(defineProps<IconButtonProps>(), {
	size: 'medium',
	loading: false,
	disabled: false,
	iconOnly: true,
});

const computedIconSize = computed((): IconSize => {
	if (props.iconSize) {
		return props.iconSize;
	}
	if (props.size === 'mini' || props.size === 'xmini' || props.size === 'xsmall') {
		return 'xsmall';
	}
	return props.size as IconSize;
});
</script>

<template>
	<!-- Slot the icon from here so N8nIcon is a Vue child of IconButton, same as Alert. -->
	<N8nButton v-bind="{ ...$attrs, ...props, icon: undefined }">
		<template v-if="!loading" #icon>
			<slot name="icon">
				<N8nIcon :icon="icon" :size="computedIconSize" />
			</slot>
		</template>
	</N8nButton>
</template>
