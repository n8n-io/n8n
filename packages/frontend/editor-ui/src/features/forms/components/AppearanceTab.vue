<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { ElSwitch } from 'element-plus';
import AppearanceControl from './AppearanceControl.vue';
import {
	CSS_VARIABLE_CONTROLS,
	CSS_VARIABLE_GROUPS,
	CSS_VARIABLE_DEFAULTS,
} from '../constants/cssVariableMap';
import type { CssVarGroup } from '../constants/cssVariableMap';

type Scope = 'current' | 'all';

const props = defineProps<{
	modelValue: Record<string, string>;
	appendAttribution: boolean;
	scope: Scope;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: Record<string, string>];
	'update:appendAttribution': [value: boolean];
	'update:scope': [value: Scope];
}>();

const i18n = useI18n();

const controlsByGroup = computed(() => {
	const map = new Map<CssVarGroup, typeof CSS_VARIABLE_CONTROLS>();
	for (const group of CSS_VARIABLE_GROUPS) {
		map.set(
			group.key,
			CSS_VARIABLE_CONTROLS.filter((c) => c.group === group.key),
		);
	}
	return map;
});

function effectiveValue(variable: string): string {
	return props.modelValue[variable] ?? CSS_VARIABLE_DEFAULTS[variable] ?? '';
}

function onControlUpdate(variable: string, value: string) {
	const defaultVal = CSS_VARIABLE_DEFAULTS[variable] ?? '';
	const next = { ...props.modelValue };
	if (value === defaultVal) {
		delete next[variable];
	} else {
		next[variable] = value;
	}
	emit('update:modelValue', next);
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.scopeToggle">
			<button
				:class="[$style.scopeBtn, scope === 'current' && $style.scopeBtnActive]"
				@click="emit('update:scope', 'current')"
			>
				{{ i18n.baseText('formStep.appearance.scope.current') }}
			</button>
			<button
				:class="[$style.scopeBtn, scope === 'all' && $style.scopeBtnActive]"
				@click="emit('update:scope', 'all')"
			>
				{{ i18n.baseText('formStep.appearance.scope.all') }}
			</button>
		</div>

		<div :class="$style.attributionRow">
			<span :class="$style.attributionLabel">
				{{ i18n.baseText('formStep.appearance.control.appendAttribution') }}
			</span>
			<ElSwitch
				:model-value="appendAttribution"
				@update:model-value="(v) => emit('update:appendAttribution', Boolean(v))"
			/>
		</div>

		<div :class="$style.groups">
			<section v-for="group in CSS_VARIABLE_GROUPS" :key="group.key" :class="$style.group">
				<h4 :class="$style.groupTitle">{{ i18n.baseText(group.labelKey) }}</h4>
				<AppearanceControl
					v-for="control in controlsByGroup.get(group.key)"
					:key="control.variable"
					:control="control"
					:model-value="effectiveValue(control.variable)"
					@update:model-value="(v) => onControlUpdate(control.variable, v)"
				/>
			</section>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.scopeToggle {
	display: flex;
	align-items: center;
	gap: 0;
	align-self: flex-end;
	margin-bottom: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}

.scopeBtn {
	padding: var(--spacing--4xs) var(--spacing--xs);
	background: none;
	border: none;
	cursor: pointer;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	font-family: var(--font-family);
	transition:
		background 0.1s,
		color 0.1s;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.scopeBtnActive {
	background: var(--color--foreground);
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--bold);
}

.attributionRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--3xs) 0;
	margin-bottom: var(--spacing--sm);
	border-bottom: var(--border);
}

.attributionLabel {
	font-size: var(--font-size--sm);
	color: var(--color--text);
}

.groups {
	flex: 1;
	overflow-y: auto;
	padding-right: var(--spacing--3xs);
}

.group {
	margin-bottom: var(--spacing--lg);
}

.groupTitle {
	margin: 0 0 var(--spacing--3xs);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}
</style>
