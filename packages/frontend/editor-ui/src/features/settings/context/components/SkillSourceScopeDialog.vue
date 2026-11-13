<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
	skillSourceScopeBlockSchema,
	type SkillSourceScopeBlock,
	type SkillSourceCredentialOption,
	type SkillSourceListItem,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nInputLabel,
	N8nSelect2,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { ResponseError } from '@n8n/rest-api-client';

import type { AgentSkillModalScopeOption } from '@/features/agents/components/AgentSkillModal.vue';

import { useSkillsStore } from '../skills.store';
import { parseScope } from '../skills.utils';

const props = defineProps<{
	source: SkillSourceListItem;
	scopeOptions: AgentSkillModalScopeOption[];
}>();
const emit = defineEmits<{ close: []; moved: [] }>();
const i18n = useI18n();
const skillsStore = useSkillsStore();
const { showError, showMessage } = useToast();
const currentScope = props.source.projectId ? `project:${props.source.projectId}` : 'instance';
const scope = ref('');
const credentialId = ref('');
const credentials = ref<SkillSourceCredentialOption[]>([]);
const credentialsLoading = ref(false);
const moving = ref(false);
const block = ref<SkillSourceScopeBlock>();
const scopeItems = computed(() =>
	props.scopeOptions.filter((option) => option.value !== currentScope),
);
const canMove = computed(
	() =>
		props.source.canDelete &&
		scopeItems.value.some((item) => item.value === scope.value) &&
		!credentialsLoading.value &&
		(!props.source.requiresCredential || !!credentialId.value),
);

watch(scope, async (value, _previous, onCleanup) => {
	block.value = undefined;
	credentialId.value = '';
	credentials.value = [];
	credentialsLoading.value = false;
	if (!props.source.requiresCredential || !value) return;
	let active = true;
	onCleanup(() => {
		active = false;
	});
	credentialsLoading.value = true;
	try {
		const options = await skillsStore.fetchSourceCredentials(parseScope(value));
		if (active) credentials.value = options;
	} catch (error) {
		if (active)
			showError(error, i18n.baseText('settings.context.skills.connect.credential.error.load'));
	} finally {
		if (active) credentialsLoading.value = false;
	}
});

async function moveSource() {
	if (!canMove.value || moving.value) return;
	moving.value = true;
	block.value = undefined;
	try {
		await skillsStore.changeSourceScope(props.source.id, {
			...parseScope(scope.value),
			...(props.source.requiresCredential ? { credentialId: credentialId.value } : {}),
		});
		showMessage({
			title: i18n.baseText('settings.context.skills.sources.scope.success'),
			type: 'success',
		});
		emit('moved');
	} catch (error) {
		const parsed = skillSourceScopeBlockSchema.safeParse(
			error instanceof ResponseError && error.httpStatusCode === 409 ? error.meta : undefined,
		);
		if (parsed.success) block.value = parsed.data;
		else showError(error, i18n.baseText('settings.context.skills.sources.scope.error'));
	} finally {
		moving.value = false;
	}
}
</script>

<template>
	<N8nDialog
		open
		:header="i18n.baseText('settings.context.skills.sources.scope.title')"
		data-test-id="skill-source-scope-dialog"
		@update:open="!$event && !moving && emit('close')"
	>
		<N8nDialogBody :class="$style.body" aria-live="polite">
			<N8nText tag="p">
				{{
					i18n.baseText('settings.context.skills.sources.scope.message', {
						interpolate: { source: source.label },
					})
				}}
			</N8nText>
			<N8nInputLabel :label="i18n.baseText('settings.context.skills.connect.scope.label')">
				<N8nSelect2
					v-model="scope"
					:items="scopeItems"
					:disabled="moving"
					data-test-id="skill-source-new-scope"
					data-attr="skill-source-new-scope"
				/>
			</N8nInputLabel>
			<template v-if="source.requiresCredential && scope">
				<N8nText tag="p">{{
					i18n.baseText('settings.context.skills.sources.scope.credential')
				}}</N8nText>
				<N8nInputLabel :label="i18n.baseText('settings.context.skills.connect.credential.label')">
					<N8nSelect2
						v-model="credentialId"
						:items="
							credentials.map((credential) => ({ value: credential.id, label: credential.name }))
						"
						:disabled="moving || credentialsLoading"
						data-test-id="skill-source-new-credential"
						data-attr="skill-source-new-credential"
					/>
				</N8nInputLabel>
			</template>
			<template v-if="block">
				<N8nText tag="p">{{
					i18n.baseText('settings.context.skills.sources.scope.blocked')
				}}</N8nText>
				<ul v-if="block.agents.length">
					<li v-for="agent in block.agents" :key="agent.agentId">
						{{ agent.agentName }} · {{ agent.projectName }}
					</li>
				</ul>
				<N8nText v-if="block.hiddenAgents" tag="p">
					{{
						i18n.baseText('settings.context.skills.agents.hidden', {
							interpolate: { count: block.hiddenAgents },
							adjustToNumber: block.hiddenAgents,
						})
					}}
				</N8nText>
			</template>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton variant="outline" :disabled="moving" @click="emit('close')">{{
				i18n.baseText('generic.cancel')
			}}</N8nButton>
			<N8nButton
				:disabled="!canMove || !!block"
				:loading="moving"
				data-test-id="skill-source-change-scope"
				data-attr="skill-source-change-scope"
				@click="moveSource"
			>
				{{ i18n.baseText('settings.context.skills.sources.scope.action') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
