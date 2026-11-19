import type { StoryFn } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import '../../css/_tokens.scss';
import './ChatInput.mentions.stories.css';

import N8nChatInput from './ChatInput.vue';
import type { WorkflowSuggestion } from '../../types/assistant';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';
import N8nDropdownMenu from '../N8nDropdownMenu/DropdownMenu.vue';
import type {
	DropdownMenuExposed,
	DropdownMenuItemProps,
} from '../N8nDropdownMenu/DropdownMenu.types';

export default {
	title: 'Areas/Assistant/ChatInput',
	component: N8nChatInput,
	argTypes: {
		modelValue: {
			control: 'text',
		},
		layout: {
			control: 'select',
			options: ['single-line', 'multiline', 'adaptive'],
		},
		placeholder: {
			control: 'text',
		},
		maxLength: {
			control: 'number',
		},
		maxLinesBeforeScroll: {
			control: 'number',
		},
		streaming: {
			control: 'boolean',
		},
		disabled: {
			control: 'boolean',
		},
		refocusAfterSend: {
			control: 'boolean',
		},
	},
	parameters: {
		backgrounds: { default: '--color--background--light-2' },
		docs: {
			description: {
				component:
					'A chat input with single-line and multiline layouts, submit/stop actions, and slot-based top and bottom bars.',
			},
		},
	},
};

const methods = {
	onUpdateModelValue: action('update:modelValue'),
	onUpgradeClick: action('upgrade-click'),
	onSubmit: action('submit'),
	onStop: action('stop'),
	onFocus: action('focus'),
	onBlur: action('blur'),
};

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nChatInput,
	},
	template: `
		<div style="width: 500px; max-width: 100%;">
			<n8n-chat-input
				v-bind="args"
				:modelValue="val"
				@update:modelValue="handleUpdateModelValue"
				@submit="onSubmit"
				@stop="onStop"
				@focus="onFocus"
				@blur="onBlur"
			/>
		</div>
	`,
	data() {
		return {
			val: this.args.modelValue || '',
		};
	},
	watch: {
		args: {
			handler(newArgs) {
				if (newArgs.modelValue !== undefined) {
					this.val = newArgs.modelValue;
				}
			},
			deep: true,
			immediate: true,
		},
	},
	methods: {
		...methods,
		handleUpdateModelValue(value: string) {
			this.val = value;
			this.onUpdateModelValue(value);
		},
	},
});

export const Default = Template.bind({});
Default.args = {
	placeholder: 'Type your message here...',
	maxLength: 1000,
};

export const SingleLine = Template.bind({});
SingleLine.args = {
	placeholder: 'Type your message here...',
	maxLength: 1000,
	layout: 'single-line',
};

export const MultiLine = Template.bind({});
MultiLine.args = {
	placeholder: 'Type your message here...',
	maxLength: 1000,
};

export const Adaptive = Template.bind({});
Adaptive.args = {
	placeholder: 'Starts as one line and grows with your text...',
	maxLength: 1000,
	layout: 'adaptive',
};
Adaptive.parameters = {
	docs: {
		description: {
			story:
				'Adaptive supports the default icon-only send/stop button. A custom button label or action slot falls back to the multiline layout.',
		},
	},
};

const workflowSuggestions: WorkflowSuggestion[] = [
	{
		id: 'invoice-pipeline',
		summary: 'Invoice processing pipeline',
		prompt:
			'Create an invoice parsing workflow using n8n forms. Extract key information and store in Airtable.',
	},
	{
		id: 'ai-news-digest',
		summary: 'Daily AI news digest',
		prompt:
			'Create a workflow that fetches the latest AI news every morning at 8 AM and sends a summary via Telegram.',
	},
	{
		id: 'email-summary',
		summary: 'Summarize emails with AI',
		prompt:
			'Build a workflow that retrieves emails, performs AI analysis, and sends a summary to Slack.',
	},
];

interface PromptAttachment {
	name: string;
	type: string;
}

const promptAttachments: PromptAttachment[] = [
	{
		name: 'invoice-screenshot.png',
		type: 'image/png',
	},
	{
		name: 'workflow-notes.pdf',
		type: 'application/pdf',
	},
];

const LeadingTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nIcon,
		N8nChatInput,
	},
	template: `
		<div style="width: 500px; max-width: 100%;">
			<n8n-chat-input v-bind="args" @submit="onSubmit" @stop="onStop">
				<template #leading>
					<div
						style="
							display: flex;
							flex-wrap: wrap;
							gap: var(--spacing--2xs);
						"
					>
						<div
							v-for="attachment in args.attachments"
							:key="attachment.name"
							style="
								position: relative;
								display: flex;
								align-items: center;
								justify-content: center;
								width: 80px;
								height: 80px;
								overflow: hidden;
								border: var(--border);
								border-radius: var(--radius--lg);
								background: var(--color--foreground--tint-2);
								color: var(--color--text--tint-1);
							"
						>
							<N8nIcon icon="file" size="large" />
							<button
								type="button"
								:aria-label="'Remove ' + attachment.name"
								style="
									position: absolute;
									top: var(--spacing--4xs);
									right: var(--spacing--4xs);
									display: flex;
									align-items: center;
									justify-content: center;
									width: 20px;
									height: 20px;
									padding: 0;
									color: white;
									background: color-mix(in srgb, var(--color--foreground--shade-2) 70%, transparent);
									border: none;
									border-radius: 50%;
									cursor: pointer;
								"
								@click.stop="onRemoveAttachment(attachment.name)"
							>
								<N8nIcon icon="x" size="small" />
							</button>
						</div>
					</div>
				</template>
			</n8n-chat-input>
		</div>
	`,
	methods: {
		onSubmit: methods.onSubmit,
		onStop: methods.onStop,
		onRemoveAttachment: action('remove-attachment'),
	},
});

const TrailingTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nChatInput,
	},
	template: `
		<div style="width: 500px; max-width: 100%;">
			<n8n-chat-input v-bind="args" @submit="onSubmit" @stop="onStop">
				<template #trailing>
					<div
						style="
							display: flex;
							flex-wrap: wrap;
							gap: var(--spacing--2xs);
						"
					>
						<button
							v-for="suggestion in args.suggestions"
							:key="suggestion.id"
							type="button"
							style="
								display: inline-flex;
								align-items: center;
								justify-content: center;
								padding: var(--spacing--4xs) var(--spacing--2xs);
								border-radius: 56px;
								border: var(--border);
								background: var(--color--background--light-3);
								font-size: var(--font-size--2xs);
								color: var(--color--text--shade-1);
							"
						>
							{{ suggestion.summary }}
						</button>
					</div>
				</template>
			</n8n-chat-input>
		</div>
	`,
	methods: {
		onSubmit: methods.onSubmit,
		onStop: methods.onStop,
	},
});

const ActionsTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nIconButton,
		N8nChatInput,
		N8nTooltip,
	},
	template: `
		<div style="width: 500px; max-width: 100%;">
			<n8n-chat-input v-bind="args" @submit="onSubmit" @stop="onStop">
				<template #left-actions>
					<n8n-tooltip content="Context">
						<n8n-icon-button
							icon="plus"
							title="Context"
							variant="ghost"
							size="medium"
							@click="onContextClick"
						/>
					</n8n-tooltip>
				</template>
				<template #right-actions>
					<n8n-tooltip content="Voice">
						<n8n-icon-button
							icon="mic"
							title="Voice input"
							variant="ghost"
							size="medium"
							@click="onMicClick"
						/>
					</n8n-tooltip>
				</template>
			</n8n-chat-input>
		</div>
	`,
	methods: {
		onSubmit: methods.onSubmit,
		onStop: methods.onStop,
		onContextClick: action('context-click'),
		onMicClick: action('mic-click'),
	},
});

export const WithLeading = LeadingTemplate.bind({});
WithLeading.args = {
	placeholder: 'Ask about the attached files...',
	maxLength: 1000,
	attachments: promptAttachments,
};

export const WithTrailing = TrailingTemplate.bind({});
WithTrailing.args = {
	placeholder: 'Type your message here...',
	maxLength: 1000,
	suggestions: workflowSuggestions,
};

