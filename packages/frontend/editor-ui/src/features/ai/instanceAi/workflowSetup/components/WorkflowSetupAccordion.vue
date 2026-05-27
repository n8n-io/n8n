<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import type { TextColor } from '@n8n/design-system/types/text';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import NodeIcon from '@/app/components/NodeIcon.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { isHttpRequestNodeType } from '@/features/setupPanel/setupPanel.utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import ConfirmationFooter from '../../components/ConfirmationFooter.vue';
import type { WorkflowSetupGroup, WorkflowSetupSection } from '../workflowSetup.types';
import { getGroupSections } from '../workflowSetup.helpers';
import { useWorkflowSetupContext } from '../composables/useWorkflowSetupContext';
import WorkflowSetupSectionBody from './WorkflowSetupSectionBody.vue';

interface WorkflowSetupAccordionEntry {
	section: WorkflowSetupSection;
	group?: WorkflowSetupGroup['subnodeRootNode'];
}

interface WorkflowSetupAccordionItem {
	kind: 'section' | 'credentialGroup';
	id: string;
	section: WorkflowSetupSection;
	sections: WorkflowSetupSection[];
	group?: WorkflowSetupGroup['subnodeRootNode'];
	credentialType?: string;
}

interface WorkflowSetupParameterGroup {
	id: string;
	section: WorkflowSetupSection;
	sections: WorkflowSetupSection[];
	isShared: boolean;
}

type SectionStatus = 'complete' | 'testing' | 'error' | 'todo';

const ctx = useWorkflowSetupContext();
const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();

const openSectionId = ref<string | null>(null);
const isApplying = ref(false);

const accordionItems = computed<WorkflowSetupAccordionItem[]>(() => {
	const entries = getAccordionEntries();
	const credentialGroupCounts = getCredentialGroupCounts(entries);
	const items: WorkflowSetupAccordionItem[] = [];
	const credentialGroups = new Map<string, WorkflowSetupAccordionItem>();

	for (const entry of entries) {
		const credentialGroupKey = getCredentialGroupKey(entry);
		if (!credentialGroupKey || (credentialGroupCounts.get(credentialGroupKey) ?? 0) < 2) {
			items.push({
				kind: 'section',
				id: entry.section.id,
				section: entry.section,
				sections: [entry.section],
				group: entry.group,
			});
			continue;
		}

		const existingGroup = credentialGroups.get(credentialGroupKey);
		const sections = existingGroup ? [...existingGroup.sections, entry.section] : [entry.section];
		const groupItem = createCredentialGroupItem(credentialGroupKey, sections, entry.group);

		credentialGroups.set(credentialGroupKey, groupItem);

		if (!existingGroup) {
			items.push(groupItem);
			continue;
		}

		const itemIndex = items.findIndex((item) => item.id === existingGroup.id);
		if (itemIndex !== -1) items[itemIndex] = groupItem;
	}

	return items;
});

const allSectionsComplete = computed(
	() =>
		accordionItems.value.length > 0 && accordionItems.value.every((item) => isItemComplete(item)),
);

const hasCredentialTestFailed = computed(() =>
	accordionItems.value.some((item) => isItemCredentialTestFailed(item)),
);

const hasPendingCredentialTest = computed(() =>
	accordionItems.value.some((item) => isItemCredentialTestPending(item)),
);

const applyTooltip = computed(() => {
	if (hasCredentialTestFailed.value) {
		return i18n.baseText('instanceAi.workflowSetup.credentialTestFailedTooltip');
	}

	if (hasPendingCredentialTest.value) {
		return i18n.baseText('instanceAi.workflowSetup.credentialTestPendingTooltip' as BaseTextKey);
	}

	if (!allSectionsComplete.value) {
		return i18n.baseText('instanceAi.workflowSetup.incompleteTooltip' as BaseTextKey);
	}

	return '';
});

const isApplyDisabled = computed(
	() =>
		isApplying.value ||
		!allSectionsComplete.value ||
		hasPendingCredentialTest.value ||
		hasCredentialTestFailed.value,
);

watch(
	accordionItems,
	(items) => {
		const openItemExists = items.some((item) => item.id === openSectionId.value);
		if (openItemExists) return;

		openSectionId.value = getFirstIncompleteItem(items)?.id ?? items[0]?.id ?? null;
	},
	{ immediate: true },
);

