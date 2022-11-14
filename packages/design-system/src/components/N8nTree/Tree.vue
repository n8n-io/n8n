<template>
	<div class="n8n-tree">
		<div
			v-for="(label, i) in Object.keys(value || {})"
			:key="i"
			:class="{ [nodeClass]: !!nodeClass, [$style.indent]: depth > 0 }"
		>
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
					<template v-for="(index, name) in $scopedSlots" v-slot:[name]="data">
						<slot :name="name" v-bind="data"></slot>
					</template>
				</n8n-tree>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-tree',
	components: {},
	props: {
		value: {},
		path: {
			type: Array,
			default: () => [],
		},
		depth: {
			type: Number,
			default: 0,
		},
		nodeClass: {
			type: String,
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