export const WithActions = ActionsTemplate.bind({});
WithActions.args = {
	placeholder: 'Type your message here...',
	maxLength: 1000,
};

const ExternalDropdownTemplate: StoryFn = (args) => ({
	components: {
		N8nChatInput,
		N8nDropdownMenu,
		N8nIcon,
		N8nIconButton,
		N8nTooltip,
	},
	setup() {
		type MentionKind = 'workflow' | 'group' | 'node';
		type MentionData = {
			kind: MentionKind;
			breadcrumbs: string[];
			nodeCount?: number;
			showPath?: boolean;
		};
		type MentionItem = DropdownMenuItemProps<string, MentionData>;

		type MentionRange = { origin: 'typed' | 'button'; start: number; end: number };

		const chatInputRef = ref<{
			getInputElement: () => HTMLTextAreaElement | undefined;
		} | null>(null);
		const dropdownRef = ref<DropdownMenuExposed | null>(null);
		const composerRef = ref<HTMLElement | null>(null);
		const value = ref('');
		const menuOpen = ref(false);
		const query = ref('');
		const mentionRange = ref<MentionRange | null>(null);
		const savedSelection = ref({ start: 0, end: 0 });
		const menuWidth = ref('24rem');
		const tags = ref<Array<{ id: string; label: string; kind: MentionKind }>>([]);
		const inputElement = computed(() => chatInputRef.value?.getInputElement() ?? undefined);

		const isTrigger = (character: string | undefined) => character === '@' || character === '＠';

		const saveSelection = () => {
			const input = inputElement.value;
			if (!input) return;
			savedSelection.value = { start: input.selectionStart, end: input.selectionEnd };
		};

		const closeMenu = () => {
			menuOpen.value = false;
			query.value = '';
			mentionRange.value = null;
		};
		const workflow = (
			id: string,
			label: string,
			nodeCount?: number,
			children?: MentionItem[],
		): MentionItem => ({
			id,
			label,
			selectable: children ? true : undefined,
			data: { kind: 'workflow', breadcrumbs: [label], nodeCount },
			children,
		});
		const browseItems: MentionItem[] = [
			workflow('orders', 'Orders', 4, [
				{
					id: 'orders-webhook',
					label: 'Webhook',
					data: { kind: 'node', breadcrumbs: ['Orders', 'Webhook'] },
				},
				{
					id: 'orders-if-checks',
					label: 'If checks',
					selectable: true,
					data: { kind: 'group', breadcrumbs: ['Orders', 'If checks'], nodeCount: 2 },
					children: [
						{
							id: 'orders-if',
							label: 'If',
							data: { kind: 'node', breadcrumbs: ['Orders', 'If checks', 'If'] },
						},
						{
							id: 'orders-set',
							label: 'Set fields',
							data: { kind: 'node', breadcrumbs: ['Orders', 'If checks', 'Set fields'] },
						},
					],
				},
			]),
			workflow('invoices', 'Invoices', 2, [
				{
					id: 'invoices-schedule',
					label: 'Schedule',
					data: { kind: 'node', breadcrumbs: ['Invoices', 'Schedule'] },
				},
				{
					id: 'invoices-send',
					label: 'Send invoice',
					data: { kind: 'node', breadcrumbs: ['Invoices', 'Send invoice'] },
				},
			]),
			workflow('onboarding', 'Customer onboarding', 3, [
				{
					id: 'onboarding-form',
					label: 'Signup form',
					data: { kind: 'node', breadcrumbs: ['Customer onboarding', 'Signup form'] },
				},
			]),
			{
				id: 'orders-if',
				label: 'If',
				data: { kind: 'node', breadcrumbs: ['Orders', 'If checks', 'If'], showPath: true },
			},
			{
				id: 'orders-if-checks-row',
				label: 'If checks',
				data: { kind: 'group', breadcrumbs: ['Orders', 'If checks'], nodeCount: 2, showPath: true },
			},
			workflow('lead-scoring', 'Lead scoring'),
			workflow('sync-crm', 'Sync CRM'),
			workflow('weekly-digest', 'Weekly digest'),
			workflow('refund-requests', 'Refund requests'),
			workflow('inventory-sync', 'Inventory sync'),
			workflow('support-triage', 'Support triage'),
			workflow('campaign-launch', 'Campaign launch'),
			workflow('invoice-reminders', 'Invoice reminders'),
			workflow('hiring-pipeline', 'Hiring pipeline'),
			workflow('error-alerts', 'Error alerts'),
			workflow('data-backup', 'Data backup'),
			workflow('slack-digest', 'Slack digest'),
		];

		const flatten = (menuItems: MentionItem[]): MentionItem[] =>
			menuItems.flatMap((item) => {
				const breadcrumbs = item.data?.breadcrumbs ?? [item.label];
				const current: MentionItem = {
					...item,
					children: undefined,
					data: {
						kind: item.data?.kind ?? 'workflow',
						breadcrumbs,
						nodeCount: item.data?.nodeCount,
						showPath: breadcrumbs.length > 1,
					},
				};
				return [current, ...flatten(item.children ?? [])];
			});

		const items = computed(() => {
			const term = query.value.trim().toLowerCase();
			if (!term) return browseItems;
			return flatten(browseItems).filter((item) =>
				(item.data?.breadcrumbs ?? [item.label]).join(' ').toLowerCase().includes(term),
			);
		});

		const findItem = (menuItems: MentionItem[], itemId: string): MentionItem | undefined => {
			for (const item of menuItems) {
				if (item.id === itemId) return item;
				const child = item.children && findItem(item.children, itemId);
				if (child) return child;
			}
			return undefined;
		};

		const handleKeydown = (event: KeyboardEvent) => {
			if (!menuOpen.value) return;
			dropdownRef.value?.handleExternalKeydown(event);
		};

		const handleTextChange = async (nextValue: string) => {
			value.value = nextValue;
			await nextTick();
			const caret = inputElement.value?.selectionEnd ?? nextValue.length;
			const beforeCaret = nextValue.slice(0, caret);
			let triggerIndex = -1;
			for (let index = beforeCaret.length - 1; index >= 0; index -= 1) {
				if (isTrigger(beforeCaret[index])) {
					triggerIndex = index;
					break;
				}
			}
			const validTrigger = triggerIndex === 0 || /\s/.test(beforeCaret[triggerIndex - 1] ?? '');
			const index = validTrigger ? triggerIndex : -1;
			const range = mentionRange.value;
			if (index >= 0 && (!range || range.origin !== 'typed' || range.start !== index)) {
				mentionRange.value = { origin: 'typed', start: index, end: caret };
				query.value = nextValue.slice(index + 1, caret);
				menuOpen.value = true;
				return;
			}
			if (!range) return;
			const triggerExists = range.origin === 'button' || isTrigger(nextValue[range.start]);
			const beforeRange = range.origin === 'typed' ? caret <= range.start : caret < range.start;
			if (!triggerExists || beforeRange) {
				closeMenu();
				return;
			}
			range.end = caret;
			query.value = nextValue.slice(
				range.origin === 'typed' ? range.start + 1 : range.start,
				caret,
			);
		};

		const handleCaretMove = async () => {
			await nextTick();
			saveSelection();
			const range = mentionRange.value;
			if (!range) return;
			const selection = savedSelection.value;
			const beforeRange =
				range.origin === 'typed' ? selection.start <= range.start : selection.start < range.start;
			if (beforeRange || selection.start > range.end || selection.end > range.end) closeMenu();
		};

		const handleOpenChange = (open: boolean) => {
			if (!open) {
				const range = mentionRange.value;
				if (
					range?.origin === 'typed' &&
					isTrigger(value.value[range.start]) &&
					value.value.slice(range.start + 1, range.end).trim() === ''
				) {
					value.value = value.value.slice(0, range.start) + value.value.slice(range.end);
				}
				closeMenu();
				return;
			}
			if (mentionRange.value) return;
			saveSelection();
			mentionRange.value = {
				origin: 'button',
				start: savedSelection.value.start,
				end: savedSelection.value.end,
			};
			query.value = '';
			menuOpen.value = true;
		};

		const handleSelect = async (itemId: string) => {
			action('select')(itemId);
			const item = findItem(browseItems, itemId);
			if (!item?.data) return;
			if (!tags.value.some((tag) => tag.id === item.id)) {
				tags.value = [
					...tags.value,
					{
						id: item.id,
						label: item.data.breadcrumbs[item.data.breadcrumbs.length - 1] ?? item.label,
						kind: item.data.kind,
					},
				];
			}
			const range = mentionRange.value;
			if (range?.origin === 'typed') {
				value.value = value.value.slice(0, range.start) + value.value.slice(range.end);
				await nextTick();
				const input = inputElement.value;
				input?.focus({ preventScroll: true });
				input?.setSelectionRange(range.start, range.start);
			}
			closeMenu();
		};

		const removeTag = (id: string) => {
			tags.value = tags.value.filter((tag) => tag.id !== id);
		};

		watch(menuOpen, (open) => {
			if (!open) return;
			void nextTick(() => dropdownRef.value?.highlightFirstItem());
		});

		let menuWidthObserver: ResizeObserver | undefined;
		onMounted(() => {
			menuWidthObserver = new ResizeObserver(() => {
				const width = composerRef.value?.getBoundingClientRect().width;
				if (width) menuWidth.value = `${width}px`;
			});
			if (composerRef.value) {
				menuWidthObserver.observe(composerRef.value);
				menuWidth.value = `${composerRef.value.getBoundingClientRect().width}px`;
			}
		});
		onBeforeUnmount(() => menuWidthObserver?.disconnect());

		return {
			args,
			chatInputRef,
			dropdownRef,
			composerRef,
			menuOpen,
			query,
			value,
			menuWidth,
			tags,
			inputElement,
			items,
			handleKeydown,
			handleOpenChange,
			handleTextChange,
			handleSelect,
			handleCaretMove,
			saveSelection,
			removeTag,
			onSubmit: methods.onSubmit,
		};
	},
	template: `
		<div
			style="
				display: flex;
				flex-direction: column;
				box-sizing: border-box;
				min-height: 100vh;
				width: 100%;
				padding: var(--spacing--4xl) var(--spacing--lg) var(--spacing--lg);
			"
			@keydown.capture="handleKeydown"
		>
			<div ref="composerRef">
				<N8nChatInput
					ref="chatInputRef"
					:model-value="value"
					:placeholder="args.placeholder"
					:max-length="args.maxLength"
					@update:model-value="handleTextChange"
					@submit="onSubmit"
					@click="handleCaretMove"
					@keyup="handleCaretMove"
					@pointerdown.capture="saveSelection"
					@select="handleCaretMove"
				>
					<template #leading>
						<div v-if="tags.length" class="mention-story-tags">
							<span v-for="tag in tags" :key="tag.id" class="mention-story-chip">
								<span class="mention-story-chip-icon">
									<N8nIcon
										:icon="tag.kind === 'group' ? 'group' : tag.kind === 'node' ? 'crosshair' : 'workflow'"
										size="small"
									/>
								</span>
								<span class="mention-story-chip-label">{{ tag.label }}</span>
								<button
									type="button"
									class="mention-story-chip-remove"
									:aria-label="'Remove ' + tag.label"
									@click="removeTag(tag.id)"
								>
									<N8nIcon icon="x" size="small" />
								</button>
							</span>
						</div>
					</template>
					<template #right-actions>
						<N8nDropdownMenu
							ref="dropdownRef"
							:model-value="menuOpen"
							:items="items"
							:external-focus-target="inputElement"
							:reference="composerRef"
							:width="menuWidth"
							extra-popper-class="mention-story-menu"
							placement="top-start"
							searchable
							search-mode="external"
							@update:model-value="handleOpenChange"
							@select="handleSelect"
						>
							<template #trigger>
								<N8nTooltip as-child content="Mention a workflow, node, or group" placement="top">
									<N8nIconButton
										icon="at-sign"
										aria-label="Mention a workflow, node, or group"
										variant="ghost"
										size="medium"
									/>
								</N8nTooltip>
							</template>
							<template #item-leading="{ item }">
								<N8nIcon
									v-if="item.data"
									:icon="item.data.kind === 'group' ? 'group' : item.data.kind === 'node' ? 'crosshair' : 'workflow'"
									size="large"
								/>
							</template>
							<template #item-label="{ item }">
								<span v-if="item.data?.showPath" class="mention-story-path">
									<template v-for="(part, index) in item.data.breadcrumbs" :key="part">
										<span
											v-if="index > 0"
											class="mention-story-separator"
											role="img"
											aria-label=" > "
										>
											<N8nIcon icon="chevron-right" size="xsmall" />
										</span>
										<span :class="index === item.data.breadcrumbs.length - 1 ? '' : 'mention-story-ancestor'">{{ part }}</span>
									</template>
								</span>
								<span v-else>{{ item.label }}</span>
							</template>
							<template #item-trailing="{ item }">
								<span v-if="item.data?.nodeCount">{{ item.data.nodeCount }}</span>
							</template>
						</N8nDropdownMenu>
					</template>
				</N8nChatInput>
			</div>
			<p style="margin-top: var(--spacing--2xs); color: var(--text-color--subtle);">
				Type @ at the start of the message or after a space, or use the @ button. A pick adds a tag and removes a typed query. The draft stays when you pick from the button.
			</p>
		</div>
	`,
});

