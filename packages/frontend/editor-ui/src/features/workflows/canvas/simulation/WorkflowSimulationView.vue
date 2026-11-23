<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { VIEWS } from '@/app/constants';
import { useAiSimulatedExecutionsStore } from '@/app/stores/aiSimulatedExecutions.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	injectWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

import {
	SIMULATED_EXECUTION_ID_PREFIX,
	useWorkflowSimulationStore,
	type SimulationPreset,
} from './workflowSimulation.store';
import type {
	AvailableVendorInfo,
	SimulationSeedCollection,
	SimulationSeedField,
} from './simulation.api';

type ConfigSection = 'seed' | 'faults' | 'results';

const i18n = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const simulationStore = useWorkflowSimulationStore();
const aiSimulatedExecutionsStore = useAiSimulatedExecutionsStore();

const selectedVendor = ref<string>('');
const activeSection = ref<ConfigSection>('seed');
const isAddingScenario = ref(false);
const newScenarioName = ref('');
const newScenarioDescription = ref('');
const newScenarioCloneCurrent = ref(true);

const activePreset = computed<SimulationPreset | undefined>(() =>
	simulationStore.allPresets.find((p) => p.id === simulationStore.activePresetId),
);

function getPresetTitle(preset: SimulationPreset): string {
	if (preset.labelKey) {
		return i18n.baseText(preset.labelKey as never);
	}
	return preset.label ?? preset.id;
}

function getPresetDescription(preset: SimulationPreset): string {
	if (preset.descriptionKey) {
		return i18n.baseText(preset.descriptionKey as never);
	}
	return preset.description ?? '';
}

function openAddScenarioForm() {
	newScenarioName.value = '';
	newScenarioDescription.value = '';
	newScenarioCloneCurrent.value = true;
	isAddingScenario.value = true;
}

function cancelAddScenario() {
	isAddingScenario.value = false;
}

function saveNewScenario() {
	const name = newScenarioName.value.trim();
	if (!name) return;
	simulationStore.createCustomScenario(name, newScenarioDescription.value, {
		cloneCurrentState: newScenarioCloneCurrent.value,
	});
	isAddingScenario.value = false;
	toast.showMessage({
		title: i18n.baseText('nodeView.simulate.presets.createdTitle'),
		message: i18n.baseText('nodeView.simulate.presets.createdMessage', {
			interpolate: { name },
		}),
		type: 'success',
	});
}

function saveActiveCustomScenario() {
	if (!activePreset.value?.isCustom) return;
	simulationStore.updateCustomScenario(activePreset.value.id);
	toast.showMessage({
		title: i18n.baseText('nodeView.simulate.presets.updatedTitle'),
		message: i18n.baseText('nodeView.simulate.presets.updatedMessage', {
			interpolate: { name: getPresetTitle(activePreset.value) },
		}),
		type: 'success',
	});
}

function deleteScenario(preset: SimulationPreset) {
	if (!preset.isCustom) return;
	simulationStore.deleteCustomScenario(preset.id);
}

const workflowId = computed(() => {
	const param = route.params.workflowId ?? route.params.name;
	if (typeof param === 'string' && param.trim()) {
		return param;
	}
	return workflowsStore.workflowId;
});

const vendors = computed<AvailableVendorInfo[]>(() => simulationStore.activeVendorsMetadata);

const currentVendor = computed<AvailableVendorInfo | undefined>(() =>
	vendors.value.find((v) => v.slug === selectedVendor.value),
);

const currentSchema = computed(() => currentVendor.value?.seedSchema);

const hasStructuredSchema = computed(() => {
	const s = currentSchema.value;
	return Boolean(s && (s.settings.length > 0 || s.collections.length > 0));
});

const currentVendorState = computed(() =>
	selectedVendor.value ? simulationStore.getVendorState(selectedVendor.value) : null,
);

watch(
	vendors,
	(list) => {
		if (list.length === 0) {
			selectedVendor.value = '';
			return;
		}
		if (!list.some((v) => v.slug === selectedVendor.value)) {
			selectedVendor.value = list[0].slug;
		}
	},
	{ immediate: true },
);

onMounted(async () => {
	const nodes = workflowDocumentStore.value?.allNodes ?? workflowsStore.workflow?.nodes ?? [];
	if (workflowId.value) {
		await simulationStore.refreshSupport(workflowId.value, nodes.length > 0 ? nodes : undefined);
	}
});

