<script setup lang="ts">
import { N8nButton, N8nCheckbox, N8nIcon, N8nInput, N8nPopover, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, ref } from 'vue';

import {
	groupToolPickerOptions,
	mcpServerSelection,
	toggleMcpServer,
	toggleMcpServerTool,
	toolPolicyChips,
	type ToolPickerOption,
	type ToolPickerServer,
	type ToolPolicyChip,
} from '../utils/tool-policy-picker';
import AgentToolPolicyChips from './AgentToolPolicyChips.vue';

const props = withDefaults(
	defineProps<{
		/** The keys of the selected options. */
		modelValue: string[];
		options: ToolPickerOption[];
		/** The MCP servers whose tool list is loading or did not load, by server name. */
		serverStates?: Record<string, 'loading' | 'failed'>;
		disabled?: boolean;
	}>(),
	{ serverStates: () => ({}), disabled: false },
);

const emit = defineEmits<{
	'update:modelValue': [keys: string[]];
	/** Asks for the tool list of a server again. */
	retry: [serverName: string];
}>();

const i18n = useI18n();

const open = ref(false);
const query = ref('');
/** The servers that the user opened or closed. Others open when part of them is selected. */
const expandedServers = ref<Record<string, boolean>>({});

const chips = computed(() => toolPolicyChips(props.modelValue, props.options));
const groups = computed(() => groupToolPickerOptions(props.options));

const search = computed(() => query.value.trim().toLowerCase());
const matches = (text: string) => search.value === '' || text.toLowerCase().includes(search.value);
const visible = (options: ToolPickerOption[]) => options.filter((option) => matches(option.label));

/** The name of an MCP tool without its server, which the group header already shows. */
function toolName(option: ToolPickerOption): string {
	const { selector } = option;
	return selector.kind === 'tool' && selector.ref.type === 'mcpServer' && selector.ref.tool
		? selector.ref.tool
		: option.label;
}

const sections = computed(() => [
	{ id: 'categories', options: visible(groups.value.categories) },
	{ id: 'tools', options: visible(groups.value.tools) },
]);
const lateSections = computed(() => [
	{ id: 'nodeTypes', options: visible(groups.value.nodeTypes) },
	{ id: 'other', options: visible(groups.value.other) },
]);

/** A server shows when its name matches, or when one of its tools matches. */
const servers = computed(() =>
	groups.value.servers.flatMap((server) => {
		const nameMatches = matches(server.name);
		const tools = nameMatches
			? server.tools
			: server.tools.filter((tool) => matches(toolName(tool)));
		return nameMatches || tools.length > 0 ? [{ server, tools }] : [];
	}),
);

const isEmpty = computed(
	() =>
		servers.value.length === 0 &&
		[...sections.value, ...lateSections.value].every((section) => section.options.length === 0),
);

function isExpanded(server: ToolPickerServer): boolean {
	if (search.value !== '') return true;
	return (
		expandedServers.value[server.name] ??
		mcpServerSelection(props.modelValue, server).state === 'some'
	);
}

function toggleExpanded(server: ToolPickerServer) {
	expandedServers.value = { ...expandedServers.value, [server.name]: !isExpanded(server) };
}

function serverDetail(server: ToolPickerServer): string {
	const state = props.serverStates[server.name];
	if (state === 'loading') return i18n.baseText('agents.toolPolicy.picker.server.loading');
	const { state: selection, count, listed } = mcpServerSelection(props.modelValue, server);
	if (selection === 'all') return i18n.baseText('agents.toolPolicy.picker.server.all');
	if (state === 'failed') return i18n.baseText('agents.toolPolicy.picker.server.failed');
	if (listed === 0) return '';
	return i18n.baseText('agents.toolPolicy.picker.server.some', {
		interpolate: { count, total: listed },
	});
}

function update(keys: string[]) {
	if (props.disabled) return;
	emit('update:modelValue', keys);
}

function toggle(key: string) {
	update(
		props.modelValue.includes(key)
			? props.modelValue.filter((selected) => selected !== key)
			: [...props.modelValue, key],
	);
}

function removeChip(chip: ToolPolicyChip) {
	update(props.modelValue.filter((key) => !chip.keys.includes(key)));
}

function onOpen(value: boolean) {
	open.value = value && !props.disabled;
	if (!value) query.value = '';
}
</script>

