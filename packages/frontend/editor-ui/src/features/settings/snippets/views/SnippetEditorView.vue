<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { VIEWS } from '@/app/constants';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type { SnippetTestCase } from 'n8n-workflow';
import { runSnippetTests, type SnippetTestResult } from 'n8n-workflow';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useEnvironmentsStore } from '@/features/settings/environments.ee/environments.store';

import SnippetCodeEditor from '../components/SnippetCodeEditor.vue';
import { parseSnippetSignature } from '../snippets.utils';
import { useSnippetsStore } from '../snippets.store';

const i18n = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const documentTitle = useDocumentTitle();
const snippetsStore = useSnippetsStore();
const projectsStore = useProjectsStore();

const snippetId = computed(() =>
	typeof route.params.snippetId === 'string' ? route.params.snippetId : null,
);
const isNew = computed(() => snippetId.value === null);

const loaded = ref(false);
const saving = ref(false);
const name = ref('');
const description = ref('');
const projectId = ref('');
const code = ref('(input) => {\n  return input;\n}');
const tests = ref<SnippetTestCase[]>([]);
const testResults = ref<Array<SnippetTestResult | undefined> | null>(null);
const runningTests = ref(false);

const teamProjects = computed(() =>
	projectsStore.myProjects.filter((project) => project.type === 'team'),
);
const environmentsStore = useEnvironmentsStore();
const editorVariables = computed(() =>
	environmentsStore.scopedVariables.map((variable) => variable.key),
);
// Sibling snippets for $snippets/$project typing + autocomplete in the editor
const editorSnippets = computed(() =>
	snippetsStore.sourcesForProject(projectId.value || undefined),
);
const usageSyntax = computed(
	() => `${projectId.value ? '$project' : '$snippets'}.${name.value || '<name>'}`,
);
const resultByIndex = (index: number) => testResults.value?.[index];
const formatValue = (value: unknown) => {
	const text = JSON.stringify(value) ?? String(value);
	return text.length > 120 ? `${text.slice(0, 120)}…` : text;
};
const resultMessage = (index: number) => {
	const result = resultByIndex(index);
	if (!result) return '';
	if (result.error) return result.error;
	if (result.passed) {
		return i18n.baseText('snippets.tests.passedWith', {
			interpolate: { value: formatValue(result.value) },
		});
	}
	return i18n.baseText('snippets.tests.failedExpected', {
		interpolate: { expected: formatValue(result.expected), value: formatValue(result.value) },
	});
};

// A test needs both sides; a fully empty row is ignored, a half-filled one blocks save
const hasIncompleteTests = computed(() =>
	tests.value.some((test) => (test.code.trim() !== '') !== (test.expected.trim() !== '')),
);

function addTest() {
	const prefix = projectId.value ? '$project' : '$snippets';
	const signature = parseSnippetSignature(code.value);
	const prefill = name.value
		? signature.isFunction
			? `${prefix}.${name.value}(${signature.args.map((arg) => arg.name).join(', ')})`
			: `${prefix}.${name.value}`
		: '';
	tests.value = [...tests.value, { code: prefill, expected: '' }];
	testResults.value = null;
}

function removeTest(index: number) {
	tests.value = tests.value.filter((_, i) => i !== index);
	testResults.value = null;
}

// Test against the unsaved editor state: current code replaces (or adds)
// this snippet in its target scope
function buildTestSources() {
	const sources = snippetsStore.sourcesForProject(projectId.value || undefined);
	const scope = projectId.value ? sources.project : sources.global;
	if (name.value) scope[name.value] = code.value;
	return sources;
}

function runTests() {
	runningTests.value = true;
	try {
		const sources = buildTestSources();
		// Run row by row so results stay aligned with row indexes
		testResults.value = tests.value.map((test) =>
			test.code.trim() === '' || test.expected.trim() === ''
				? undefined
				: runSnippetTests(sources, [test])[0],
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('snippets.tests.run.error'));
	} finally {
		runningTests.value = false;
	}
}

function runSingleTest(index: number) {
	const test = tests.value[index];
	if (!test || test.code.trim() === '' || test.expected.trim() === '') return;
	try {
		const [result] = runSnippetTests(buildTestSources(), [test]);
		const next = testResults.value ? [...testResults.value] : [];
		next[index] = result;
		testResults.value = next;
	} catch (error) {
		toast.showError(error, i18n.baseText('snippets.tests.run.error'));
	}
}