function formatVendorName(slug: string): string {
	const special: Record<string, string> = {
		github: 'GitHub',
		gmail: 'Gmail',
		slack: 'Slack',
		linear: 'Linear',
		openai: 'OpenAI',
		anthropic: 'Anthropic',
		google: 'Google',
		hubspot: 'HubSpot',
		zendesk: 'Zendesk',
		jira: 'Jira',
		notion: 'Notion',
		stripe: 'Stripe',
		shopify: 'Shopify',
		twilio: 'Twilio',
		discord: 'Discord',
		airtable: 'Airtable',
	};
	return special[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}

function getFieldStringValue(record: Record<string, unknown>, key: string): string {
	const val = record[key];
	if (val === undefined || val === null) return '';
	return String(val);
}

function setFieldValue(
	record: Record<string, unknown>,
	field: SimulationSeedField,
	rawValue: string | number | boolean,
) {
	if (field.type === 'number') {
		const parsed = Number(rawValue);
		record[field.key] = Number.isNaN(parsed) ? 0 : parsed;
	} else if (field.type === 'boolean') {
		record[field.key] = Boolean(rawValue);
	} else {
		record[field.key] = String(rawValue);
	}
}

function getCollectionItems(collectionKey: string): Array<Record<string, unknown>> {
	if (!currentVendorState.value) return [];
	return currentVendorState.value.collections[collectionKey] ?? [];
}

function addCollectionItem(collection: SimulationSeedCollection) {
	if (!selectedVendor.value) return;
	simulationStore.addCollectionItem(selectedVendor.value, collection);
}

function removeCollectionItem(collectionKey: string, index: number) {
	if (!selectedVendor.value) return;
	simulationStore.removeCollectionItem(selectedVendor.value, collectionKey, index);
}

function validateJson(raw: string): string | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;
	try {
		JSON.parse(trimmed);
		return null;
	} catch (error) {
		return error instanceof Error ? error.message : 'Invalid JSON';
	}
}

function formatStateJson(state: unknown): string {
	try {
		return JSON.stringify(state, null, 2);
	} catch {
		return String(state);
	}
}

async function runSimulation(navigateToEditor = false) {
	if (!workflowId.value || simulationStore.isSimulating) return;
	try {
		const snapshot = workflowDocumentStore.value?.serialize();
		const wf = workflowDocumentStore.value?.getSnapshot() ?? workflowsStore.workflow;
		const result = await simulationStore.simulate(workflowId.value, {
			workflowData: snapshot
				? {
						nodes: snapshot.nodes,
						connections: snapshot.connections,
						pinData: snapshot.pinData,
						settings: snapshot.settings,
						staticData: snapshot.staticData,
					}
				: wf
					? {
							nodes: wf.nodes,
							connections: wf.connections,
							pinData: wf.pinData,
							settings: wf.settings,
							staticData: wf.staticData,
						}
					: undefined,
		});

		const executionId = `${SIMULATED_EXECUTION_ID_PREFIX}${Date.now()}`;
		const executionResponse: IExecutionResponse = {
			id: executionId,
			finished: result.status === 'success',
			mode: 'manual',
			createdAt: new Date(),
			startedAt: result.runData.startedAt ?? new Date(),
			stoppedAt: result.runData.stoppedAt ?? new Date(),
			status: result.status === 'success' ? 'success' : 'error',
			workflowId: workflowId.value,
			workflowData: wf,
			data: result.runData.data,
		};
		const executionStateStore = useWorkflowExecutionStateStore(
			createWorkflowDocumentId(workflowId.value),
		);
		executionStateStore.setActiveExecutionId(undefined);
		executionStateStore.setWorkflowExecutionData(executionResponse);
		aiSimulatedExecutionsStore.markSimulatedNodes(
			executionId,
			Object.keys(result.runData.data?.resultData?.runData ?? {}),
		);

		toast.showMessage({
			title:
				result.status === 'success'
					? i18n.baseText('nodeView.simulate.successTitle')
					: i18n.baseText('nodeView.simulate.errorTitle'),
			message:
				result.status === 'success'
					? i18n.baseText('nodeView.simulate.successMessage', {
							interpolate: {
								durationMs: String(result.durationMs),
								events: String(result.events.length),
							},
						})
					: (result.error ?? i18n.baseText('nodeView.simulate.errorMessage')),
			type: result.status === 'success' ? 'success' : 'error',
		});

		if (navigateToEditor) {
			await router.push({ name: VIEWS.WORKFLOW, params: { workflowId: workflowId.value } });
		} else {
			activeSection.value = 'results';
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('nodeView.simulate.errorTitle'));
	}
}
</script>

