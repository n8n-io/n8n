<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';

import Combobox from '../../v2/components/Combobox/Combobox.vue';
import type { ComboboxItem } from '../../v2/components/Combobox/Combobox.types';
import N8nButton from '../N8nButton/Button.vue';
import N8nCodeBlock from '../N8nCodeBlock/CodeBlock.vue';
import ContextMenu from '../N8nContextMenu/ContextMenu.vue';
import type { ContextMenuNode } from '../N8nContextMenu/ContextMenu.types';
import N8nDataTableServer, { type TableHeader } from '../N8nDataTableServer/N8nDataTableServer.vue';
import DropdownMenu from '../N8nDropdownMenu/DropdownMenu.vue';
import N8nScrollArea from '../N8nScrollArea/N8nScrollArea.vue';
import type {
	DropdownMenuExposed,
	DropdownMenuItemProps,
} from '../N8nDropdownMenu/DropdownMenu.types';

// Temporary recording page. Delete this folder after the video.

const labels = Array.from({ length: 18 }, (_, index) => {
	const sequence = String(index + 1).padStart(2, '0');
	return `Item ${sequence}`;
});

const dropdownItems: Array<DropdownMenuItemProps<string>> = labels.map((label) => ({
	id: label,
	label,
}));

const comboboxItems: ComboboxItem[] = labels.map((label) => ({
	label,
	value: label,
}));

const contextItems: Array<ContextMenuNode<string>> = labels.map((label) => ({
	type: 'item',
	id: label,
	label,
}));

type Account = {
	id: string;
	name: string;
	email: string;
	role: string;
	lastActive: string;
	projects: string;
};

const accounts: Account[] = Array.from({ length: 6 }, (_, index) => {
	const label = String(index + 1).padStart(2, '0');
	return {
		id: label,
		name: `Person ${label}`,
		email: `person.${label}@example.com`,
		role: ['Admin', 'Member', 'Viewer'][index % 3] ?? 'Member',
		lastActive: `${index + 1} days ago`,
		projects: 'Marketing, Sales, Engineering',
	};
});

const accountHeaders: Array<TableHeader<Account>> = [
	{ title: 'Name', key: 'name', width: 220 },
	{ title: 'Email', key: 'email', width: 260 },
	{ title: 'Role', key: 'role', width: 160 },
	{ title: 'Last active', key: 'lastActive', width: 160 },
	{ title: 'Projects', key: 'projects', width: 320, disableSort: true },
];

const codeSample = Array.from(
	{ length: 24 },
	(_, index) => `const line${String(index + 1).padStart(2, '0')} = ${index + 1};`,
).join('\n');

const contextBeforeTrigger = ref<HTMLElement | null>(null);
const contextAfterTrigger = ref<HTMLElement | null>(null);
const dropdownBefore = ref<DropdownMenuExposed | null>(null);
const dropdownAfter = ref<DropdownMenuExposed | null>(null);

function openContextMenu(trigger: HTMLElement | null) {
	if (!trigger) return;

	const bounds = trigger.getBoundingClientRect();
	trigger.dispatchEvent(
		new MouseEvent('contextmenu', {
			bubbles: true,
			cancelable: true,
			clientX: bounds.left + bounds.width / 2,
			clientY: bounds.top + bounds.height / 2,
		}),
	);
}

onMounted(() => {
	void nextTick(() => {
		requestAnimationFrame(() => {
			openContextMenu(contextBeforeTrigger.value);
			openContextMenu(contextAfterTrigger.value);
			window.setTimeout(() => {
				dropdownBefore.value?.open();
				dropdownAfter.value?.open();
			}, 50);
		});
	});
});
</script>