async function save() {
	saving.value = true;
	try {
		const cleanTests = tests.value
			.filter((test) => test.code.trim() !== '' && test.expected.trim() !== '')
			.map((test) => ({ code: test.code, expected: test.expected }));
		if (isNew.value) {
			const created = await snippetsStore.createSnippet({
				name: name.value,
				code: code.value,
				description: description.value || undefined,
				tests: cleanTests,
				projectId: projectId.value || undefined,
			});
			// Stay in the editor; subsequent saves are updates
			await router.replace({ name: VIEWS.SNIPPETS_EDIT, params: { snippetId: created.id } });
		} else {
			await snippetsStore.updateSnippet({
				id: snippetId.value!,
				name: name.value,
				code: code.value,
				description: description.value || null,
				tests: cleanTests,
				projectId: projectId.value || null,
			});
		}
		toast.showMessage({ title: i18n.baseText('snippets.saved'), type: 'success' });
	} catch (error) {
		toast.showError(error, i18n.baseText('snippets.save.error'));
	} finally {
		saving.value = false;
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('snippets.heading'));
	await Promise.all([
		snippetsStore.fetchAll(),
		projectsStore.getMyProjects(),
		// For $vars typing in the editor; unlicensed instances just get none
		environmentsStore.fetchAllVariables().catch(() => []),
	]);

	if (snippetId.value) {
		const snippet = snippetsStore.allSnippets.find((b) => b.id === snippetId.value);
		if (!snippet) {
			toast.showMessage({
				title: i18n.baseText('snippets.notFound'),
				type: 'error',
			});
			await router.push({ name: VIEWS.SNIPPETS_SETTINGS });
			return;
		}
		name.value = snippet.name;
		description.value = snippet.description ?? '';
		projectId.value = snippet.project?.id ?? '';
		code.value = snippet.code;
		tests.value = (snippet.tests ?? []).map((test) => ({
			code: test.code,
			expected: test.expected ?? '',
		}));
	}
	loaded.value = true;
});
</script>