<template>
	<div :class="$style.page" data-test-id="workflow-simulation-view">
		<!-- Top Action Bar -->
		<header :class="$style.header">
			<div :class="$style.headerLeft">
				<div :class="$style.titleRow">
					<N8nIcon icon="flask-conical" size="large" :class="$style.titleIcon" />
					<div>
						<N8nHeading size="large" tag="h1">
							{{ i18n.baseText('nodeView.simulate.tabTitle') }}
						</N8nHeading>
						<N8nText color="text-light" size="small">
							{{ i18n.baseText('nodeView.simulate.tabSubtitle') }}
						</N8nText>
					</div>
				</div>
			</div>

			<div :class="$style.headerActions">
				<div v-if="simulationStore.lastResult" :class="$style.lastRunBadge">
					<N8nBadge :theme="simulationStore.lastResult.status === 'success' ? 'success' : 'danger'">
						{{
							i18n.baseText('nodeView.simulate.lastRunStatus', {
								interpolate: {
									status: simulationStore.lastResult.status,
									durationMs: String(simulationStore.lastResult.durationMs),
									events: String(simulationStore.lastResult.events.length),
								},
							})
						}}
					</N8nBadge>
				</div>
				<N8nButton
					type="secondary"
					icon="play"
					:loading="simulationStore.isSimulating"
					:disabled="!simulationStore.canSimulate"
					data-test-id="simulation-run-stay-button"
					@click="runSimulation(false)"
				>
					{{ i18n.baseText('nodeView.simulate.runAndInspect') }}
				</N8nButton>
				<N8nButton
					type="primary"
					icon="flask-conical"
					:loading="simulationStore.isSimulating"
					:disabled="!simulationStore.canSimulate"
					data-test-id="simulation-run-canvas-button"
					@click="runSimulation(true)"
				>
					{{ i18n.baseText('nodeView.simulate.runOnCanvas') }}
				</N8nButton>
			</div>
		</header>

		<!-- Unsupported Nodes Banner -->
		<N8nCallout
			v-if="!simulationStore.supported"
			theme="danger"
			icon="triangle-alert"
			:class="$style.banner"
			data-test-id="simulation-unsupported-banner"
		>
			<div>
				<strong>{{ i18n.baseText('nodeView.simulate.unsupportedBannerTitle') }}</strong>
				<ul :class="$style.unsupportedList">
					<li v-for="node in simulationStore.unsupportedNodes" :key="node.nodeName">
						<code>{{ node.nodeName }}</code> ({{ node.nodeType }}): {{ node.reason }}
					</li>
				</ul>
			</div>
		</N8nCallout>

		<!-- Scenario Presets Strip (single horizontal row with uniform cards + add scenario) -->
		<section :class="$style.presetsBar" data-test-id="simulation-presets-bar">
			<div :class="$style.presetsHeaderRow">
				<div :class="$style.presetsLabelGroup">
					<N8nText size="small" bold color="text-light">
						{{ i18n.baseText('nodeView.simulate.presets.heading') }}
					</N8nText>
					<N8nBadge theme="tertiary">{{ simulationStore.allPresets.length }}</N8nBadge>
				</div>
				<div :class="$style.presetsHeaderActions">
					<N8nButton
						v-if="activePreset?.isCustom"
						size="xsmall"
						type="tertiary"
						icon="save"
						data-test-id="simulation-save-custom-scenario-button"
						@click="saveActiveCustomScenario"
					>
						{{ i18n.baseText('nodeView.simulate.presets.saveChanges') }}
					</N8nButton>
					<N8nButton
						size="xsmall"
						type="secondary"
						icon="plus"
						data-test-id="simulation-add-scenario-button"
						@click="openAddScenarioForm"
					>
						{{ i18n.baseText('nodeView.simulate.presets.addButton') }}
					</N8nButton>
				</div>
			</div>

			<div :class="$style.presetScroller" data-test-id="simulation-preset-scroller">
				<div :class="$style.presetCards">
					<div
						v-for="preset in simulationStore.allPresets"
						:key="preset.id"
						role="button"
						tabindex="0"
						:class="[
							$style.presetCard,
							simulationStore.activePresetId === preset.id && $style.presetCardActive,
						]"
						:data-test-id="`simulation-preset-${preset.id}`"
						@click="simulationStore.applyPreset(preset.id)"
						@keydown.enter.prevent="simulationStore.applyPreset(preset.id)"
						@keydown.space.prevent="simulationStore.applyPreset(preset.id)"
					>
						<div :class="$style.presetCardTop">
							<span :class="$style.presetTitle">{{ getPresetTitle(preset) }}</span>
							<div :class="$style.presetCardActions">
								<N8nBadge v-if="preset.isCustom" theme="tertiary">
									{{ i18n.baseText('nodeView.simulate.presets.customBadge') }}
								</N8nBadge>
								<N8nIconButton
									v-if="preset.isCustom"
									icon="trash-2"
									type="tertiary"
									size="xsmall"
									:data-test-id="`simulation-delete-preset-${preset.id}`"
									@click.stop="deleteScenario(preset)"
								/>
							</div>
						</div>
						<span :class="$style.presetDesc">{{ getPresetDescription(preset) }}</span>
					</div>

					<button
						type="button"
						:class="$style.addScenarioCard"
						data-test-id="simulation-add-scenario-card"
						@click="openAddScenarioForm"
					>
						<N8nIcon icon="plus" size="medium" />
						<span :class="$style.addScenarioTitle">
							{{ i18n.baseText('nodeView.simulate.presets.addCardTitle') }}
						</span>
						<span :class="$style.addScenarioDesc">
							{{ i18n.baseText('nodeView.simulate.presets.addCardDescription') }}
						</span>
					</button>
				</div>
			</div>

			<form
				v-if="isAddingScenario"
				:class="$style.addScenarioForm"
				data-test-id="simulation-add-scenario-form"
				@submit.prevent="saveNewScenario"
			>
				<div :class="$style.addScenarioFields">
					<label :class="$style.fieldGroup">
						<N8nText size="xsmall" bold>
							{{ i18n.baseText('nodeView.simulate.presets.nameLabel') }}
						</N8nText>
						<N8nInput
							v-model="newScenarioName"
							:placeholder="i18n.baseText('nodeView.simulate.presets.namePlaceholder')"
							data-test-id="simulation-new-scenario-name"
						/>
					</label>
					<label :class="$style.fieldGroup">
						<N8nText size="xsmall" bold>
							{{ i18n.baseText('nodeView.simulate.presets.descriptionLabel') }}
						</N8nText>
						<N8nInput
							v-model="newScenarioDescription"
							:placeholder="i18n.baseText('nodeView.simulate.presets.descriptionPlaceholder')"
							data-test-id="simulation-new-scenario-description"
						/>
					</label>
				</div>
				<div :class="$style.addScenarioFooter">
					<N8nCheckbox
						v-model="newScenarioCloneCurrent"
						:label="i18n.baseText('nodeView.simulate.presets.cloneCurrentLabel')"
						data-test-id="simulation-new-scenario-clone"
					/>
					<div :class="$style.addScenarioFormActions">
						<N8nButton
							size="small"
							type="tertiary"
							data-test-id="simulation-cancel-scenario-button"
							@click="cancelAddScenario"
						>
							{{ i18n.baseText('nodeView.simulate.presets.cancel') }}
						</N8nButton>
						<N8nButton
							size="small"
							type="primary"
							native-type="submit"
							:disabled="!newScenarioName.trim()"
							data-test-id="simulation-confirm-scenario-button"
						>
							{{ i18n.baseText('nodeView.simulate.presets.create') }}
						</N8nButton>
					</div>
				</div>
			</form>
		</section>

		<!-- Empty State when Workflow has No External Services -->
		<div v-if="vendors.length === 0" :class="$style.emptyContainer">
			<N8nIcon icon="database" size="xlarge" color="text-light" />
			<N8nHeading size="medium" tag="h2">
				{{ i18n.baseText('nodeView.simulate.noVendorsHeading') }}
			</N8nHeading>
			<N8nText color="text-light">
				{{ i18n.baseText('nodeView.simulate.noVendors') }}
			</N8nText>
		</div>

		<!-- Master-Detail Workspace -->
		<div v-else :class="$style.workspace">
			<!-- Left Sidebar: Services Detected in Workflow -->
			<aside :class="$style.sidebar">
				<div :class="$style.sidebarHeader">
					<N8nText size="xsmall" bold color="text-light">
						{{ i18n.baseText('nodeView.simulate.servicesDetected') }}
					</N8nText>
					<N8nBadge theme="tertiary">{{ vendors.length }}</N8nBadge>
				</div>

				<nav :class="$style.serviceList">
					<button
						v-for="vendor in vendors"
						:key="vendor.slug"
						type="button"
						:class="[
							$style.serviceItem,
							selectedVendor === vendor.slug && $style.serviceItemActive,
						]"
						:data-test-id="`simulation-service-${vendor.slug}`"
						@click="selectedVendor = vendor.slug"
					>
						<div :class="$style.serviceItemMain">
							<span :class="$style.serviceName">{{ formatVendorName(vendor.slug) }}</span>
							<span v-if="vendor.hosts[0]" :class="$style.serviceHost">
								{{ vendor.hosts[0] }}
							</span>
						</div>
						<div :class="$style.serviceBadges">
							<N8nBadge v-if="simulationStore.getVendorSeedCount(vendor.slug) > 0" theme="tertiary">
								{{ simulationStore.getVendorSeedCount(vendor.slug) }}
							</N8nBadge>
							<N8nBadge v-if="simulationStore.getVendorFaultCount(vendor.slug) > 0" theme="warning">
								{{ simulationStore.getVendorFaultCount(vendor.slug) }}!
							</N8nBadge>
						</div>
					</button>
				</nav>
			</aside>

			<!-- Right Detail Panel -->
			<main v-if="currentVendor && currentVendorState" :class="$style.detail">
				<div :class="$style.detailHeader">
					<div>
						<N8nHeading size="medium" tag="h2">
							{{ formatVendorName(currentVendor.slug) }}
						</N8nHeading>
						<N8nText v-if="currentSchema?.description" color="text-light" size="small">
							{{ currentSchema.description }}
						</N8nText>
						<N8nText v-else-if="currentVendor.hosts.length" color="text-light" size="small">
							{{ currentVendor.hosts.join(', ') }}
						</N8nText>
					</div>

					<div :class="$style.sectionTabs">
						<button
							type="button"
							:class="[$style.sectionTab, activeSection === 'seed' && $style.sectionTabActive]"
							data-test-id="simulation-section-seed"
							@click="activeSection = 'seed'"
						>
							{{ i18n.baseText('nodeView.simulate.sectionSeed') }}
						</button>
						<button
							type="button"
							:class="[$style.sectionTab, activeSection === 'faults' && $style.sectionTabActive]"
							data-test-id="simulation-section-faults"
							@click="activeSection = 'faults'"
						>
							{{ i18n.baseText('nodeView.simulate.sectionFaults') }}
							<span
								v-if="simulationStore.getVendorFaultCount(currentVendor.slug) > 0"
								:class="$style.tabCounter"
							>
								{{ simulationStore.getVendorFaultCount(currentVendor.slug) }}
							</span>
						</button>
						<button
							type="button"
							:class="[$style.sectionTab, activeSection === 'results' && $style.sectionTabActive]"
							data-test-id="simulation-section-results"
							@click="activeSection = 'results'"
						>
							{{ i18n.baseText('nodeView.simulate.sectionResults') }}
						</button>
					</div>
				</div>

				<!-- SECTION: SEED STATE (100% Schema-Driven) -->
				<div v-if="activeSection === 'seed'" :class="$style.detailBody">
					<template v-if="hasStructuredSchema && currentSchema">
						<!-- Top-level scalar settings -->
						<div v-if="currentSchema.settings.length > 0" :class="$style.card">
							<div :class="$style.cardHeader">
								<N8nHeading size="small" tag="h3">
									{{ i18n.baseText('nodeView.simulate.settingsHeading') }}
								</N8nHeading>
							</div>
							<div :class="$style.settingsGrid">
								<label
									v-for="field in currentSchema.settings"
									:key="field.key"
									:class="$style.fieldGroup"
								>
									<N8nText size="small" bold>{{ field.label }}</N8nText>
									<N8nCheckbox
										v-if="field.type === 'boolean'"
										:model-value="Boolean(currentVendorState.settings[field.key])"
										@update:model-value="
											(val: boolean) => setFieldValue(currentVendorState!.settings, field, val)
										"
									/>
									<select
										v-else-if="field.type === 'select' && field.options"
										:class="$style.selectInput"
										:value="getFieldStringValue(currentVendorState.settings, field.key)"
										@change="
											(e: Event) =>
												setFieldValue(
													currentVendorState!.settings,
													field,
													(e.target as HTMLSelectElement).value,
												)
										"
									>
										<option v-for="opt in field.options" :key="opt.value" :value="opt.value">
											{{ opt.label }}
										</option>
									</select>
									<N8nInput
										v-else
										:type="field.type === 'number' ? 'number' : 'text'"
										:model-value="getFieldStringValue(currentVendorState.settings, field.key)"
										:placeholder="field.placeholder"
										@update:model-value="
											(val: string | number) =>
												setFieldValue(currentVendorState!.settings, field, val)
										"
									/>
								</label>
							</div>
						</div>

						<!-- Dynamic Entity Collections (Channels, Issues, Tickets, Messages, Repos, etc.) -->
						<div
							v-for="collection in currentSchema.collections"
							:key="collection.key"
							:class="$style.card"
							:data-test-id="`simulation-collection-${currentVendor.slug}-${collection.key}`"
						>
							<div :class="$style.cardHeader">
								<div :class="$style.cardTitleGroup">
									<div :class="$style.cardTitleRow">
										<N8nHeading size="small" tag="h3">{{ collection.label }}</N8nHeading>
										<N8nBadge theme="tertiary">
											{{ getCollectionItems(collection.key).length }}
										</N8nBadge>
									</div>
									<N8nText v-if="collection.description" size="xsmall" color="text-light">
										{{ collection.description }}
									</N8nText>
								</div>
								<N8nButton
									size="small"
									type="secondary"
									icon="plus"
									:data-test-id="`simulation-add-${currentVendor.slug}-${collection.key}`"
									@click="addCollectionItem(collection)"
								>
									{{
										i18n.baseText('nodeView.simulate.addEntity', {
											interpolate: { entity: collection.singularLabel },
										})
									}}
								</N8nButton>
							</div>

							<div v-if="getCollectionItems(collection.key).length === 0" :class="$style.emptyCard">
								<N8nText color="text-light" size="small">
									{{
										i18n.baseText('nodeView.simulate.noEntitiesYet', {
											interpolate: { entities: collection.label.toLowerCase() },
										})
									}}
								</N8nText>
							</div>

							<div v-else :class="$style.entityList">
								<div
									v-for="(item, idx) in getCollectionItems(collection.key)"
									:key="`${collection.key}-${idx}`"
									:class="$style.entityCard"
								>
									<div :class="$style.entityCardHeader">
										<N8nText size="xsmall" bold color="text-light">
											{{ collection.singularLabel }} #{{ idx + 1 }}
										</N8nText>
										<N8nIconButton
											icon="trash-2"
											type="tertiary"
											size="small"
											@click="removeCollectionItem(collection.key, idx)"
										/>
									</div>

									<div :class="$style.entityFieldsGrid">
										<label
											v-for="field in collection.fields"
											:key="field.key"
											:class="[$style.fieldGroup, field.type === 'text' && $style.fieldFullWidth]"
										>
											<N8nText size="xsmall" color="text-light">
												{{ field.label }}
												<span v-if="field.required" :class="$style.requiredMark">*</span>
											</N8nText>
											<N8nCheckbox
												v-if="field.type === 'boolean'"
												:model-value="Boolean(item[field.key])"
												@update:model-value="(val: boolean) => setFieldValue(item, field, val)"
											/>
											<select
												v-else-if="field.type === 'select' && field.options"
												:class="$style.selectInput"
												:value="getFieldStringValue(item, field.key)"
												@change="
													(e: Event) =>
														setFieldValue(item, field, (e.target as HTMLSelectElement).value)
												"
											>
												<option v-for="opt in field.options" :key="opt.value" :value="opt.value">
													{{ opt.label }}
												</option>
											</select>
											<N8nInput
												v-else-if="field.type === 'text'"
												type="textarea"
												:rows="2"
												:model-value="getFieldStringValue(item, field.key)"
												:placeholder="field.placeholder"
												@update:model-value="
													(val: string | number) => setFieldValue(item, field, val)
												"
											/>
											<N8nInput
												v-else
												:type="field.type === 'number' ? 'number' : 'text'"
												:model-value="getFieldStringValue(item, field.key)"
												:placeholder="field.placeholder"
												@update:model-value="
													(val: string | number) => setFieldValue(item, field, val)
												"
											/>
										</label>
									</div>
								</div>
							</div>
						</div>
					</template>

					<!-- Fallback Raw JSON Editor for vendors without a structured schema yet -->
					<div v-else :class="$style.card">
						<div :class="$style.cardHeader">
							<N8nHeading size="small" tag="h3">
								{{ i18n.baseText('nodeView.simulate.seedJsonLabel') }}
							</N8nHeading>
						</div>
						<N8nInput
							v-model="currentVendorState.rawJson"
							type="textarea"
							:rows="10"
							placeholder="{ }"
						/>
						<N8nText v-if="validateJson(currentVendorState.rawJson)" color="danger" size="small">
							{{ validateJson(currentVendorState.rawJson) }}
						</N8nText>
					</div>
				</div>

				<!-- SECTION: FAULT INJECTION -->
				<div v-else-if="activeSection === 'faults'" :class="$style.detailBody">
					<div :class="$style.card">
						<div :class="$style.cardHeader">
							<N8nHeading size="small" tag="h3">
								{{ i18n.baseText('nodeView.simulate.faultsHeading') }}
							</N8nHeading>
						</div>
						<N8nText color="text-light" size="small" :class="$style.cardHelp">
							{{ i18n.baseText('nodeView.simulate.faultsDescription') }}
						</N8nText>

						<div v-if="currentVendor.faultFlags.length === 0" :class="$style.emptyCard">
							<N8nText color="text-light" size="small">
								{{ i18n.baseText('nodeView.simulate.noFaultFlags') }}
							</N8nText>
						</div>

						<div v-else :class="$style.faultGrid">
							<label v-for="flag in currentVendor.faultFlags" :key="flag" :class="$style.faultCard">
								<N8nCheckbox
									:model-value="simulationStore.getFault(currentVendor.slug, flag)"
									@update:model-value="
										(val: boolean) => simulationStore.setFault(currentVendor!.slug, flag, val)
									"
								/>
								<div>
									<div :class="$style.faultName">{{ flag }}</div>
									<div :class="$style.faultKey">{{ currentVendor.slug }}:{{ flag }}</div>
								</div>
							</label>
						</div>
					</div>
				</div>

				<!-- SECTION: LAST RUN RESULTS -->
				<div v-else :class="$style.detailBody">
					<div v-if="!simulationStore.lastResult" :class="$style.emptyCard">
						<N8nText color="text-light" size="small">
							{{ i18n.baseText('nodeView.simulate.noResultsYet') }}
						</N8nText>
					</div>

					<template v-else>
						<div :class="$style.card">
							<div :class="$style.cardHeader">
								<N8nHeading size="small" tag="h3">
									{{
										i18n.baseText('nodeView.simulate.vendorStateTitle', {
											interpolate: { vendor: formatVendorName(currentVendor.slug) },
										})
									}}
								</N8nHeading>
							</div>
							<pre :class="$style.jsonBlock">{{
								formatStateJson(simulationStore.lastResult.vendorStates[currentVendor.slug] ?? {})
							}}</pre>
						</div>

						<div :class="$style.card">
							<div :class="$style.cardHeader">
								<N8nHeading size="small" tag="h3">
									{{ i18n.baseText('nodeView.simulate.httpTrafficHeading') }}
								</N8nHeading>
								<N8nBadge theme="tertiary">
									{{
										simulationStore.lastResult.events.filter(
											(e) => e.vendor === currentVendor?.slug,
										).length
									}}
								</N8nBadge>
							</div>
							<div :class="$style.eventList">
								<div
									v-for="(ev, idx) in simulationStore.lastResult.events.filter(
										(e) => e.vendor === currentVendor?.slug,
									)"
									:key="idx"
									:class="$style.eventRow"
								>
									<span :class="$style.eventMethod">{{ ev.method ?? ev.event ?? 'EVT' }}</span>
									<span :class="$style.eventPath">{{ ev.path ?? '' }}</span>
									<N8nBadge v-if="ev.status" :theme="ev.status >= 400 ? 'danger' : 'success'">
										{{ ev.status }}
									</N8nBadge>
								</div>
							</div>
						</div>
					</template>
				</div>
			</main>
		</div>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	background: var(--color--background--light-2);
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	padding: var(--spacing--md) var(--spacing--lg);
	background: var(--color--background--light-3);
	border-bottom: 1px solid var(--color--foreground--tint-1);
	flex-shrink: 0;
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--md);
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.titleIcon {
	color: var(--color--primary);
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.lastRunBadge {
	margin-right: var(--spacing--xs);
}

.banner {
	margin: var(--spacing--sm) var(--spacing--lg) 0;
}

.unsupportedList {
	margin: var(--spacing--2xs) 0 0;
	padding-left: var(--spacing--md);
}

.presetsBar {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--lg);
	background: var(--color--background--light-3);
	border-bottom: 1px solid var(--color--foreground--tint-1);
	flex-shrink: 0;
}

.presetsHeaderRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.presetsLabelGroup {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	white-space: nowrap;
}

.presetsHeaderActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.presetScroller {
	width: 100%;
	overflow-x: auto;
	overflow-y: hidden;
	padding-bottom: var(--spacing--3xs);
	scrollbar-width: thin;
}

.presetCards {
	display: flex;
	flex-wrap: nowrap;
	align-items: stretch;
	gap: var(--spacing--xs);
	width: max-content;
}

.presetCard {
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	gap: var(--spacing--3xs);
	flex: 0 0 260px;
	width: 260px;
	height: 92px;
	padding: var(--spacing--xs) var(--spacing--sm);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius);
	background: var(--color--background--light-2);
	cursor: pointer;
	text-align: left;
	overflow: hidden;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;

	&:hover {
		border-color: var(--color--primary);
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 1px;
	}
}

.presetCardActive {
	border-color: var(--color--primary);
	background: var(--color--primary--tint-3);
}

.presetCardTop {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	width: 100%;
	min-height: 20px;
}

.presetCardActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.presetTitle {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.presetDesc {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	line-height: 1.35;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.addScenarioCard {
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--4xs);
	flex: 0 0 260px;
	width: 260px;
	height: 92px;
	padding: var(--spacing--xs) var(--spacing--sm);
	border: 1px dashed var(--color--foreground);
	border-radius: var(--radius);
	background: transparent;
	color: var(--color--text--tint-1);
	cursor: pointer;
	text-align: center;
	transition:
		border-color 0.15s ease,
		color 0.15s ease,
		background-color 0.15s ease;

	&:hover {
		border-color: var(--color--primary);
		color: var(--color--primary);
		background: var(--color--background--light-2);
	}
}

.addScenarioTitle {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
}

.addScenarioDesc {
	font-size: var(--font-size--2xs);
	opacity: 0.85;
}

.addScenarioForm {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius);
	background: var(--color--background--light-2);
}