<template>
	<div :class="$style.root">
		<N8nPopover
			:open="open"
			side="bottom"
			align="start"
			width="calc(var(--spacing--5xl) + var(--spacing--4xl))"
			:enable-scrolling="false"
			@update:open="onOpen"
		>
			<template #trigger>
				<div
					role="button"
					tabindex="0"
					:class="[$style.field, open && $style.fieldOpen, disabled && $style.fieldDisabled]"
					:aria-disabled="disabled"
					data-testid="agent-tool-policy-tool-field-trigger"
				>
					<AgentToolPolicyChips :chips="chips" :removable="!disabled" @remove="removeChip" />
					<span :class="$style.add">
						<N8nIcon icon="plus" size="xsmall" />
						{{ i18n.baseText('agents.toolPolicy.picker.add') }}
					</span>
				</div>
			</template>
			<template #content>
				<div :class="$style.picker" data-testid="agent-tool-policy-picker">
					<N8nInput
						v-model="query"
						size="small"
						:placeholder="i18n.baseText('agents.toolPolicy.picker.search')"
						:class="$style.search"
						data-testid="agent-tool-policy-picker-search"
					/>
					<div :class="$style.list">
						<template v-for="section in sections" :key="section.id">
							<template v-if="section.options.length > 0">
								<div :class="$style.group">
									{{ i18n.baseText(`agents.toolPolicy.picker.group.${section.id}` as BaseTextKey) }}
								</div>
								<div
									v-for="option in section.options"
									:key="option.key"
									:class="$style.row"
									data-testid="agent-tool-policy-picker-option"
								>
									<N8nCheckbox
										:model-value="modelValue.includes(option.key)"
										:label="option.label"
										@update:model-value="toggle(option.key)"
									/>
								</div>
							</template>
						</template>

						<template v-if="servers.length > 0">
							<div :class="$style.group">
								{{ i18n.baseText('agents.toolPolicy.picker.group.mcpServers') }}
							</div>
							<template v-for="{ server, tools } in servers" :key="server.name">
								<div
									:class="[$style.row, $style.serverRow]"
									data-testid="agent-tool-policy-picker-server"
								>
									<N8nCheckbox
										:model-value="mcpServerSelection(modelValue, server).state === 'all'"
										:indeterminate="mcpServerSelection(modelValue, server).state === 'some'"
										:label="server.name"
										:class="$style.serverName"
										@update:model-value="update(toggleMcpServer(modelValue, server))"
									/>
									<span :class="$style.meta">{{ serverDetail(server) }}</span>
									<N8nButton
										v-if="serverStates[server.name] === 'failed'"
										variant="ghost"
										size="xsmall"
										data-testid="agent-tool-policy-picker-server-retry"
										@click="emit('retry', server.name)"
									>
										{{ i18n.baseText('agents.toolPolicy.picker.server.retry') }}
									</N8nButton>
									<button
										v-if="server.tools.length > 0"
										type="button"
										:class="$style.expand"
										:aria-expanded="isExpanded(server)"
										:aria-label="
											i18n.baseText('agents.toolPolicy.picker.server.toggle', {
												interpolate: { name: server.name },
											})
										"
										data-testid="agent-tool-policy-picker-server-toggle"
										@click="toggleExpanded(server)"
									>
										<N8nIcon
											:icon="isExpanded(server) ? 'chevron-down' : 'chevron-right'"
											size="small"
										/>
									</button>
								</div>
								<template v-if="isExpanded(server)">
									<div
										v-for="tool in tools"
										:key="tool.key"
										:class="[$style.row, $style.toolRow]"
										data-testid="agent-tool-policy-picker-option"
									>
										<N8nCheckbox
											:model-value="
												mcpServerSelection(modelValue, server).state === 'all' ||
												modelValue.includes(tool.key)
											"
											:label="toolName(tool)"
											@update:model-value="
												update(toggleMcpServerTool(modelValue, server, tool.key))
											"
										/>
									</div>
								</template>
							</template>
						</template>

						<template v-for="section in lateSections" :key="section.id">
							<template v-if="section.options.length > 0">
								<div :class="$style.group">
									{{ i18n.baseText(`agents.toolPolicy.picker.group.${section.id}` as BaseTextKey) }}
								</div>
								<div
									v-for="option in section.options"
									:key="option.key"
									:class="$style.row"
									data-testid="agent-tool-policy-picker-option"
								>
									<N8nCheckbox
										:model-value="modelValue.includes(option.key)"
										:label="option.label"
										@update:model-value="toggle(option.key)"
									/>
								</div>
							</template>
						</template>

						<N8nText
							v-if="isEmpty"
							size="small"
							:class="$style.empty"
							data-testid="agent-tool-policy-picker-empty"
						>
							{{ i18n.baseText('agents.toolPolicy.picker.noResults') }}
						</N8nText>
					</div>
					<div :class="$style.footer">
						<N8nText size="small" :class="$style.meta">
							{{
								i18n.baseText('agents.toolPolicy.picker.selected', {
									interpolate: { count: chips.length },
								})
							}}
						</N8nText>
						<N8nButton
							variant="ghost"
							size="xsmall"
							:disabled="modelValue.length === 0"
							data-testid="agent-tool-policy-picker-clear"
							@click="update([])"
						>
							{{ i18n.baseText('agents.toolPolicy.picker.clear') }}
						</N8nButton>
						<N8nButton
							size="small"
							:class="$style.done"
							data-testid="agent-tool-policy-picker-done"
							@click="onOpen(false)"
						>
							{{ i18n.baseText('agents.toolPolicy.picker.done') }}
						</N8nButton>
					</div>
				</div>
			</template>
		</N8nPopover>
	</div>
</template>

<style lang="scss" module>
.root {
	flex: 1 1 0;
	min-width: 0;
}

.field {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--4xs);
	min-height: var(--spacing--xl);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background--light-3);
	cursor: pointer;
}

.fieldOpen {
	border-color: var(--focus--border-color);
}

.fieldDisabled {
	cursor: default;
}

.add {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--4xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	white-space: nowrap;
}

.picker {
	display: flex;
	flex-direction: column;
}

.search {
	padding: var(--spacing--xs) var(--spacing--xs) var(--spacing--4xs);
}

.list {
	max-height: calc(var(--spacing--5xl) * 1.5);
	overflow-y: auto;
	padding-bottom: var(--spacing--2xs);
}

.group {
	padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--4xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.06em;
	text-transform: uppercase;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--spacing--xl);
	padding: 0 var(--spacing--sm);
}

.serverRow {
	background: var(--color--background--light-2);
}

.serverName {
	flex: 1 1 0;
	min-width: 0;
	font-weight: var(--font-weight--bold);
}

.toolRow {
	padding-left: var(--spacing--xl);
}

.meta {
	flex: none;
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	white-space: nowrap;
}

.expand {
	display: inline-flex;
	flex: none;
	padding: 0;
	border: 0;
	background: none;
	color: var(--text-color--subtler);
	cursor: pointer;
}

.empty {
	display: block;
	padding: var(--spacing--sm);
	color: var(--text-color--subtler);
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-top: var(--border);
}

.done {
	margin-left: auto;
}
</style>