<template>
	<div :class="$style.page">
		<header :class="$style.intro">
			<h1 :class="$style.title">Scroll fade comparison</h1>
			<p :class="$style.note">
				Temporary page for a recording. Scroll each pane to the end. The fade hides when nothing is
				left past that edge. The icon picker grid uses the same bottom fade. Delete this story
				afterwards.
			</p>
		</header>

		<section :class="$style.section">
			<h2 :class="$style.heading">Dropdown</h2>
			<p :class="$style.note">
				The fade used to stay on the last row. It now hides at the end of the list.
			</p>
			<div :class="$style.pair">
				<div :class="$style.stage">
					<p :class="$style.label">Before</p>
					<DropdownMenu
						ref="dropdownBefore"
						:modal="false"
						:teleported="false"
						max-height="var(--spacing--5xl)"
						placement="bottom-start"
						:items="dropdownItems"
						extra-popper-class="scroll-fade-recording-dropdown scroll-fade-recording-dropdown-before"
					>
						<template #trigger>
							<N8nButton>Menu</N8nButton>
						</template>
					</DropdownMenu>
				</div>
				<div :class="$style.stage">
					<p :class="$style.label">After</p>
					<DropdownMenu
						ref="dropdownAfter"
						:modal="false"
						:teleported="false"
						max-height="var(--spacing--5xl)"
						placement="bottom-start"
						:items="dropdownItems"
						extra-popper-class="scroll-fade-recording-dropdown"
					>
						<template #trigger>
							<N8nButton>Menu</N8nButton>
						</template>
					</DropdownMenu>
				</div>
			</div>
		</section>

		<section :class="$style.section">
			<h2 :class="$style.heading">Combobox</h2>
			<p :class="$style.note">
				The list had no fade. It now hides the fade at the end of the list.
			</p>
			<div :class="$style.pair">
				<div :class="$style.stage">
					<p :class="$style.label">Before</p>
					<div :class="$style.field">
						<Combobox
							default-open
							:teleported="false"
							:items="comboboxItems"
							content-class="scroll-fade-recording-combobox scroll-fade-recording-no-fade"
							placeholder="Choose an item"
						/>
					</div>
				</div>
				<div :class="$style.stage">
					<p :class="$style.label">After</p>
					<div :class="$style.field">
						<Combobox
							default-open
							:teleported="false"
							:items="comboboxItems"
							content-class="scroll-fade-recording-combobox"
							placeholder="Choose an item"
						/>
					</div>
				</div>
			</div>
		</section>

		<section :class="$style.section">
			<h2 :class="$style.heading">Context menu</h2>
			<p :class="$style.note">
				The list had no fade. It now hides the fade at the end of the list.
			</p>
			<div :class="$style.pair">
				<div :class="$style.stage">
					<p :class="$style.label">Before</p>
					<ContextMenu
						:modal="false"
						:items="contextItems"
						content-class="scroll-fade-recording-context scroll-fade-recording-no-fade"
					>
						<template #trigger>
							<div ref="contextBeforeTrigger" :class="$style.target">Right-click target</div>
						</template>
					</ContextMenu>
				</div>
				<div :class="$style.stage">
					<p :class="$style.label">After</p>
					<ContextMenu
						:modal="false"
						:items="contextItems"
						content-class="scroll-fade-recording-context"
					>
						<template #trigger>
							<div ref="contextAfterTrigger" :class="$style.target">Right-click target</div>
						</template>
					</ContextMenu>
				</div>
			</div>
		</section>

		<section :class="$style.section">
			<h2 :class="$style.heading">Scroll area</h2>
			<p :class="$style.note">
				Both ends used to fade even at rest. Each edge now fades only while content is hidden past
				it.
			</p>
			<div :class="$style.pair">
				<div :class="$style.stage">
					<p :class="$style.label">Before</p>
					<N8nScrollArea
						class="scroll-fade-recording-scroll scroll-fade-recording-scroll-before"
						edge-fade="y"
						max-height="var(--spacing--5xl)"
						type="hover"
					>
						<ul :class="$style.list">
							<li v-for="label in labels" :key="`scroll-before-${label}`">{{ label }}</li>
						</ul>
					</N8nScrollArea>
				</div>
				<div :class="$style.stage">
					<p :class="$style.label">After</p>
					<N8nScrollArea
						class="scroll-fade-recording-scroll"
						edge-fade="y"
						max-height="var(--spacing--5xl)"
						type="hover"
					>
						<ul :class="$style.list">
							<li v-for="label in labels" :key="`scroll-after-${label}`">{{ label }}</li>
						</ul>
					</N8nScrollArea>
				</div>
			</div>
		</section>

		<section :class="$style.section">
			<h2 :class="$style.heading">Code block</h2>
			<p :class="$style.note">
				The last line used to stay faded. The fade now hides at the end of the code.
			</p>
			<div :class="$style.pair">
				<div :class="$style.stage">
					<p :class="$style.label">Before</p>
					<N8nCodeBlock
						class="scroll-fade-recording-code scroll-fade-recording-code-before"
						:code="codeSample"
						language="typescript"
						:copyable="false"
						:max-height="160"
						aria-label="Code sample before"
					/>
				</div>
				<div :class="$style.stage">
					<p :class="$style.label">After</p>
					<N8nCodeBlock
						class="scroll-fade-recording-code"
						:code="codeSample"
						language="typescript"
						:copyable="false"
						:max-height="160"
						aria-label="Code sample after"
					/>
				</div>
			</div>
		</section>

		<section :class="$style.section">
			<h2 :class="$style.heading">Data table</h2>
			<p :class="$style.note">
				This behaviour is unchanged. Scroll sideways. The right fade hides at the last column. The
				pinned name column keeps a line on its inner edge after you scroll.
			</p>
			<div :class="$style.tableFrame">
				<N8nDataTableServer
					:headers="accountHeaders"
					:items="accounts"
					:items-length="accounts.length"
					:pin-columns="1"
				/>
			</div>
		</section>
	</div>
