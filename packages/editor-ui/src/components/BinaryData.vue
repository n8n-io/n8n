<template>
	<span>
		<div
			:title="fileType"
			data-target="mappable"
			:data-value="mappingData.path"
			:data-name="mappingData.name"
			:class="{
				[$style.pill]: true,
				[$style.mappable]: mappingEnabled,
				[$style.dragged]: draggingPath === mappingData.value,
			}"
		>
			<span :class="$style.label">
				<div :class="$style.iconWrapper">
					<font-awesome-icon :icon="fileIcon" size="sm" />

					<div :class="$style.metadata">
						<div
							v-if="binaryData.fileName"
							:class="$style.entry"
							data-target="mappable"
							:data-value="getMappablePath('fileName')"
							:data-name="binaryData.fileName"
						>
							<n8n-text size="small" :bold="true"
								>{{ $locale.baseText('runData.fileName') }}: </n8n-text
							>{{ binaryData.fileName }}
						</div>
						<div
							v-if="binaryData.directory"
							:class="$style.entry"
							data-target="mappable"
							:data-value="getMappablePath('directory')"
							:data-name="binaryData.directory"
						>
							<n8n-text size="small" :bold="true"
								>{{ $locale.baseText('runData.directory') }}: </n8n-text
							>{{ binaryData.directory }}
						</div>
						<div
							v-if="binaryData.fileExtension"
							:class="$style.entry"
							data-target="mappable"
							:data-value="getMappablePath('fileExtension')"
							:data-name="binaryData.fileExtension"
						>
							<n8n-text size="small" :bold="true"
								>{{ $locale.baseText('runData.fileExtension') }}:</n8n-text
							>
							{{ binaryData.fileExtension }}
						</div>
						<div
							v-if="binaryData.mimeType"
							:class="$style.entry"
							data-target="mappable"
							:data-value="getMappablePath('mimeType')"
							:data-name="binaryData.mimeType"
						>
							<n8n-text size="small" :bold="true"
								>{{ $locale.baseText('runData.mimeType') }}:
							</n8n-text>
							{{ binaryData.mimeType }}
						</div>
						<div
							v-if="binaryData.fileSize"
							:class="$style.entry"
							data-target="mappable"
							:data-value="getMappablePath('fileSize')"
							:data-name="binaryData.fileSize"
						>
							<n8n-text size="small" :bold="true"
								>{{ $locale.baseText('runData.fileSize') }}: </n8n-text
							>{{ binaryData.fileSize }}
						</div>
					</div>
					<!-- <BinaryDataDisplayEmbed :binaryData="data.data" /> -->
				</div>

				<span>
					{{ fileName }}
					<font-awesome-icon
						:class="$style.infoIcon"
						icon="search"
						title="Show Binary Data"
						size="sm"
						@click="displayBinaryData(itemIndex || 0, mappingData.path!)"
					/>
				</span>
			</span>
		</div>
	</span>
</template>

<script lang="ts">
import type { BinaryObject } from 'n8n-workflow';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';

// import BinaryDataDisplayEmbed from '@/components/BinaryDataDisplayEmbed.vue';

export default defineComponent({
	name: 'BinaryData',
	// components: {
	// 	BinaryDataDisplayEmbed,
	// },
	props: {
		data: {
			type: Object as PropType<BinaryObject>,
		},
		dataValue: {
			type: String,
		},
		draggingPath: {
			type: String,
		},
		itemIndex: {
			type: Number,
		},
		mappingEnabled: {
			type: Boolean,
		},
		path: {
			type: String,
		},
	},
	methods: {
		displayBinaryData(index: number, key: string) {
			this.$emit('displayBinaryData', index, key);
		},
		getMappablePath(property: string) {
			// TODO: This should be improved and cleaned up
			const path = this.mappingData.path
				?.split('.')
				.map((item) => {
					if (item.includes('[') && item.includes(']')) {
						return `.${item}`;
					}
					return `["${item}"]`;
				})
				.join('');
			return `{{ $data${path}.data.${property} }}`;
		},
	},
	computed: {
		binaryData() {
			return this.data.data;
		},
		fileIcon() {
			switch (this.binaryData.fileType) {
				case 'image':
					return 'image';
				case 'text':
					return 'edit';
				case 'video':
					return 'video';
			}

			return 'file';
		},
		fileName() {
			return this.binaryData.fileName || '[no filename]';
		},
		fileType() {
			return this.binaryData.fileType || 'unknown';
		},
		mappingData() {
			return {
				value: this.dataValue,
				name: this.fileName,
				path: this.dataValue,
			};
		},
	},
});
</script>

<style lang="scss" module>
.pill {
	float: left;
	display: inline-flex;
	height: 24px;
	padding: 0 var(--spacing-3xs);
	border: 1px solid var(--color-foreground-xdark);
	border-radius: 4px;
	background-color: var(--color-background-light);
	font-size: var(--font-size-2xs);
	color: var(--color-text-dark);
	position: relative;

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

	.metadata {
		background-color: var(--color-background-light);
		border: 1px solid var(--color-foreground-xdark);
		border-radius: 4px;
		display: none;
		font-size: var(--font-size-2xs);
		padding: var(--spacing-3xs);
		width: 200px;

		position: absolute;
		top: 21px;
		left: -1px;

		.entry {
			display: inline-flex;
			padding: 3px var(--spacing-3xs);
		}
	}

	&.mappable {
		cursor: grab;

		&:hover {
			&,
			span span {
				background-color: var(--color-background-default);
				border-color: var(--color-foreground-xdark);
			}

			.entry:hover {
				background-color: var(--color-background-default);
				border: 1px solid var(--color-foreground-xdark);
				border-radius: 4px;
			}
		}
	}

	&.dragged {
		&,
		&:hover,
		span {
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

	.iconWrapper:hover {
		.metadata {
			display: block;
			z-index: 2;
		}
	}

	.infoIcon {
		margin-left: 4px;
		cursor: pointer;
	}
}

.label {
	> span {
		margin-left: var(--spacing-3xs);
		padding-left: var(--spacing-3xs);
		border-left: 1px solid var(--color-foreground-xdark);
	}
}
</style>
