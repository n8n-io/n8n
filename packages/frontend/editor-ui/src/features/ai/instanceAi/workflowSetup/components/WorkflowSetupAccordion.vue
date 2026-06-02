<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import type { TextColor } from '@n8n/design-system/types/text';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { getAppNameFromCredType } from '@/app/utils/nodeTypesUtils';
import NodeIcon from '@/app/components/NodeIcon.vue';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { isHttpRequestNodeType } from '@/features/setupPanel/setupPanel.utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import AnimatedCollapsibleContent from '../../components/AnimatedCollapsibleContent.vue';
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
	sharedValueLabel?: string;
}

type SectionStatus = 'complete' | 'testing' | 'error' | 'todo';

const ctx = useWorkflowSetupContext();
const i18n = useI18n();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();

const openSectionIds = ref<string[]>([]);
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

const shouldShowApplyButton = computed(
	() =>
		allSectionsComplete.value && !hasPendingCredentialTest.value && !hasCredentialTestFailed.value,
);

watch(
	accordionItems,
	(items) => {
		const itemIds = new Set(items.map((item) => item.id));
		const nextOpenSectionIds = openSectionIds.value.filter((id) => itemIds.has(id));

		if (nextOpenSectionIds.length === 0) {
			const defaultOpenItem = getFirstIncompleteItem(items) ?? items[0];
			if (defaultOpenItem) nextOpenSectionIds.push(defaultOpenItem.id);
		}

		openSectionIds.value = nextOpenSectionIds;
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
	if (entry.section.credentialSelectionMode === 'explicit') return null;
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
	const credentialSelectionMode = sections.some(
		(section) => section.credentialSelectionMode === 'explicit',
	)
		? 'explicit'
		: primarySection?.credentialSelectionMode;
	const setupGuidance =
		sections.find(
			(section) =>
				section.setupGuidance?.credentialReason || section.setupGuidance?.credentialHowTo,
		)?.setupGuidance ?? primarySection?.setupGuidance;

	return {
		...primarySection,
		id: getCredentialGroupId(credentialGroupKey),
		currentCredentialId,
		...(credentialSelectionMode ? { credentialSelectionMode } : {}),
		...(setupGuidance ? { setupGuidance } : {}),
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
	if (isHttpRequestNodeType(section.node.type)) return getHttpRequestTitle(section);
	if (!section.credentialType) return section.node.name;
	return getCredentialAppName(section.credentialType);
}

function getItemTitle(item: WorkflowSetupAccordionItem): string {
	if (item.kind === 'credentialGroup' && item.credentialType) {
		return getCredentialAppName(item.credentialType);
	}

	return getSectionTitle(item.section);
}

function getItemDescription(item: WorkflowSetupAccordionItem): string {
	return (
		formatGuidanceText(getGuidanceDescription(item), getHttpCredentialSecurityNote(item)) ||
		getFallbackActionDescription(item)
	);
}

function getHttpRequestTitle(section: WorkflowSetupSection): string {
	const url = section.node.parameters.url;
	if (typeof url !== 'string') return section.node.name;

	try {
		return new URL(url).host || section.node.name;
	} catch {
		return section.node.name;
	}
}

function getHttpRequestOrigin(section: WorkflowSetupSection): string | undefined {
	const url = section.node.parameters.url;
	if (typeof url !== 'string') return undefined;

	try {
		return new URL(url).origin;
	} catch {
		return undefined;
	}
}

function getHttpCredentialSecurityNote(item: WorkflowSetupAccordionItem): string {
	if (!item.section.credentialType || !isHttpRequestNodeType(item.section.node.type)) return '';

	const origin = getHttpRequestOrigin(item.section);
	if (!origin) {
		return i18n.baseText(
			'instanceAi.workflowSetup.httpCredentialSecurityNoteFallback' as BaseTextKey,
		);
	}

	return i18n.baseText('instanceAi.workflowSetup.httpCredentialSecurityNote' as BaseTextKey, {
		interpolate: { origin },
	});
}

function getGuidanceDescription(item: WorkflowSetupAccordionItem): string {
	for (const section of item.sections) {
		const reason = section.setupGuidance?.credentialReason;
		if (isUsefulDescription(reason)) return normalizeDescription(reason);
	}

	for (const section of item.sections) {
		for (const parameterName of section.parameterNames) {
			const reason = section.setupGuidance?.parameters?.[parameterName]?.reason;
			if (isUsefulDescription(reason)) return normalizeDescription(reason);
		}
	}

	return '';
}

function isUsefulDescription(value: string | undefined): value is string {
	const description = value?.trim();
	if (!description) return false;
	return !/^connect .+ so n8n can use it in this workflow\.?$/i.test(description);
}

function normalizeDescription(value: string): string {
	return value.trim().replace(/\.$/, '');
}

function getFallbackActionDescription(item: WorkflowSetupAccordionItem): string {
	const action = getFallbackAction(item);
	if (!action) return '';

	return i18n.baseText('instanceAi.workflowSetup.cardDescriptionAction' as BaseTextKey, {
		interpolate: { action },
	});
}

function getFallbackAction(item: WorkflowSetupAccordionItem): string {
	const title = getItemTitle(item);
	for (const section of item.sections) {
		const action = getNodeAction(section, title);
		if (action) return action;
	}

	return '';
}

function getNodeAction(section: WorkflowSetupSection, title: string): string {
	const rawName = section.node.name || section.targetNodeName;
	const serviceNameVariants = getServiceNameVariants(title);
	const action = toActionPhrase(stripServiceReferences(rawName, serviceNameVariants));
	const normalizedTitle = title.toLowerCase();

	if (!action || action.toLowerCase() === normalizedTitle) return '';
	return action;
}

function getServiceNameVariants(title: string): string[] {
	const variants = new Set([title]);
	if (title.endsWith('s')) variants.add(title.slice(0, -1));
	return [...variants].filter((variant) => variant.length > 0);
}

function stripServiceReferences(value: string, serviceNameVariants: string[]): string {
	let action = value.trim().replace(/^set up\s+/i, '');

	for (const serviceName of serviceNameVariants) {
		const escapedServiceName = escapeRegExp(serviceName);
		action = action
			.replace(
				new RegExp(
					`\\s+(from|to|with|using|in|into|on)\\s+(your\\s+)?${escapedServiceName}\\b.*$`,
					'i',
				),
				'',
			)
			.replace(new RegExp(`^${escapedServiceName}\\s+`, 'i'), '')
			.replace(new RegExp(`\\s+${escapedServiceName}$`, 'i'), '');
	}

	return action.replace(/\s+(from|to|with|using|in|into|on)$/i, '').trim();
}

function toActionPhrase(value: string): string {
	const trimmedValue = value.trim();
	if (!trimmedValue) return '';

	const [firstWord = '', ...restWords] = trimmedValue.split(/\s+/);
	const rest = restWords.join(' ');
	const normalizedFirstWord =
		firstWord.toLowerCase() === 'lookup' ? 'look up' : firstWord.toLowerCase();
	const phrase = [normalizedFirstWord, rest].filter(Boolean).join(' ');

	return phrase.replace(/\b[A-Z][a-z]+\b/g, (word) => word.toLowerCase());
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatGuidanceText(...parts: string[]): string {
	const cleanedParts = parts.map((part) => part.trim()).filter(Boolean);
	if (cleanedParts.length <= 1) return cleanedParts[0] ?? '';

	return cleanedParts.map((part) => (/[.!?]$/.test(part) ? part : `${part}.`)).join(' ');
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
	return openSectionIds.value.includes(item.id);
}

function setSectionOpen(item: WorkflowSetupAccordionItem, isOpen: boolean): void {
	const currentOpenSectionIds = openSectionIds.value;

	if (isOpen) {
		if (currentOpenSectionIds.includes(item.id)) return;
		openSectionIds.value = [...currentOpenSectionIds, item.id];
		return;
	}

	openSectionIds.value = currentOpenSectionIds.filter((id) => id !== item.id);
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

	return [...groupsBySignature.entries()].flatMap(([signature, sections]) => {
		const [section] = sections;
		if (!section) return [];

		const sharedValueLabel = getParameterGroupSharedValueLabel(sections);
		return [
			{
				id: signature,
				section,
				sections,
				isShared: sections.length > 1,
				...(sharedValueLabel ? { sharedValueLabel } : {}),
			},
		];
	});
}

function getParameterGroupSignature(section: WorkflowSetupSection): string {
	const sharedValueKeys = section.parameterNames.map(
		(name) => section.setupGuidance?.parameters?.[name]?.sharedValueKey,
	);

	if (sharedValueKeys.every((key): key is string => typeof key === 'string' && key.length > 0)) {
		return `shared:${sharedValueKeys.join('|')}`;
	}

	return `section:${section.id}`;
}

function getParameterGroupSharedValueLabel(sections: WorkflowSetupSection[]): string | undefined {
	for (const section of sections) {
		for (const parameterName of section.parameterNames) {
			const label = section.setupGuidance?.parameters?.[parameterName]?.sharedValueLabel;
			if (label) return label;
		}
	}

	return undefined;
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
		<CollapsibleRoot
			v-for="item in accordionItems"
			:key="item.id"
			:open="isSectionOpen(item)"
			:unmount-on-hide="false"
			:class="$style.item"
			data-test-id="instance-ai-workflow-setup-accordion-item"
			@update:open="setSectionOpen(item, $event)"
		>
			<div :class="$style.itemHeader">
				<CollapsibleTrigger as-child>
					<button
						type="button"
						:class="$style.itemTrigger"
						:aria-controls="`workflow-setup-accordion-section-${item.id}`"
						data-test-id="instance-ai-workflow-setup-accordion-header"
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
								:size="20"
							/>
							<NodeIcon v-else :node-type="getNodeType(item.section)" :size="20" />
						</span>

						<span :class="$style.itemText">
							<span :class="$style.itemTitleRow">
								<N8nText :class="$style.itemTitle" size="medium" color="text-dark" bold>
									{{ getItemTitle(item) }}
								</N8nText>
								<N8nIcon
									icon="chevron-down"
									size="xsmall"
									:class="[$style.chevron, { [$style.chevronOpen]: isSectionOpen(item) }]"
								/>
							</span>
							<N8nText
								v-if="getItemDescription(item)"
								:class="$style.itemDescription"
								size="small"
								data-test-id="instance-ai-workflow-setup-card-description"
							>
								{{ getItemDescription(item) }}
							</N8nText>
							<N8nText v-if="getGroupContext(item)" size="small" color="text-light">
								{{ getGroupContext(item) }}
							</N8nText>
						</span>
					</button>
				</CollapsibleTrigger>

				<N8nTooltip
					v-if="isSectionOpen(item) && shouldShowApplyButton"
					:disabled="!applyTooltip"
					:content="applyTooltip"
				>
					<N8nButton
						:class="$style.applyButton"
						size="medium"
						:label="i18n.baseText('instanceAi.workflowSetup.applySetup' as BaseTextKey)"
						:disabled="isApplyDisabled"
						data-test-id="instance-ai-workflow-setup-apply"
						@click="onApply"
					/>
				</N8nTooltip>
				<span
					v-else
					:class="[$style.statusPill, { [$style.statusPillDone]: isItemComplete(item) }]"
					data-test-id="instance-ai-workflow-setup-status-pill"
				>
					{{ getItemStatusLabel(item) }}
				</span>
			</div>

			<AnimatedCollapsibleContent mode="measured" :open="isSectionOpen(item)">
				<div :id="`workflow-setup-accordion-section-${item.id}`" :class="$style.itemContent">
					<div :class="$style.itemBody" data-test-id="instance-ai-workflow-setup-accordion-body">
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
								<N8nText v-if="parameterGroup.sharedValueLabel" size="small" color="text-dark" bold>
									{{ parameterGroup.sharedValueLabel }}
								</N8nText>
								<N8nText v-else-if="!parameterGroup.isShared" size="small" color="text-dark" bold>
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
				</div>
			</AnimatedCollapsibleContent>
		</CollapsibleRoot>
	</section>
</template>

<style lang="scss" module>
.accordion {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.item {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
}

.itemContent {
	display: flex;
	flex-direction: column;
}

.itemHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--sm);
}

.itemTrigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	flex: 1;
	padding: 0;
	border: none;
	background: transparent;
	color: inherit;
	font: inherit;
	text-align: left;
	cursor: pointer;
	user-select: none;
}

.applyButton {
	flex-shrink: 0;
}

.itemIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--md);
	flex-shrink: 0;
}

.itemText {
	display: flex;
	min-width: 0;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.itemTitleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.itemTitle {
	min-width: 0;
	overflow: hidden;
	font-size: var(--font-size--md);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.itemDescription {
	min-width: 0;
	overflow: hidden;
	color: var(--text-color--subtle);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chevron {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
	transform: rotate(-90deg);
	transition:
		color var(--animation--duration) var(--animation--easing),
		transform var(--animation--duration) var(--animation--easing);
}

.chevronOpen {
	transform: rotate(0deg);
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
	padding: 0 var(--spacing--sm) var(--spacing--sm);
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
