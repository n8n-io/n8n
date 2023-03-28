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

			console.log({ schema: form.schema });

			editorRef.value!.editor.import(form.schema);

			loading.value = false;
		});

		const resolverMap = ref({
			Canvas,
			Container,
			FormInput,
			FormSubmit,
			Heading,
			Paragraph,
		});

		return {
			resolverMap,
			form,
			title,
			loading,
			editorRef,
		};
	},
});
</script>

<template>
	<div :class="$style.formPreview">
		<div :class="$style.header" v-if="form">
			{{ form.title }}
		</div>
		<Editor
			component="main"
			:enabled="false"
			:class="$style.container"
			:resolverMap="resolverMap"
			ref="editorRef"
		>
			<Frame component="div" :class="$style.preview" />
		</Editor>
	</div>
</template>

<style lang="scss" module>
.formPreview {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;

	div {
		outline: none !important;

		> div {
			padding-left: 0;
		}
	}
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
</style>