</template>

<style module lang="scss">
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xl);
	padding: var(--spacing--lg);
	background-color: var(--color--background--light-3);
}

.intro,
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.title,
.heading,
.label,
.note {
	margin: 0;
}

.title {
	font-size: var(--font-size--lg);
	color: var(--text-color);
}

.heading {
	font-size: var(--font-size--md);
	color: var(--text-color);
}

.label {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--text-color);
}

.note {
	font-size: var(--font-size--sm);
	color: var(--text-color--subtler);
}

.pair {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: var(--spacing--xl);
}

.stage {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--xs);
	min-height: calc(var(--spacing--5xl) + var(--spacing--5xl));
}

.field {
	width: var(--spacing--5xl);
}

.target {
	width: var(--spacing--5xl);
	padding: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	color: var(--text-color);
	font-size: var(--font-size--sm);
}

.list {
	margin: 0;
	padding: var(--spacing--xs);
	list-style: none;
}

.list li {
	padding-block: var(--spacing--2xs);
	color: var(--text-color);
	font-size: var(--font-size--sm);
}

.tableFrame {
	width: calc(var(--spacing--5xl) * 2);
	max-width: 100%;
}
</style>

<style lang="scss">
div:has(> .scroll-fade-recording-dropdown) {
	position: static !important;
	transform: none !important;
	inset: auto !important;
}

.scroll-fade-recording-dropdown {
	position: relative !important;
	transform: none !important;
	inset: auto !important;
	width: var(--spacing--5xl);
	margin-top: var(--spacing--xs);
}

.scroll-fade-recording-dropdown-before > div {
	mask-image: linear-gradient(
		to bottom,
		black 0,
		black calc(100% - var(--spacing--sm)),
		transparent 100%
	) !important;
}

.scroll-fade-recording-combobox {
	--combobox-content--max-height: var(--spacing--5xl) !important;
}

.scroll-fade-recording-context {
	--context-menu--width: var(--spacing--5xl);
	max-height: var(--spacing--5xl) !important;
	overflow: hidden;
}

.scroll-fade-recording-no-fade [data-scroll-mask-bottom] {
	mask-image: none !important;
}

.scroll-fade-recording-scroll {
	width: var(--spacing--5xl);
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
}

.scroll-fade-recording-scroll-before [data-reka-scroll-area-viewport] {
	mask-image: linear-gradient(
		to bottom,
		transparent 0,
		black var(--spacing--sm),
		black calc(100% - var(--spacing--sm)),
		transparent 100%
	) !important;
}

.scroll-fade-recording-code {
	width: 100%;
}

.scroll-fade-recording-code-before pre {
	mask-image: linear-gradient(
		to bottom,
		black 0,
		black calc(100% - var(--spacing--sm)),
		transparent 100%
	) !important;
}
</style>