.addScenarioFields {
	display: grid;
	grid-template-columns: minmax(180px, 1fr) minmax(240px, 2fr);
	gap: var(--spacing--sm);
}

.addScenarioFooter {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}

.addScenarioFormActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.emptyContainer {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xl);
	text-align: center;
}

.workspace {
	flex: 1;
	display: grid;
	grid-template-columns: 260px 1fr;
	min-height: 0;
	overflow: hidden;
}

.sidebar {
	display: flex;
	flex-direction: column;
	background: var(--color--background--light-3);
	border-right: 1px solid var(--color--foreground--tint-1);
	overflow-y: auto;
}

.sidebarHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--sm) var(--spacing--md);
	border-bottom: 1px solid var(--color--foreground--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.serviceList {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--xs);
	gap: var(--spacing--3xs);
}

.serviceItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--xs) var(--spacing--sm);
	border: 1px solid transparent;
	border-radius: var(--radius);
	background: transparent;
	cursor: pointer;
	text-align: left;

	&:hover {
		background: var(--color--background--light-1);
	}
}

.serviceItemActive {
	background: var(--color--primary--tint-3);
	border-color: var(--color--primary--tint-1);
}

.serviceItemMain {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.serviceName {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
}

.serviceHost {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.serviceBadges {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
}

.detail {
	display: flex;
	flex-direction: column;
	min-height: 0;
	overflow: hidden;
}

.detailHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	padding: var(--spacing--md) var(--spacing--lg);
	background: var(--color--background--light-3);
	border-bottom: 1px solid var(--color--foreground--tint-1);
	flex-shrink: 0;
}

.sectionTabs {
	display: flex;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs);
	background: var(--color--background--light-1);
	border-radius: var(--radius);
}

