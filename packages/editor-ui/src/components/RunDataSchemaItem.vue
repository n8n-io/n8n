<template>
	<div :class="$style.item">
		<div
			v-if="level > 0 || level === 0 && !isSchemaValueArray"
			:class="{
				[$style.pill]: true,
				[$style.mappable]: mappingEnabled,
				[$style.dragged]: draggingPath === schema.path,
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
				<font-awesome-icon :icon="getIconBySchemaType(schema.type)" size="sm"/>
				<span v-if="isSchemaParentTypeList">{{ parent.key }}</span>
				<span v-if="key" :class="{[$style.listKey]: isSchemaParentTypeList}">{{ key }}</span>
			</span>
		</div>
		<span v-if="!isSchemaValueArray" :class="$style.value">{{ schema.value }}</span>
		<label v-if="level > 0 && isSchemaValueArray" :class="$style.toggle" :for="subKey">
			<input :id="subKey" type="checkbox" checked />
			<font-awesome-icon icon="angle-down" />
		</label>
		<div v-if="isSchemaValueArray" :class="$style.sub">
			<run-data-schema-item v-for="(s, i) in schema.value"
				:key="`${s.type}-${level}-${i}`"
				:schema="s"
				:level="level + 1"
				:parent="schema"
				:sub-key="`${s.type}-${level}-${i}`"
				:mapping-enabled="mappingEnabled"
				:dragging-path="draggingPath"
				:distance-from-active="distanceFromActive"
				:node="node"
				:style="{transitionDelay: transitionDelay(i)}"
			/>
		</div>
	</div>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import { INodeUi, Schema } from "@/Interface";
import { checkExhaustive } from "@/utils";

type Props = {
	schema: Schema
	level: number
	parent: Schema | null
	subKey: string
	mappingEnabled: boolean
	draggingPath: string
	distanceFromActive: number
	node: INodeUi | null
}

const props = defineProps<Props>();

const isSchemaValueArray = computed(() => Array.isArray(props.schema.value));
const isSchemaParentTypeList = computed(() => props.parent?.type === 'list');
const key = computed((): string | undefined => isSchemaParentTypeList.value ? `[${props.schema.key}]` : props.schema.key);
const schemaName = computed(() => isSchemaParentTypeList.value ? `${props.schema.type}[${props.schema.key}]` : props.schema.key);

const getJsonParameterPath = (path: string): string => `{{ ${props.distanceFromActive ? '$json' : `$node["${ props.node!.name }"].json`}${path} }}`;
const transitionDelay = (i:number) => `${i * 0.033}s`;

const getIconBySchemaType = (type: Schema['type']): string => {
	switch (type) {
		case 'object':
			return 'cube';
		case 'list':
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
	}

	checkExhaustive(type);
};

</script>

<style lang="scss" module>
@import '@/styles/css-animation-helpers.scss';

.item {
	display: block;
	position: relative;
	transition: all 0.3s $ease-out-expo;

	.item {
		padding-top: var(--spacing-2xs);
		padding-left: var(--spacing-l);
	}
}

.sub {
	display: block;
	overflow: hidden;
	transition: all 0.2s $ease-out-expo;

	&:nth-of-type(1) {
		> .item:nth-of-type(1) {
			padding-top: 0;

			.toggle {
				top: -2px;
			}
		}
	}
}

.pill {
	display: inline-flex;
	height: 24px;
	padding: 0 var(--spacing-3xs);
	border: 1px solid var(--color-foreground-light);
	border-radius: 4px;
	background: var(--color-background-xlight);
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);

	span {
		display: flex;
		height: 100%;
		align-items: center;

		svg {
			path {
				fill: var(--color-text-light);
			}
		}
	}
}

.label {
	> span {
		margin-left: var(--spacing-3xs);
		padding-left: var(--spacing-3xs);
		border-left: 1px solid var(--color-foreground-light);

		&.listKey {
			border: 0;
			padding-left: 0;
			margin-left: 0;
		}
	}
}

.value {
	display: inline-block;
	padding-left: var(--spacing-2xs);
	font-weight: var(--font-weight-normal);
	font-size: var(--font-size-2xs);
}

.toggle {
	display: flex;
	position: absolute;
	padding: var(--spacing-2xs);
	left: 0;
	top: 5px;
	justify-content: center;
	align-items: center;
	cursor: pointer;
	user-select: none;
	font-weight: normal;
	font-size: var(--font-size-s);

	svg {
		transition: all 0.3s $ease-out-expo;
	}

	input {
		width: 0;
		height: 0;
		bottom: 0;
		padding: 0;
		margin: 0;

		&:not(:checked) ~ svg {
			transform: rotate(180deg);
		}
	}

	+ .sub {
		height: 0;

		> .item {
			transform: translateX(-100%);
		}
	}

	&:has(> input:checked) {
		+ .sub {
			height: auto;

      > .item {
				transform: translateX(0);
			}
		}
	}
}

.mappable {
	cursor: grab;

	&:hover {
		&,
		span span {
			background-color: var(--color-background-light);
			border-color: var(--color-foreground-base);
		}
	}
}

.dragged {
	&,
	&:hover,
	span span {
		color: var(--color-primary);
		border-color: var(--color-primary-tint-1);
		background: var(--color-primary-tint-3);
	}
}
</style>
