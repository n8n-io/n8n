<script setup lang="ts">
import { N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

export type AgentAvatarKind = 'pass' | 'work' | 'fail' | 'idle' | 'strong' | 'waiting';
export type AgentAvatarSize = 'xs' | 'row' | 'sm' | 'md' | 'lg';

const props = defineProps<{
	kind: AgentAvatarKind;
	size: AgentAvatarSize;
	/** The case's scenario tag, e.g. "Vague" or "Custom" — folded into the
	 *  accessible label so a collapsed summary pill's avatars don't reduce to
	 *  status alone. */
	label?: string;
}>();

const i18n = useI18n();

const toneByKind: Record<AgentAvatarKind, 'good' | 'warn' | 'bad' | 'none' | 'neutral'> = {
	pass: 'good',
	strong: 'good',
	work: 'warn',
	fail: 'bad',
	idle: 'neutral',
	waiting: 'none',
};

const tone = computed(() => toneByKind[props.kind]);

const iconByKind: Record<AgentAvatarKind, IconName> = {
	pass: 'bot-pass',
	strong: 'bot-pass',
	work: 'bot-warning',
	fail: 'bot-fail',
	idle: 'bot-idle',
	waiting: 'bot-waiting',
};

const icon = computed(() => iconByKind[props.kind]);

const statusLabel = computed(() => {
	const labelByKind: Record<AgentAvatarKind, string> = {
		pass: i18n.baseText('instanceAi.testAgentPreview.avatar.passed'),
		strong: i18n.baseText('instanceAi.testAgentPreview.avatar.passed'),
		work: i18n.baseText('instanceAi.testAgentPreview.avatar.needsWork'),
		fail: i18n.baseText('instanceAi.testAgentPreview.avatar.couldntFinish'),
		idle: i18n.baseText('instanceAi.testAgentPreview.avatar.notRun'),
		waiting: i18n.baseText('instanceAi.testAgentPreview.avatar.notRun'),
	};
	return labelByKind[props.kind];
});

const label = computed(() =>
	props.label ? `${props.label} — ${statusLabel.value}` : statusLabel.value,
);
</script>

<template>
	<span
		:class="[$style.avatar, $style[size], $style[tone]]"
		:data-tone="tone"
		:data-waiting="kind === 'waiting' ? '' : undefined"
		:aria-label="label"
		:title="label"
		role="img"
	>
		<N8nIcon :class="$style.icon" :icon="icon" />
		<span v-if="tone === 'warn'" :class="$style.badge" aria-hidden="true">!</span>
		<span v-else-if="kind === 'strong'" :class="$style.sparkle" aria-hidden="true">✦</span>
	</span>
</template>

<style lang="scss" module>
.avatar {
	--avatar-size: 22px;
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: var(--avatar-size);
	height: var(--avatar-size);
	border-radius: calc(var(--avatar-size) * 0.3);
	box-shadow: inset 0 0 0 1px var(--ring-color, var(--border-color));
	background: var(--fill-color, var(--background--subtle));
	color: var(--icon-color, var(--text-color--subtle));
}

.icon {
	--c: currentColor;

	width: 80%;
	height: 80%;
}

.xs {
	--avatar-size: 18px;
}

.row {
	--avatar-size: 20px;
}

.sm {
	--avatar-size: 22px;
}

.md {
	--avatar-size: 30px;
}

.lg {
	--avatar-size: 34px;
}

.good {
	--fill-color: var(--color--success--tint-4);
	--ring-color: var(--color--success--tint-2);
	--icon-color: var(--color--success);
}

.warn {
	// Warning only defines tint-1 and tint-2 (no tint-4) — tint-2 is its
	// lightest shade, matching the fill role tint-4 plays for success/danger.
	--fill-color: var(--color--warning--tint-2);
	--ring-color: var(--color--warning--tint-1);
	--icon-color: var(--color--warning);
}

.bad {
	--fill-color: var(--color--danger--tint-4);
	--ring-color: var(--color--danger--tint-2);
	--icon-color: var(--color--danger);
}

.none {
	--fill-color: var(--background--subtle);
	--ring-color: var(--border-color);
	--icon-color: var(--text-color--subtle);
}

.neutral {
	--fill-color: var(--background--subtle);
	--ring-color: var(--border-color);
}

.badge {
	position: absolute;
	top: calc(var(--avatar-size) * -0.1);
	right: calc(var(--avatar-size) * -0.1);
	display: flex;
	align-items: center;
	justify-content: center;
	width: calc(var(--avatar-size) * 0.3);
	height: calc(var(--avatar-size) * 0.3);
	border-radius: var(--radius--full);
	background: var(--color--warning);
	color: var(--color--warning--tint-2);
	font-size: calc(var(--avatar-size) * 0.28);
	line-height: 1;
	font-weight: var(--font-weight--bold);
}

.sparkle {
	position: absolute;
	top: calc(var(--avatar-size) * -0.18);
	right: calc(var(--avatar-size) * -0.18);
	font-size: calc(var(--avatar-size) * 0.4);
	line-height: 1;
	color: var(--color--success);
}

[data-waiting] .icon {
	animation: agent-avatar-bob 1.6s infinite;

	:global(.eyes) {
		transform-box: fill-box;
		transform-origin: center;
		animation: agent-avatar-eyes-look 3.2s ease-in-out infinite;
		animation-delay: calc(var(--i, 0) * -0.83s);
	}
}

@media (prefers-reduced-motion: reduce) {
	[data-waiting] .icon {
		animation: none;

		:global(.eyes) {
			animation: none;
		}
	}
}

@keyframes agent-avatar-bob {
	0% {
		transform: translateY(0);
		animation-timing-function: ease-out;
	}
	35% {
		transform: translateY(-12%);
		animation-timing-function: ease-in;
	}
	100% {
		transform: translateY(0);
	}
}

@keyframes agent-avatar-eyes-look {
	0%,
	18% {
		transform: translateX(0);
	}
	26%,
	40% {
		transform: translateX(-3px);
	}
	48%,
	52% {
		transform: translateX(-3px) scaleY(0.15);
	}
	58%,
	72% {
		transform: translateX(3px);
	}
	80%,
	100% {
		transform: translateX(0);
	}
}
</style>