.sectionTab {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	color: var(--color--text);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	cursor: pointer;
}

.sectionTabActive {
	background: var(--color--background--light-3);
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--bold);
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.tabCounter {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 16px;
	height: 16px;
	padding: 0 4px;
	border-radius: 999px;
	background: var(--color--warning);
	color: var(--color--text--xlight);
	font-size: var(--font-size--3xs);
}

.detailBody {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--lg);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.card {
	background: var(--color--background--light-3);
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius--lg);
	padding: var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.cardHeader {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.cardTitleGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.cardTitleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.cardHelp {
	margin-top: calc(var(--spacing--2xs) * -1);
}

.settingsGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
	gap: var(--spacing--sm);
}

.fieldGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.fieldFullWidth {
	grid-column: 1 / -1;
}

.requiredMark {
	color: var(--color--danger);
}

.selectInput {
	height: 36px;
	padding: 0 var(--spacing--xs);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius);
	background: var(--color--background--light-3);
	color: var(--color--text--shade-1);
	font-size: var(--font-size--sm);
}

.entityList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.entityCard {
	padding: var(--spacing--sm);
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius);
	background: var(--color--background--light-2);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.entityCardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.entityFieldsGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
	gap: var(--spacing--xs);
}

.emptyCard {
	padding: var(--spacing--md);
	border: 1px dashed var(--color--foreground);
	border-radius: var(--radius);
	text-align: center;
}

.faultGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: var(--spacing--xs);
}

.faultCard {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius);
	background: var(--color--background--light-2);
	cursor: pointer;
}

.faultName {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--shade-1);
}

.faultKey {
	font-size: var(--font-size--2xs);
	font-family: var(--font-family--monospace);
	color: var(--color--text--tint-1);
}

.jsonBlock {
	margin: 0;
	padding: var(--spacing--sm);
	background: var(--color--background--light-2);
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family--monospace);
	max-height: 360px;
	overflow: auto;
	white-space: pre-wrap;
	word-break: break-word;
}

.eventList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	max-height: 320px;
	overflow-y: auto;
}

.eventRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--background--light-2);
	border-radius: var(--radius);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
}

.eventMethod {
	font-weight: var(--font-weight--bold);
	min-width: 48px;
}

.eventPath {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