<template>
	<div v-if="loaded" :class="$style.container">
		<div :class="$style.header">
			<div>
				<N8nLink :to="{ name: VIEWS.SNIPPETS_SETTINGS }" size="small">
					&larr; {{ i18n.baseText('snippets.heading') }}
				</N8nLink>
				<N8nHeading size="2xlarge" tag="h1">
					{{
						isNew ? i18n.baseText('snippets.create.title') : i18n.baseText('snippets.edit.title')
					}}
				</N8nHeading>
			</div>
			<N8nButton
				size="large"
				:loading="saving"
				:disabled="!name || !code || hasIncompleteTests"
				data-test-id="snippet-save-button"
				@click="save"
			>
				{{ i18n.baseText('snippets.save') }}
			</N8nButton>
		</div>

		<div :class="$style.meta">
			<N8nInputLabel :label="i18n.baseText('snippets.form.name')" required :class="$style.name">
				<N8nInput
					v-model="name"
					name="name"
					data-test-id="snippet-name-input"
					:placeholder="i18n.baseText('snippets.form.name.placeholder')"
				/>
			</N8nInputLabel>
			<N8nInputLabel :label="i18n.baseText('snippets.form.scope')" :class="$style.scope">
				<N8nSelect
					v-model="projectId"
					:class="$style.scopeSelect"
					data-test-id="snippet-project-select"
				>
					<N8nOption value="" :label="i18n.baseText('snippets.scope.global')" />
					<N8nOption
						v-for="project in teamProjects"
						:key="project.id"
						:value="project.id"
						:label="project.name ?? project.id"
					/>
				</N8nSelect>
			</N8nInputLabel>
			<N8nInputLabel
				:label="i18n.baseText('snippets.form.description')"
				:class="$style.description"
			>
				<N8nInput v-model="description" name="description" />
			</N8nInputLabel>
		</div>

		<N8nInputLabel :label="i18n.baseText('snippets.form.code')" required>
			<div :class="$style.editor" data-test-id="snippet-code-input">
				<SnippetCodeEditor
					:model-value="code"
					:editor-id="`snippet-${snippetId ?? 'new'}`"
					:variables="editorVariables"
					:snippets="editorSnippets"
					:rows="14"
					@update:model-value="code = $event"
				/>
			</div>
		</N8nInputLabel>
		<N8nText size="small" color="text-light">
			{{ i18n.baseText('snippets.form.code.hint') }}
			<code>{{ usageSyntax }}</code>
		</N8nText>

		<div :class="$style.testsHeader">
			<N8nHeading size="large" tag="h2">{{ i18n.baseText('snippets.tests.heading') }}</N8nHeading>
			<div :class="$style.testsActions">
				<N8nButton variant="ghost" data-test-id="snippet-add-test-button" @click="addTest">
					{{ i18n.baseText('snippets.tests.add') }}
				</N8nButton>
				<N8nButton
					:loading="runningTests"
					:disabled="tests.length === 0"
					data-test-id="snippet-run-tests-button"
					@click="runTests"
				>
					{{ i18n.baseText('snippets.tests.run') }}
				</N8nButton>
			</div>
		</div>
		<N8nText size="small" color="text-light">
			{{ i18n.baseText('snippets.tests.hint') }}
		</N8nText>
		<N8nText v-if="hasIncompleteTests" size="small" color="danger">
			{{ i18n.baseText('snippets.tests.incomplete') }}
		</N8nText>

		<div v-if="tests.length" :class="$style.tests" data-test-id="snippet-tests">
			<div v-for="(test, index) in tests" :key="index" :class="$style.test">
				<div :class="$style.testRow">
					<N8nIconButton
						icon="trash-2"
						variant="ghost"
						:title="i18n.baseText('snippets.tests.remove')"
						:data-test-id="`snippet-test-remove-${index}`"
						@click="removeTest(index)"
					/>
					<N8nInput
						v-model="test.code"
						:class="$style.testCode"
						:placeholder="i18n.baseText('snippets.tests.code.placeholder')"
						@update:model-value="testResults = null"
					/>
					<code :class="$style.equals">===</code>
					<N8nInput
						v-model="test.expected"
						:class="$style.testExpected"
						:placeholder="i18n.baseText('snippets.tests.expected.placeholder')"
						@update:model-value="testResults = null"
					/>
					<N8nIconButton
						icon="play"
						variant="ghost"
						:title="i18n.baseText('snippets.tests.runOne')"
						:disabled="test.code.trim() === ''"
						:data-test-id="`snippet-test-run-${index}`"
						@click="runSingleTest(index)"
					/>
				</div>
				<div
					v-if="resultByIndex(index)"
					:class="[$style.testResult, resultByIndex(index)?.passed ? $style.passed : $style.failed]"
					:data-test-id="`snippet-test-result-${index}`"
				>
					<N8nIcon
						:icon="resultByIndex(index)?.passed ? 'circle-check' : 'circle-x'"
						size="small"
					/>
					<N8nText size="small">{{ resultMessage(index) }}</N8nText>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 100%;
	max-width: 900px;
	// Top-level route: the page owns its spacing (no settings-layout padding)
	padding: var(--spacing--2xl);
}

.header {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	margin-bottom: var(--spacing--xs);
}

.meta {
	display: flex;
	gap: var(--spacing--xs);
}

.name {
	flex: 2;
}

.scope {
	flex: 1;

	// element-plus sizes the select taller than n8n inputs; pin its inner
	// input to the shared height token so the row lines up
	.scopeSelect {
		display: flex;

		input {
			height: var(--height--lg);
			min-height: 0;
		}
	}
}

.description {
	flex: 3;
}

.editor {
	border: var(--border-width) solid var(--color--foreground);
	border-radius: var(--radius);
}

.testsHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: var(--spacing--md);
}

.testsActions {
	display: flex;
	gap: var(--spacing--2xs);
}

.tests {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.test {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.testRow {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

.testCode {
	flex: 3;

	input {
		font-family: var(--font-family--monospace);
	}
}

.testExpected {
	flex: 2;

	input {
		font-family: var(--font-family--monospace);
	}
}

.equals {
	color: var(--color--text--tint-1, var(--color--text));
	flex-shrink: 0;
}

.testResult {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding-left: var(--spacing--2xs);
}

.passed {
	color: var(--color--success);
}

.failed {
	color: var(--color--danger);
}
</style>