export const WithExternalDropdown = ExternalDropdownTemplate.bind({});
WithExternalDropdown.args = {
	placeholder: 'Type your message here...',
	maxLength: 1000,
};
WithExternalDropdown.parameters = {
	layout: 'fullscreen',
	docs: {
		description: {
			story:
				'Matches the assistant mention menu: open workflows stay first, search shows a path, and a pick adds only a tag.',
		},
	},
};

export const Streaming = Template.bind({});
Streaming.args = {
	modelValue: 'This is currently being processed...',
	placeholder: 'Type your message here...',
	streaming: true,
	maxLength: 1000,
};

export const Disabled = Template.bind({});
Disabled.args = {
	placeholder: 'This input is disabled',
	disabled: true,
	maxLength: 1000,
};

export const WithInitialText = Template.bind({});
WithInitialText.args = {
	modelValue:
		'Hello, this is some initial text that spans multiple lines\nto show how the component handles existing content.',
	placeholder: 'Type your message here...',
	maxLength: 1000,
};

export const AtCharacterLimit = Template.bind({});
AtCharacterLimit.args = {
	modelValue: 'This message is exactly at the character limit!!',
	placeholder: 'Type your message here...',
	maxLength: 48,
};

export const WithRefocusAfterSend = Template.bind({});
WithRefocusAfterSend.args = {
	placeholder: 'Input will refocus after send...',
	maxLength: 1000,
	refocusAfterSend: true,
};

const InteractiveTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nChatInput,
	},
	template: `
		<div>
			<div style="width: 500px; max-width: 100%; margin-bottom: var(--spacing--md);">
				<n8n-chat-input
					v-bind="args"
					:modelValue="val"
					:streaming="streaming"
					@update:modelValue="handleUpdateModelValue"
					@submit="handleSubmit"
					@stop="handleStop"
					@focus="onFocus"
					@blur="onBlur"
				/>
			</div>
			<div
				style="
					padding: var(--spacing--xs);
					background: var(--background--subtle);
					color: var(--text-color);
					border: var(--border);
					border-radius: var(--radius);
				"
			>
				<p><strong>Current value:</strong> {{ val }}</p>
				<p><strong>Character count:</strong> {{ val.length }} / {{ args.maxLength }}</p>
				<p><strong>Streaming:</strong> {{ streaming }}</p>
				<button
					style="
						margin-top: var(--spacing--xs);
						padding: var(--spacing--3xs) var(--spacing--xs);
						color: var(--text-color);
						background: var(--background--surface);
						border: var(--border);
						border-radius: var(--radius);
						cursor: pointer;
					"
					@click="streaming = !streaming"
				>
					Toggle Streaming (Current: {{ streaming ? 'ON' : 'OFF' }})
				</button>
			</div>
		</div>
	`,
	data() {
		return {
			val: this.args.modelValue || '',
			streaming: false,
		};
	},
	watch: {
		args: {
			handler(newArgs) {
				if (newArgs.modelValue !== undefined) {
					this.val = newArgs.modelValue;
				}
			},
			deep: true,
			immediate: true,
		},
	},
	methods: {
		...methods,
		handleUpdateModelValue(value: string) {
			this.val = value;
			this.onUpdateModelValue(value);
		},
		handleSubmit() {
			this.onSubmit();
			// Simulate processing
			this.streaming = true;
			setTimeout(() => {
				this.streaming = false;
				// Clear after "processing"
				this.val = '';
			}, 2000);
		},
		handleStop() {
			this.onStop();
			this.streaming = false;
		},
	},
});