function getFirstIncompleteItem(items: WorkflowSetupAccordionItem[]) {
	return items.find((item) => !isItemComplete(item));
}

function getAccordionEntries(): WorkflowSetupAccordionEntry[] {
	const entries: WorkflowSetupAccordionEntry[] = [];

	for (const step of ctx.steps.value) {
		if (step.kind === 'section') {
			entries.push({ section: step.section });
			continue;
		}

		for (const section of getGroupSections(step.group)) {
			entries.push({
				section,
				group: step.group.subnodeRootNode,
			});
		}
	}

	return entries;
}

function getCredentialGroupCounts(entries: WorkflowSetupAccordionEntry[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const entry of entries) {
		const credentialGroupKey = getCredentialGroupKey(entry);
		if (!credentialGroupKey) continue;
		counts.set(credentialGroupKey, (counts.get(credentialGroupKey) ?? 0) + 1);
	}
	return counts;
}

function getCredentialGroupKey(entry: WorkflowSetupAccordionEntry): string | null {
	const { credentialType } = entry.section;
	if (!credentialType) return null;
	if (isHttpRequestNodeType(entry.section.node.type)) return null;

	return `${entry.group?.id ?? 'standalone'}|${credentialType}`;
}

function createCredentialGroupItem(
	credentialGroupKey: string,
	sections: WorkflowSetupSection[],
	group?: WorkflowSetupGroup['subnodeRootNode'],
): WorkflowSetupAccordionItem {
	const [primarySection] = sections;
	const credentialType = primarySection?.credentialType;

	return {
		kind: 'credentialGroup',
		id: getCredentialGroupId(credentialGroupKey),
		section: createCredentialGroupSection(credentialGroupKey, sections),
		sections,
		group,
		...(credentialType ? { credentialType } : {}),
	};
}

function createCredentialGroupSection(
	credentialGroupKey: string,
	sections: WorkflowSetupSection[],
): WorkflowSetupSection {
	const [primarySection] = sections;
	const currentCredentialId =
		sections.find((section) => !!section.currentCredentialId)?.currentCredentialId ?? null;

	return {
		...primarySection,
		id: getCredentialGroupId(credentialGroupKey),
		currentCredentialId,
		parameterNames: [],
		credentialTargetNodes: getUniqueCredentialTargetNodes(sections),
	};
}

function getCredentialGroupId(credentialGroupKey: string): string {
	return `credential-group-${credentialGroupKey}`.replace(/[^A-Za-z0-9_-]/g, '-');
}

function getUniqueCredentialTargetNodes(
	sections: WorkflowSetupSection[],
): WorkflowSetupSection['credentialTargetNodes'] {
	const byName = new Map<string, WorkflowSetupSection['credentialTargetNodes'][number]>();
	for (const section of sections) {
		for (const target of section.credentialTargetNodes) {
			byName.set(target.name, target);
		}
	}
	return [...byName.values()];
}

function getNodeType(section: WorkflowSetupSection) {
	return nodeTypesStore.getNodeType(section.node.type, section.node.typeVersion);
}

function isCredentialOnlySection(section: WorkflowSetupSection): boolean {
	return !!section.credentialType && section.parameterNames.length === 0;
}

function getCredentialAppName(credentialType: string): string {
	const raw =
		credentialsStore.getCredentialTypeByName(credentialType)?.displayName ?? credentialType;
	return getAppNameFromCredType(raw);
}

function getSectionTitle(section: WorkflowSetupSection): string {
	if (!section.credentialType) return section.node.name;
	return getCredentialAppName(section.credentialType);
}

function getItemTitle(item: WorkflowSetupAccordionItem): string {
	if (item.kind === 'credentialGroup' && item.credentialType) {
		return getCredentialAppName(item.credentialType);
	}

	return getSectionTitle(item.section);
}

function getGroupContext(item: WorkflowSetupAccordionItem): string | undefined {
	if (!item.group) return undefined;
	if (
		item.kind === 'credentialGroup' &&
		item.sections.some((section) => section.targetNodeName !== item.group?.name)
	) {
		return i18n.baseText('instanceAi.workflowSetup.groupContext' as BaseTextKey, {
			interpolate: { name: item.group.name },
		});
	}

	if (item.group.name === item.section.targetNodeName) return undefined;

	return i18n.baseText('instanceAi.workflowSetup.groupContext' as BaseTextKey, {
		interpolate: { name: item.group.name },
	});
}

