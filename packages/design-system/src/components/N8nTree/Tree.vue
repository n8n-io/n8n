<template>
	<div class="n8n-tree">
		<div v-for="(label, i) in Object.keys(value)" :key="i" :class="classes">
			<div :class="$style.simple" v-if="isSimple(value[label])">
				<slot
					v-if="$scopedSlots.label"
					name="label"
					v-bind:label="label"
					v-bind:path="getPath(label)"
				/>
				<span v-else>{{ label }}</span>
				<span>:</span>
				<slot v-if="$scopedSlots.value" name="value" v-bind:value="value[label]" />
				<span v-else>{{ value[label] }}</span>
			</div>
			<div v-else>
				<slot
					v-if="$scopedSlots.label"
					name="label"
					v-bind:label="label"
					v-bind:path="getPath(label)"
				/>
				<span v-else>{{ label }}</span>
				<n8n-tree
					:path="getPath(label)"
					:depth="depth + 1"
					:value="value[label]"
					:nodeClass="nodeClass"
				>
					<template v-for="(index, name) in $scopedSlots" #[name]="data">
						<slot :name="name" v-bind="data"></slot>
					</template>
				</n8n-tree>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';

export default defineComponent({
	name: 'n8n-tree',
	components: {},
	props: {
		value: {
			type: Object as PropType<Record<string, unknown>>,
			default: () => ({}),
		},
		path: {
			type: Array as PropType<string[]>,
			default: () => [],
		},
		depth: {
			type: Number,
			default: 0,
		},
		nodeClass: {
			type: String,
			default: '',
		},
	},
	computed: {
		classes(): Record<string, boolean> {
			return { [this.nodeClass]: !!this.nodeClass, [this.$style.indent]: this.depth > 0 };
		},
	},
	methods: {
		isSimple(data: unknown): boolean {
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
		},
		getPath(key: string): unknown[] {
			if (Array.isArray(this.value)) {
				return [...this.path, parseInt(key, 10)];
			}
			return [...this.path, key];
		},
	},
});
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
