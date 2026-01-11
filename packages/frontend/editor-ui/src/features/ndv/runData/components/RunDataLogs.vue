<script setup lang="ts">
import { computed } from 'vue';
import { useLogsStore } from '@/app/stores/logs.store';
import { N8nText, N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useClipboard } from '@/app/composables/useClipboard';
import { useToast } from '@/app/composables/useToast';
import { LogLevel } from 'n8n-workflow';

interface Props {
	nodeName: string;
}

const props = defineProps<Props>();

const i18n = useI18n();
const logsStore = useLogsStore();
const clipboard = useClipboard();
const toast = useToast();

const consoleMessages = computed(() => logsStore.getConsoleMessagesForNode(props.nodeName));

interface ParsedSource {
	node: string;
	date: string;
	tag: string;
}

function parseSource(source: string): ParsedSource {
	const nodeMatch = source.match(/Node: "([^"]+)"/);
	const dateMatch = source.match(/Date: "([^"]+)"/);
	const tagMatch = source.match(/Tag: "([^"]+)"/);

	const node = nodeMatch ? nodeMatch[1] : '';
	const date = dateMatch ? dateMatch[1] : new Date().toISOString();
	const tag = tagMatch ? tagMatch[1] : 'Log';

	return { node, date, tag };
}

function formatDate(isoDate: string): string {
	try {
		const date = new Date(isoDate);
		if (isNaN(date.getTime())) {
			return new Date().toLocaleString();
		}
		return date.toLocaleString();
	} catch {
		return new Date().toLocaleString();
	}
}

function formatMessage(message: unknown): string {
	if (typeof message === 'string') {
		return message;
	}
	return JSON.stringify(message, null, 2);
}

function getLogLevelClass(level: LogLevel): string {
	switch (level) {
		case 'error':
			return 'error';
		case 'warn':
			return 'warning';
		case 'info':
			return 'info';
		case 'debug':
			return 'debug';
		default:
			return 'info';
	}
}

function getLogLevelDisplay(level: LogLevel): string {
	return level.toUpperCase();
}

function copyAllLogs() {
	const logsData = consoleMessages.value.map((log) => {
		const parsed = parseSource(log.source);
		return {
			level: log.level,
			tag: parsed.tag,
			date: formatDate(parsed.date),
			messages: log.messages.map((msg) => {
				if (typeof msg === 'string') {
					try {
						return JSON.parse(msg);
					} catch {
						return msg;
					}
				}
				return msg;
			}),
		};
	});

	void clipboard.copy(JSON.stringify(logsData, null, 2));
	toast.showMessage({
		title: 'Copied to clipboard',
		type: 'info',
	});
}
</script>

<template>
	<div :class="$style.container">
		<div v-if="consoleMessages.length === 0" :class="$style.empty">
			<N8nText size="large" color="text-light">
				{{ i18n.baseText('runData.logs.noLogs') }}
			</N8nText>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('runData.logs.noLogs.description') }}
			</N8nText>
		</div>
		<div v-else>
			<div :class="$style.logsHeader">
				<N8nText :class="$style.logsTitle" size="small" bold> Node Debug Logs </N8nText>
				<N8nTooltip content="Copy to clipboard" placement="left">
					<N8nIconButton
						icon="copy"
						type="tertiary"
						size="small"
						:class="$style.copyButton"
						@click="copyAllLogs"
					/>
				</N8nTooltip>
			</div>
			<div :class="$style.logsList">
				<div
					v-for="log in consoleMessages"
					:key="log.id"
					:class="[$style.logEntry, $style[`logEntry--${getLogLevelClass(log.level)}`]]"
					data-test-id="console-log-entry"
				>
					<div :class="$style.logHeader">
						<div :class="$style.logMetadata">
							<span :class="[$style.tag, $style[`tag--${getLogLevelClass(log.level)}`]]">
								{{ getLogLevelDisplay(log.level) }}
							</span>
							<N8nText :class="$style.logDate" size="xsmall" color="text-light">
								{{ formatDate(parseSource(log.source).date) }}
							</N8nText>
						</div>
					</div>
					<div :class="$style.logBody">
						<div v-for="(message, index) in log.messages" :key="index" :class="$style.logMessage">
							<pre
								:class="[
									$style.logMessageContent,
									$style[`logMessageContent--${getLogLevelClass(log.level)}`],
								]"
							>
								{{ formatMessage(message) }}
							</pre
							>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	overflow-y: auto;
	padding: var(--spacing--3xs);
	background-color: var(--color--background--base);
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	gap: var(--spacing--3xs);
	text-align: center;
}

.logsHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--3xs);
	margin-bottom: var(--spacing--sm);
	background: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius--base);
}

.logsTitle {
	font-weight: var(--font-weight--bold);
	color: var(--color--text--dark);
}

.copyButton {
	opacity: 0.7;
	transition: opacity 0.2s ease;

	&:hover {
		opacity: 1;
	}
}

.logsList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.logEntry {
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-radius: var(--radius--base);
	overflow: hidden;
}

.logEntry--error {
	border-left: 3px solid var(--color--danger);
}

.logEntry--warning {
	border-left: 3px solid var(--color--warning);
}

.logEntry--info {
	border-left: 3px solid var(--color--info);
}

.logEntry--debug {
	border-left: 3px solid var(--color--text--tint-2);
}

.logHeader {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	padding: var(--spacing--3xs);
	background: var(--color--background--light);
	border-bottom: var(--border);
}

.logMetadata {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
}

.tag {
	display: inline-block;
	padding: 2px 8px;
	background: var(--color--foreground);
	color: var(--color--background--xlight);
	border-radius: var(--radius--small);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	white-space: nowrap;
}

.tag--error {
	background: var(--color--danger);
	color: var(--color--neutral-white);
}

.tag--warning {
	background: var(--color--warning);
	color: var(--color--neutral-white);
}

.tag--info {
	background: var(--color--info);
	color: var(--color--neutral-white);
}

.tag--debug {
	background: var(--color--text--tint-2);
	color: var(--color--background--xlight);
}

.logDate {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--color--text--base);
	margin-left: auto;
	padding-right: var(--spacing--2xs);
}

.logBody {
	background: var(--color--background--base);
}

.logMessage {
	& + & {
		margin-top: var(--spacing--3xs);
	}
}

.logMessageContent {
	padding: var(--spacing--2xs);
	margin: 0;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--color--text--dark);
	background: var(--color--background--light-1);
	white-space: pre-wrap;
	word-break: break-word;
	overflow-x: auto;
}

.logMessageContent--error {
	color: var(--color--danger);
	background: var(--color--danger--tint-4);
}

.logMessageContent--warning {
	color: var(--color--warning--shade-1);
	background: var(--color--warning--tint-2);
}

.logMessageContent--info {
	color: var(--color--text--dark);
	background: var(--color--background--light-1);
}

.logMessageContent--debug {
	color: var(--color--text--tint-1);
	background: var(--color--background--light-2);
}
</style>