function getSelectedCredentialId(section: WorkflowSetupSection): string | undefined {
	if (!section.credentialType) return undefined;
	return ctx.credentialSelections.value[section.targetNodeName]?.[section.credentialType];
}

function isCredentialTestPending(section: WorkflowSetupSection): boolean {
	const credentialId = getSelectedCredentialId(section);
	return !!credentialId && credentialsStore.isCredentialTestPending(credentialId);
}

function isItemComplete(item: WorkflowSetupAccordionItem): boolean {
	return item.sections.every((section) => ctx.isSectionComplete(section));
}

function isItemCredentialTestPending(item: WorkflowSetupAccordionItem): boolean {
	return item.sections.some((section) => isCredentialTestPending(section));
}

function isItemCredentialTestFailed(item: WorkflowSetupAccordionItem): boolean {
	return item.sections.some((section) => ctx.isCredentialTestFailed(section));
}

function getItemStatus(item: WorkflowSetupAccordionItem): SectionStatus {
	if (isItemComplete(item)) return 'complete';
	if (isItemCredentialTestPending(item)) return 'testing';
	if (isItemCredentialTestFailed(item)) return 'error';
	return 'todo';
}

function getItemStatusLabel(item: WorkflowSetupAccordionItem): string {
	return isItemComplete(item)
		? i18n.baseText('instanceAi.workflowSetup.statusDone' as BaseTextKey)
		: i18n.baseText('instanceAi.workflowSetup.statusTodo' as BaseTextKey);
}

function getItemStatusColor(item: WorkflowSetupAccordionItem): TextColor {
	const status = getItemStatus(item);

	if (status === 'complete') return 'success';
	if (status === 'error') return 'danger';
	return 'text-light';
}

function isSectionOpen(item: WorkflowSetupAccordionItem): boolean {
	return openSectionId.value === item.id;
}

function openSection(item: WorkflowSetupAccordionItem): void {
	openSectionId.value = item.id;
}

function getParameterSections(item: WorkflowSetupAccordionItem): WorkflowSetupSection[] {
	return item.sections.filter((section) => section.parameterNames.length > 0);
}

function getParameterGroups(item: WorkflowSetupAccordionItem): WorkflowSetupParameterGroup[] {
	const parameterSections = getParameterSections(item);
	const groupsBySignature = new Map<string, WorkflowSetupSection[]>();

	for (const section of parameterSections) {
		const signature = getParameterGroupSignature(section);
		const sections = groupsBySignature.get(signature) ?? [];
		groupsBySignature.set(signature, [...sections, section]);
	}

	return [...groupsBySignature.entries()].map(([signature, sections]) => ({
		id: signature,
		section: sections[0],
		sections,
		isShared: sections.length > 1,
	}));
}

function getParameterGroupSignature(section: WorkflowSetupSection): string {
	const nodeType = getNodeType(section);
	const parameterSignature = section.parameterNames
		.map((name) => {
			const definition = nodeType?.properties.find((property) => property.name === name);
			return [
				name,
				definition?.displayName ?? '',
				definition?.type ?? '',
				definition?.placeholder ?? '',
			].join(':');
		})
		.join('|');

	return `${section.node.type}|${parameterSignature}`;
}

async function onApply(): Promise<void> {
	if (isApplyDisabled.value) return;

	isApplying.value = true;
	try {
		await ctx.apply();
	} finally {
		isApplying.value = false;
	}
}
</script>

