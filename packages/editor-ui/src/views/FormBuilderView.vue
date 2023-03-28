<script lang="ts">
import { Editor, Frame, Canvas, Blueprint } from '@v-craft/core';
import {
	Container,
	FormInput,
	FormSubmit,
	Heading,
	Paragraph,
	SettingsPanel,
	ExportsPanel,
} from '@/components/form-builder';
import { defineComponent, onMounted, ref } from 'vue';
import { useFormsStore } from '@/stores';
import { useRoute } from 'vue-router/composables';

export default defineComponent({
	components: {
		Editor,
		Frame,
		Canvas,
		Blueprint,
		SettingsPanel,
		ExportsPanel,
		Container,
		FormInput,
		FormSubmit,
		Heading,
		Paragraph,
	},
	setup() {
		const editorRef = ref(null);
		const formsStore = useFormsStore();
		const route = useRoute();
		const form = formsStore.formById(route.params.id);
		const title = ref('');
		const loading = ref(true);

		onMounted(async () => {
			const form = await formsStore.fetchForm({ id: route.params.id });
			title.value = form.title;
			loading.value = false;

			if (form.schema) {
				editorRef.value!.editor.import(form.schema);
			}
		});

		const resolverMap = ref({
			Canvas,
			Container,
			FormInput,
			FormSubmit,
			Heading,
			Paragraph,
		});

		function onSave() {
			const schema = editorRef.value!.editor.export();

			loading.value = true;
			formsStore.updateForm({ ...form.value!, title: title.value, schema });

			loading.value = false;
		}

		return {
			resolverMap,
			form,
			title,
			loading,
			editorRef,
			onSave,
		};
	},
});
</script>

<template>
	<div :class="$style.formBuilder">
		<div :class="$style.header" v-if="form">
			<n8n-input :disabled="loading" v-model="title" />
			<n8n-button class="ml-s" :disabled="loading" :loading="loading" @click="onSave">
				Save
			</n8n-button>
		</div>
		<Editor component="main" :class="$style.container" :resolverMap="resolverMap" ref="editorRef">
			<div :class="$style.aside">
				<SettingsPanel />

				<div class="p-s">
					<n8n-heading bold color="text-base" size="small"> Components </n8n-heading>
				</div>

				<Blueprint component="div" :class="$style.blueprint">
					<n8n-icon :class="$style.blueprintIcon" icon="heading" />
					<n8n-text>Heading</n8n-text>
					<template #blueprint>
						<Heading />
					</template>
				</Blueprint>
				<Blueprint component="div" :class="$style.blueprint">
					<n8n-icon :class="$style.blueprintIcon" icon="paragraph" />
					<n8n-text>Paragraph</n8n-text>
					<template #blueprint>
						<Paragraph />
					</template>
				</Blueprint>
				<Blueprint component="div" :class="$style.blueprint">
					<n8n-icon :class="$style.blueprintIcon" icon="keyboard" />
					<n8n-text>Input</n8n-text>
					<template #blueprint>
						<FormInput />
					</template>
				</Blueprint>
				<Blueprint component="div" :class="$style.blueprint">
					<n8n-icon :class="$style.blueprintIcon" icon="cube" />
					<n8n-text>Container</n8n-text>
					<template #blueprint>
						<Canvas component="Container" />
					</template>
				</Blueprint>
				<Blueprint component="div" :class="$style.blueprint">
					<n8n-icon :class="$style.blueprintIcon" icon="caret-square-right" />
					<n8n-text>Submit</n8n-text>
					<template #blueprint>
						<FormSubmit />
					</template>
				</Blueprint>
			</div>
			<Frame component="div" :class="$style.preview">
				<Canvas component="Container">
					<Heading content="My awesome form" />
					<Paragraph content="Enter your data and execute the workflow" />
					<FormInput label="My input" placeholder="Enter a value" />
					<FormSubmit>Submit</FormSubmit>
				</Canvas>
			</Frame>
		</Editor>
	</div>
</template>

<style lang="scss" module>
.formBuilder {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
}

.header {
	width: 100%;
	display: flex;
	flex-direction: row;
	background: var(--color-background-xlight);
	padding: var(--spacing-s);
	border-bottom: 1px solid var(--color-foreground-base);
}

.container {
	display: flex;
	height: 100%;
}

.aside {
	width: 240px;
	background: white;
	border-right: 1px solid var(--color-foreground-base);
}

.preview {
	flex: 1;
	margin: var(--spacing-s);
}

.blueprint {
	padding: var(--spacing-s);
	cursor: pointer;
	transition: background 0.3s ease;

	&:hover,
	&:focus {
		background: var(--color-background-base);
	}
}

.blueprintIcon {
	margin-right: var(--spacing-2xs);
}
</style>