export const Interactive = InteractiveTemplate.bind({});
Interactive.args = {
	placeholder: 'Type a message and press Enter to send...',
	maxLength: 500,
	refocusAfterSend: true,
};

const MultipleInstancesTemplate: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nChatInput,
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: 20px;">
			<div>
				<h3>Single Line layout</h3>
				<div style="width: 500px; max-width: 100%;">
					<n8n-chat-input
						:modelValue="val1"
						@update:modelValue="val1 = $event"
						:placeholder="'Single line input...'"
						:max-length="1000"
					/>
				</div>
			</div>
			<div>
				<h3>Multiline with short text</h3>
				<div style="width: 500px; max-width: 100%;">
					<n8n-chat-input
						:modelValue="val2"
						@update:modelValue="val2 = $event"
						:placeholder="'Two line input...'"
						:max-length="1000"
					/>
				</div>
			</div>
			<div>
				<h3>Multiline with longer text</h3>
				<div style="width: 500px; max-width: 100%;">
					<n8n-chat-input
						:modelValue="val3"
						@update:modelValue="val3 = $event"
						:placeholder="'Three line input...'"
						:max-length="1000"
					/>
				</div>
			</div>
		</div>
	`,
	data() {
		return {
			val1: '',
			val2: '',
			val3: '',
		};
	},
});

export const DifferentSizes = MultipleInstancesTemplate.bind({});
DifferentSizes.args = {};

const SuggestionsTemplate: StoryFn = (args) => ({
	setup: () => ({ args }),
	components: {
		N8nChatInput,
	},
	template: `
		<div style="max-width: 710px; margin: 0 auto;">
			<div
				style="
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: var(--spacing--md);
					max-width: 710px;
					width: 100%;
				"
			>
				<div style="width: 100%;">
					<N8nChatInput
						placeholder="Describe the workflow you want to build..."
						:streaming="args.streaming"
						:disabled="args.disabled"
						:credits-quota="args.creditsQuota"
						:credits-remaining="args.creditsRemaining"
						:show-ask-owner-tooltip="args.showAskOwnerTooltip"
						@submit="onSubmit"
						@upgrade-click="onUpgradeClick"
					/>
				</div>
				<div
					v-if="args.suggestions.length > 0 && !args.streaming"
					style="
						display: flex;
						justify-content: center;
						align-items: flex-start;
						flex-wrap: wrap;
						gap: var(--spacing--2xs);
						width: 100%;
					"
				>
					<button
						v-for="suggestion in args.suggestions"
						:key="suggestion.id"
						type="button"
						:disabled="args.disabled"
						style="
							display: inline-flex;
							align-items: center;
							justify-content: center;
							padding: var(--spacing--4xs) var(--spacing--2xs);
							border-radius: 56px;
							border: var(--border);
							background: var(--color--background--light-3);
							font-size: var(--font-size--2xs);
							color: var(--color--text--shade-1);
						"
					>
						{{ suggestion.summary }}
					</button>
				</div>
			</div>
		</div>
	`,
	methods: {
		onSubmit: methods.onSubmit,
		onUpgradeClick: methods.onUpgradeClick,
	},
});

export const WithWorkflowSuggestions = SuggestionsTemplate.bind({});
WithWorkflowSuggestions.args = {
	suggestions: workflowSuggestions,
};

export const SuggestionsDisabled = SuggestionsTemplate.bind({});
SuggestionsDisabled.args = {
	suggestions: workflowSuggestions,
	disabled: true,
};