<template>
	<section :class="$style.accordion" data-test-id="instance-ai-workflow-setup-accordion">
		<div :class="$style.items">
			<article
				v-for="item in accordionItems"
				:key="item.id"
				:class="$style.item"
				data-test-id="instance-ai-workflow-setup-accordion-item"
			>
				<button
					type="button"
					:class="$style.itemHeader"
					:aria-expanded="isSectionOpen(item)"
					:aria-controls="`workflow-setup-accordion-section-${item.id}`"
					data-test-id="instance-ai-workflow-setup-accordion-header"
					@click="openSection(item)"
				>
					<span :class="$style.itemIcon">
						<N8nIcon
							v-if="getItemStatus(item) === 'complete'"
							icon="check"
							size="medium"
							:color="getItemStatusColor(item)"
						/>
						<N8nIcon
							v-else-if="getItemStatus(item) === 'testing'"
							icon="spinner"
							spin
							size="medium"
							:color="getItemStatusColor(item)"
						/>
						<N8nIcon
							v-else-if="getItemStatus(item) === 'error'"
							icon="triangle-alert"
							size="medium"
							:color="getItemStatusColor(item)"
						/>
						<CredentialIcon
							v-else-if="item.kind === 'credentialGroup' || isCredentialOnlySection(item.section)"
							:credential-type-name="item.section.credentialType ?? null"
							:size="16"
						/>
						<NodeIcon v-else :node-type="getNodeType(item.section)" :size="16" />
					</span>

					<span :class="$style.itemText">
						<N8nText :class="$style.itemTitle" size="medium" color="text-dark" bold>
							{{ getItemTitle(item) }}
						</N8nText>
						<N8nText v-if="getGroupContext(item)" size="small" color="text-light">
							{{ getGroupContext(item) }}
						</N8nText>
					</span>

					<span
						:class="[$style.statusPill, { [$style.statusPillDone]: isItemComplete(item) }]"
						data-test-id="instance-ai-workflow-setup-status-pill"
					>
						{{ getItemStatusLabel(item) }}
					</span>
				</button>

				<div
					v-if="isSectionOpen(item)"
					:id="`workflow-setup-accordion-section-${item.id}`"
					:class="$style.itemBody"
					data-test-id="instance-ai-workflow-setup-accordion-body"
				>
					<WorkflowSetupSectionBody
						v-if="item.kind === 'credentialGroup'"
						:section="item.section"
						:credential-sections="item.sections"
						hide-helper
					/>
					<div
						v-if="item.kind === 'credentialGroup' && getParameterSections(item).length > 0"
						:class="$style.groupValues"
					>
						<section
							v-for="parameterGroup in getParameterGroups(item)"
							:key="parameterGroup.id"
							:class="$style.groupValue"
						>
							<N8nText v-if="!parameterGroup.isShared" size="small" color="text-dark" bold>
								{{ parameterGroup.section.node.name }}
							</N8nText>
							<WorkflowSetupSectionBody
								:section="parameterGroup.section"
								:parameter-sections="parameterGroup.sections"
								hide-credential
								hide-helper
							/>
						</section>
					</div>
					<WorkflowSetupSectionBody
						v-else-if="item.kind === 'section'"
						:section="item.section"
						hide-helper
					/>
				</div>
			</article>
		</div>

		<ConfirmationFooter bordered>
			<N8nTooltip :disabled="!applyTooltip" :content="applyTooltip">
				<N8nButton
					size="medium"
					:label="i18n.baseText('instanceAi.workflowSetup.applySetup' as BaseTextKey)"
					:disabled="isApplyDisabled"
					data-test-id="instance-ai-workflow-setup-apply"
					@click="onApply"
				/>
			</N8nTooltip>
		</ConfirmationFooter>
	</section>
</template>

<style lang="scss" module>
.accordion {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
}

.items {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--sm);
}

.item {
	display: flex;
	flex-direction: column;
	background-color: transparent;

	&:not(:last-child) {
		padding-bottom: var(--spacing--xs);
	}

	& + & {
		border-top: var(--border);
		padding-top: var(--spacing--xs);
	}
}

.itemHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--xs) 0;
	border: none;
	background: transparent;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;
	user-select: none;
}

.itemIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--sm);
	flex-shrink: 0;
}

.itemText {
	display: flex;
	min-width: 0;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.itemTitle {
	overflow: hidden;
	font-size: var(--font-size--md);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.statusPill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background-color: var(--tag--color--background);
	color: var(--tag--color--text);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--xs);
	white-space: nowrap;
}

.statusPillDone {
	border-color: var(--border-color--success);
	background-color: var(--background--success);
	color: var(--text-color--success);
}

.itemBody {
	padding: 0 0 var(--spacing--xs);
}

.groupValues {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--xs);
}

.groupValue {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
