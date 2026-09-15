<script lang="ts" setup>
import { computed } from 'vue';

import N8nNodeIcon from './NodeIcon.vue';
import N8nAvatar from '../N8nAvatar';
import N8nIcon from '../N8nIcon';
import { isSupportedIconName, type IconName, type NodeIconName } from '../N8nIcon/icons';
import N8nTooltip from '../N8nTooltip';

type IconType = 'file' | 'icon' | 'unknown';

/**
 * A badge is an icon, an image, or a user avatar (initials over a generated
 * pattern, the same as the users list). The avatar variant names a person, for
 * example who scheduled executions run as.
 */
export interface NodeIconBadge {
	type: IconType | 'avatar';
	src?: string;
	name?: string;
	tooltip?: string;
	firstName?: string | null;
	lastName?: string | null;
}

interface IconContentProps {
	type: IconType;
	src?: string;
	name?: string;
	nodeTypeName?: string;
	size?: number;
	badge?: NodeIconBadge;
}

const props = defineProps<IconContentProps>();

const badgeSize = computed((): number => {
	switch (props.size) {
		case 40:
			return 18;
		case 24:
			return 10;
		case 18:
		default:
			return 12;
	}
});

const fontStyleData = computed((): Record<string, string> => {
	if (!props.size) {
		return {};
	}

	return {
		'max-width': `${props.size}px`,
	};
});

const badgeStyleData = computed((): Record<string, string> => {
	const size = badgeSize.value;
	return {
		padding: `${Math.floor(size / 4)}px`,
		right: `-${Math.floor(size / 2)}px`,
		bottom: `-${Math.floor(size / 2)}px`,
	};
});

const supportedIconName = computed((): IconName | NodeIconName | undefined => {
	return isSupportedIconName(props.name) ? props.name : undefined;
});
</script>

<template>
	<div v-if="type !== 'unknown'" :class="$style.icon">
		<img
			v-if="type === 'file'"
			:src="src"
			referrerpolicy="no-referrer"
			:class="$style.nodeIconImage"
		/>
		<N8nIcon v-else-if="supportedIconName" :icon="supportedIconName" :style="fontStyleData" />
		<div v-else :class="$style.nodeIconPlaceholder">
			{{ nodeTypeName ? nodeTypeName.charAt(0) : '?' }}
		</div>

		<!-- Badge icon, for example used for HTTP based nodes -->
		<div v-if="badge" :class="$style.badge" :style="badgeStyleData">
			<!-- Only render the (memory-heavy) tooltip when the badge actually has one -->
			<N8nTooltip v-if="badge.tooltip" placement="top">
				<template #content>{{ badge.tooltip }}</template>
				<N8nAvatar
					v-if="badge.type === 'avatar'"
					:first-name="badge.firstName"
					:last-name="badge.lastName"
					size="xxsmall"
					data-test-id="node-icon-badge-avatar"
				/>
				<N8nNodeIcon
					v-else
					:type="badge.type"
					:src="badge.src"
					:name="badge.name"
					:size="badgeSize"
				/>
			</N8nTooltip>
			<template v-else>
				<N8nAvatar
					v-if="badge.type === 'avatar'"
					:first-name="badge.firstName"
					:last-name="badge.lastName"
					size="xxsmall"
					data-test-id="node-icon-badge-avatar"
				/>
				<N8nNodeIcon
					v-else
					:type="badge.type"
					:src="badge.src"
					:name="badge.name"
					:size="badgeSize"
				/>
			</template>
		</div>
	</div>
	<div v-else :class="$style.nodeIconPlaceholder">
		{{ nodeTypeName ? nodeTypeName.charAt(0) : '?' }}
	</div>
</template>

<style lang="scss" module>
.icon {
	height: 100%;
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;

	svg {
		max-width: 100%;
		max-height: 100%;
	}

	img,
	svg {
		pointer-events: none;
	}
}

.nodeIconPlaceholder {
	text-align: center;
}

.nodeIconImage {
	max-width: 100%;
	max-height: 100%;
	width: auto;
	height: auto;
}

.badge {
	position: absolute;
	background: var(--node--icon--badge--color--background, var(--color--background));
	border-radius: 50%;
	// Drive the nested icon's color (its wrapper reads `--node--icon--color`) so an
	// icon badge stays readable against the badge background in both themes.
	// File/image badges are unaffected.
	--node--icon--color: var(--color--text--shade-1);
}
</style>
