<script lang="ts" setup>
import { computed } from 'vue';
import type { INodeUi, Schema } from '@/Interface';
import { checkExhaustive } from '@/utils/typeGuards';
import { shorten } from '@/utils/typesUtils';
import { getMappedExpression } from '@/utils/mappingUtils';
import TextWithHighlights from './TextWithHighlights.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

type Props = {
	schema: Schema;
	level: number;
	parent: Schema | null;
	subKey: string;
	paneType: 'input' | 'output';
	mappingEnabled: boolean;
	draggingPath: string;
	distanceFromActive?: number;
	node: INodeUi | null;
	search: string;
};

const props = defineProps<Props>();

const isSchemaValueArray = computed(() => Array.isArray(props.schema.value));
const schemaArray = computed(
	() => (isSchemaValueArray.value ? props.schema.value : []) as Schema[],
);
const isSchemaParentTypeArray = computed(() => props.parent?.type === 'array');

const key = computed((): string | undefined => {
	return isSchemaParentTypeArray.value ? `[${props.schema.key}]` : props.schema.key;
});
const schemaName = computed(() =>
	isSchemaParentTypeArray.value ? `${props.schema.type}[${props.schema.key}]` : props.schema.key,
);

const text = computed(() =>
	Array.isArray(props.schema.value) ? '' : shorten(props.schema.value, 600, 0),
);

const dragged = computed(() => props.draggingPath === props.schema.path);

const getJsonParameterPath = (path: string): string =>
	getMappedExpression({
		nodeName: props.node!.name,
		distanceFromActive: props.distanceFromActive ?? 1,
		path,
	});

const getIconBySchemaType = (type: Schema['type']): string => {
	switch (type) {
		case 'object':
			return 'cube';
		case 'array':
			return 'list';
		case 'string':
		case 'null':
			return 'font';
		case 'number':
			return 'hashtag';
		case 'boolean':
			return 'check-square';
		case 'function':
			return 'code';
		case 'bigint':
			return 'calculator';
		case 'symbol':
			return 'sun';
		case 'undefined':
			return 'ban';
		default:
			checkExhaustive(type);
			return '';
	}
};
</script>

<template>
	<div :class="$style.item" data-test-id="run-data-schema-item">
		<div :class="$style.itemContent">
			<div
				v-if="level > 0 || (level === 0 && !isSchemaValueArray)"
				:title="schema.type"
				:class="{
					[$style.pill]: true,
					[$style.mappable]: mappingEnabled,
					[$style.highlight]: dragged,
				}"
			>
				<span
					:class="$style.label"
					:data-value="getJsonParameterPath(schema.path)"
					:data-name="schemaName"
					:data-path="schema.path"
					:data-depth="level"
					data-target="mappable"
				>
					<FontAwesomeIcon :icon="getIconBySchemaType(schema.type)" size="sm" />
					<TextWithHighlights
						v-if="isSchemaParentTypeArray"
						:content="props.parent?.key"
						:search="props.search"
					/>
					<TextWithHighlights
						v-if="key"
						:class="{ [$style.arrayIndex]: isSchemaParentTypeArray }"
						:content="key"
						:search="props.search"
					/>
				</span>
			</div>

			<span v-if="text" :class="$style.text" data-test-id="run-data-schema-item-value">
				<template v-for="(line, index) in text.split('\n')" :key="`line-${index}`">
					<span v-if="index > 0" :class="$style.newLine">\n</span>
					<TextWithHighlights :content="line" :search="props.search" />
				</template>
			</span>
		</div>

		<input v-if="level > 0 && isSchemaValueArray" :id="subKey" type="checkbox" inert checked />
		<label v-if="level > 0 && isSchemaValueArray" :class="$style.toggle" :for="subKey">
			<FontAwesomeIcon icon="angle-right" />
		</label>

		<div v-if="isSchemaValueArray" :class="$style.sub">
			<div :class="$style.innerSub">
				<RunDataSchemaItem
					v-for="s in schemaArray"
					:key="s.key ?? s.type"
					:schema="s"
					:level="level + 1"
					:parent="schema"
					:pane-type="paneType"
					:sub-key="`${subKey}-${s.key ?? s.type}`"
					:mapping-enabled="mappingEnabled"
					:dragging-path="draggingPath"
					:distance-from-active="distanceFromActive"
					:node="node"
					:search="search"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@import '@/styles/variables';

.item {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	line-height: var(--font-line-height-loose);
	position: relative;
	column-gap: var(--spacing-2xs);

	+ .item {
		margin-top: var(--spacing-2xs);
	}

	.item {
		padding-left: var(--spacing-l);
	}

	input {
		display: none;

		~ .sub {
			transition:
				grid-template-rows 0.2s $ease-out-expo,
				opacity 0.2s $ease-out-expo,
				transform 0.2s $ease-out-expo;
			transform: translateX(-8px);
			opacity: 0;
			margin-bottom: 0;

			.innerSub {
				min-height: 0;
			}
		}

		&:checked {
			~ .toggle svg {
				transform: rotate(90deg);
			}

			~ .sub {
				transform: translateX(0);
				opacity: 1;
				grid-template-rows: 1fr;
			}
		}
	}
}

.itemContent {
	display: flex;
	gap: var(--spacing-2xs);
	align-items: baseline;
	flex-grow: 1;
	min-width: 0;
}

.sub {
	display: grid;
	grid-template-rows: 0fr;
	overflow: hidden;
	flex-basis: 100%;
	scroll-margin: 64px;
}

.innerSub {
	display: inline-flex;
	flex-direction: column;
	order: -1;
	min-width: 0;

	.innerSub > div:first-child {
		margin-top: var(--spacing-2xs);
	}
}

:global(.highlightSchema) {
	.pill.mappable {
		&,
		&:hover,
		span,
		&:hover span span {
			color: var(--color-primary);
			border-color: var(--color-primary-tint-1);
			background-color: var(--color-primary-tint-3);

			svg {
				path {
					fill: var(--color-primary);
				}
			}
		}
	}
}

.pill {
	display: inline-flex;
	height: 24px;
	padding: 0 var(--spacing-3xs);
	border: 1px solid var(--color-foreground-light);
	border-radius: var(--border-radius-base);
	background-color: var(--color-background-xlight);
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	max-width: 50%;

	path {
		fill: var(--color-text-light);
	}

	&.mappable {
		cursor: grab;

		&:hover {
			&,
			span span {
				background-color: var(--color-background-light);
				border-color: var(--color-foreground-base);
			}
		}
	}
}

.label {
	display: flex;
	min-width: 0;
	align-items: center;

	> span {
		display: flex;
		align-items: center;

		margin-left: var(--spacing-3xs);
		padding-left: var(--spacing-3xs);
		border-left: 1px solid var(--color-foreground-light);

		overflow: hidden;

		span {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		&.arrayIndex {
			border: 0;
			padding-left: 0;
			margin-left: 0;
		}
	}
}

.text {
	display: block;
	font-weight: var(--font-weight-normal);
	font-size: var(--font-size-2xs);
	overflow: hidden;
	word-break: break-word;

	.newLine {
		font-family: var(--font-family-monospace);
		color: var(--color-line-break);
		padding-right: 2px;
	}
}

.toggle {
	display: flex;
	position: absolute;
	padding: var(--spacing-4xs) var(--spacing-2xs);
	left: 0;
	top: 0;
	justify-content: center;
	align-items: center;
	cursor: pointer;
	user-select: none;
	font-weight: normal;
	font-size: var(--font-size-s);
	overflow: hidden;

	svg {
		transition: transform 0.2s $ease-out-expo;
	}
}
</style>
