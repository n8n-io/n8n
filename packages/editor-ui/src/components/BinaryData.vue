<template>
	<div
		:title="fileType"
		data-target="mappable"
		:data-value="mappingData.value"
		:data-name="mappingData.name"
		:class="{
			[$style.pill]: true,
			[$style.mappable]: mappingEnabled,
			[$style.dragged]: draggingPath === mappingData.value,
		}"
	>
		<span :class="$style.label">
			<font-awesome-icon :icon="fileIcon" size="sm" />
			<span>
				{{ fileName }}
				<n8n-tooltip placement="top">
					<template #content>
						<div>
							<div v-if="binaryData.fileName">
								<div>
									<n8n-text size="small" :bold="true"
										>{{ $locale.baseText('runData.fileName') }}:
									</n8n-text>
								</div>
								<div :class="$style.binaryValue">{{ binaryData.fileName }}</div>
							</div>
							<div v-if="binaryData.directory">
								<div>
									<n8n-text size="small" :bold="true"
										>{{ $locale.baseText('runData.directory') }}:
									</n8n-text>
								</div>
								<div :class="$style.binaryValue">{{ binaryData.directory }}</div>
							</div>
							<div v-if="binaryData.fileExtension">
								<div>
									<n8n-text size="small" :bold="true"
										>{{ $locale.baseText('runData.fileExtension') }}:</n8n-text
									>
								</div>
								<div :class="$style.binaryValue">{{ binaryData.fileExtension }}</div>
							</div>
							<div v-if="binaryData.mimeType">
								<div>
									<n8n-text size="small" :bold="true"
										>{{ $locale.baseText('runData.mimeType') }}:
									</n8n-text>
								</div>
								<div :class="$style.binaryValue">{{ binaryData.mimeType }}</div>
							</div>
							<div v-if="binaryData.fileSize">
								<div>
									<n8n-text size="small" :bold="true"
										>{{ $locale.baseText('runData.fileSize') }}:
									</n8n-text>
								</div>
								<div :class="$style.binaryValue">{{ binaryData.fileSize }}</div>
							</div>

							<!-- <BinaryDataDisplayEmbed :binaryData="data.data" /> -->
						</div>
					</template>
					<font-awesome-icon :class="$style.infoIcon" icon="info-circle" size="sm" />
				</n8n-tooltip>
			</span>
		</span>
	</div>
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
		mappingEnabled: {
			type: Boolean,
		},
		path: {
			type: String,
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
	border: 1px solid var(--color-foreground-dark);
	border-radius: 4px;
	background-color: var(--color-background-light);
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

	.infoIcon {
		margin-left: 4px;
	}
}

.label {
	> span {
		margin-left: var(--spacing-3xs);
		padding-left: var(--spacing-3xs);
		border-left: 1px solid var(--color-foreground-dark);
	}
}
</style>
