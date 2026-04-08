<script setup lang="ts">
import { type IconOrEmoji } from '@n8n/design-system/components/N8nIconPicker/types';

import { N8nIcon, N8nText } from '@n8n/design-system';
type Props = {
	icon: IconOrEmoji;
	size?: 'mini' | 'small' | 'medium' | 'large';
	round?: boolean;
	borderLess?: boolean;
	color?: 'text-light' | 'text-base' | 'text-dark';
};

const props = withDefaults(defineProps<Props>(), {
	size: 'medium',
	round: false,
	borderLess: false,
	color: 'text-base',
});
</script>
<template>
	<div
		:class="[
			$style.container,
			$style[props.size],
			{ [$style.round]: props.round, [$style.borderless]: props.borderLess },
		]"
	>
		<N8nIcon
			v-if="icon.type === 'icon'"
			:icon="icon.value"
			:class="$style.icon"
			:color="color"
		></N8nIcon>
		<N8nText v-else-if="icon.type === 'emoji'" color="text-light" :class="$style.emoji">
			{{ icon.value }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	align-items: center;
	justify-content: center;
	border: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	border-radius: var(--radius);

	&.round {
		border-radius: 50%;
	}

	&.borderless {
		border: none;
	}
}

.mini {
	width: var(--spacing--xs);
	height: var(--spacing--xs);

	.icon {
		font-size: var(--font-size--2xs);
	}

	.emoji {
		font-size: var(--font-size--3xs);
	}
}

.small {
	min-width: var(--spacing--lg);
	height: var(--spacing--lg);

	.emoji {
		font-size: var(--font-size--2xs);
	}
}

.medium {
	min-width: var(--spacing--xl);
	height: var(--spacing--xl);

	.emoji {
		font-size: var(--font-size--xs);
	}
}

.large {
	// Making this in line with user avatar size
	min-width: 40px;
	height: 40px;

	.emoji {
		font-size: var(--font-size--sm);
	}
}
</style>
