<script lang="ts" setup>
import { useTestDefinitionForm } from '@/components/Evaluations/composables/useTestDefinitionForm';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { VIEWS } from '@/constants';
import { useExecutionsStore } from '@/stores/executions.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useAnnotationTagsStore } from '@/stores/tags.store';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { N8nLoading } from '@n8n/design-system';
import { useRoute, useRouter } from 'vue-router';

const props = defineProps<{
	name: string;
}>();

const { state, createTest, updateTest } = useTestDefinitionForm();
const testDefinitionStore = useTestDefinitionStore();

const tagsStore = useAnnotationTagsStore();
const executionsStore = useExecutionsStore();
const toast = useToast();
const telemetry = useTelemetry();
const router = useRouter();
const route = useRoute();

function generateTagFromName(name: string): string {
	let tag = name.toLowerCase().replace(/\s+/g, '_');
	if (tag.length > 18) {
		const start = tag.slice(0, 10);
		const end = tag.slice(-8);
		tag = `${start}..${end}`;
	}
	return tag;
}

async function createTag(tagName: string) {
	try {
		const newTag = await tagsStore.create(tagName, { incrementExisting: true });
		return newTag;
	} catch (error) {
		toast.showError(error, 'Error', error.message);
		throw error;
	}
}

void createTest(props.name).then(async (test) => {
	if (!test) {
		// Fix ME
		throw new Error('no test found');
	}

	const tag = generateTagFromName(test.name);

	const testTag = await createTag(tag);
	state.value.tags.value = [testTag.id];

	if (typeof route.query?.executionId === 'string' && Array.isArray(route.query.annotationTags)) {
		const newTags = [...(route.query.annotationTags as string[]), testTag.id];
		await executionsStore.annotateExecution(route.query.executionId, { tags: newTags });
	}

	await updateTest(test.id);
	testDefinitionStore.updateRunFieldIssues(test.id);

	telemetry.track(
		'User created test',
		{
			test_id: test.id,
			workflow_id: props.name,
			session_id: useRootStore().pushRef,
		},
		{
			withPostHog: true,
		},
	);

	await router.replace({
		name: VIEWS.TEST_DEFINITION_EDIT,
		params: { testId: test.id },
	});
});
</script>

<template>
	<N8nLoading loading :rows="3" />
</template>
