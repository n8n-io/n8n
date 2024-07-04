<template>
	<div v-if="isObject(value)" class="n8n-tree">
		<div v-for="(label, i) in Object.keys(value)" :key="i" :class="classes">
			<div v-if="isSimple(value[label])" :class="$style.simple">
				<slot v-if="$slots.label" name="label" :label="label" :path="getPath(label)" />
				<span v-else>{{ label }}</span>
				<span>:</span>
				<slot v-if="$slots.value" name="value" :value="value[label]" />
				<span v-else>{{ value[label] }}</span>
			</div>
			<div v-else>
				<slot v-if="$slots.label" name="label" :label="label" :path="getPath(label)" />
				<span v-else>{{ label }}</span>
				<n8n-tree
					:path="getPath(label)"
					:depth="depth + 1"
					:value="value[label] as Record<string, unknown>"
					:node-class="nodeClass"
				>
					<template v-for="(_, name) in $slots" #[name]="data">
						<slot :name="name" v-bind="data"></slot>
					</template>
				</n8n-tree>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { computed, useCssModule } from 'vue';

interface TreeProps {
	value?: Record<string, unknown>;
	path?: Array<string | number>;
	depth?: number;
	nodeClass?: string;
}

defineSlots<{
	[key: string]: (props: {
		label?: string;
		path?: Array<string | number>;
		value?: unknown;
	}) => never;
}>();

defineOptions({ name: 'N8nTree' });
const props = withDefaults(defineProps<TreeProps>(), {
	value: () => ({}),
	path: () => [],
	depth: 0,
	nodeClass: '',
});

const $style = useCssModule();
const classes = computed((): Record<string, boolean> => {
	return { [props.nodeClass]: !!props.nodeClass, [$style.indent]: props.depth > 0 };
});

const isObject = (data: unknown): data is Record<string, unknown> => {
	return typeof data === 'object' && data !== null;
};

const isSimple = (data: unknown): boolean => {
	if (data === null || data === undefined) {
		return true;
	}

	if (typeof data === 'object' && Object.keys(data).length === 0) {
		return true;
	}

	if (Array.isArray(data) && data.length === 0) {
		return true;
	}

	return typeof data !== 'object';
};

const getPath = (key: string): Array<string | number> => {
	if (Array.isArray(props.value)) {
		return [...props.path, parseInt(key, 10)];
	}
	return [...props.path, key];
};
</script>

<style lang="scss" module>
$--spacing: var(--spacing-s);

.indent {
	margin-left: $--spacing;
}

.simple {
	text-indent: calc($--spacing * -1);
	margin-left: $--spacing;
	max-width: 300px;
}
</style>
