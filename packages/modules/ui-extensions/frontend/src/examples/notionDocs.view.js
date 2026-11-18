/* global Vue, n8n */
// The built-in "Notion docs" page. It shows how a page can bring a service into
// n8n: it lists documents from a Notion workspace and renders the one that the
// user picks, block by block. The documents are sample data in this file, so
// the page needs no account and makes no network call.
const { computed, ref } = Vue;

const NOTION_URL = 'https://www.notion.so/acme-corp/';
const SYNC_DELAY_MS = 600;

/** Sample documents in the shape of Notion blocks. Rich text is a list of spans. */
const DOCUMENTS = [
	{
		id: 'on-call-runbook',
		icon: '🚨',
		title: 'On-call runbook',
		owner: 'Platform team',
		editedAt: '2026-11-16T09:30:00.000Z',
		tags: ['Operations', 'Incidents'],
		blocks: [
			{
				type: 'callout',
				icon: '💡',
				text: [
					{
						text: 'Start here when an n8n workflow alert pages you. Most alerts clear in the first ',
					},
					{ text: 'three steps', bold: true },
					{ text: '.' },
				],
			},
			{ type: 'heading', text: [{ text: 'Triage' }] },
			{
				type: 'numbered',
				items: [
					[{ text: 'Open the failed run from the alert and note the node that failed.' }],
					[
						{ text: 'Check the credential of that node. Expired tokens cause most ' },
						{ text: '401', code: true },
						{ text: ' errors.' },
					],
					[{ text: 'Retry the run from the executions list once the cause is fixed.' }],
				],
			},
			{ type: 'heading', text: [{ text: 'Checklist' }] },
			{
				type: 'todo',
				items: [
					{ id: 'ack', text: 'Acknowledge the alert in #ops-alerts', checked: true },
					{ id: 'owner', text: 'Tell the workflow owner', checked: false },
					{ id: 'postmortem', text: 'Add a line to the incident log', checked: false },
				],
			},
			{ type: 'heading', text: [{ text: 'Useful queries' }] },
			{
				type: 'code',
				language: 'SQL',
				code: 'SELECT id, status, "startedAt"\nFROM execution_entity\nWHERE status = \'error\'\nORDER BY "startedAt" DESC\nLIMIT 20;',
			},
			{ type: 'divider' },
			{
				type: 'quote',
				text: [
					{ text: 'Fix the cause, then the run. A retry without a fix only pages you again.' },
				],
			},
		],
	},
	{
		id: 'lead-routing-spec',
		icon: '🧭',
		title: 'Lead routing spec',
		owner: 'Revenue operations',
		editedAt: '2026-11-14T15:05:00.000Z',
		tags: ['Sales', 'Spec'],
		blocks: [
			{
				type: 'paragraph',
				text: [
					{ text: 'The ' },
					{ text: 'Lead routing', bold: true },
					{ text: ' workflow sends each new form lead to the right sales rep in under a minute.' },
				],
			},
			{ type: 'heading', text: [{ text: 'Rules' }] },
			{
				type: 'bulleted',
				items: [
					[{ text: 'Companies with more than 500 people go to the enterprise team.' }],
					[{ text: 'Leads from Europe go to the Berlin team, in their working hours.' }],
					[{ text: 'Everything else goes round-robin to the inbound team.' }],
				],
			},
			{ type: 'heading', text: [{ text: 'Services' }] },
			{
				type: 'bulleted',
				items: [
					[{ text: 'HubSpot', bold: true }, { text: ': creates the contact and the deal.' }],
					[
						{ text: 'Slack', bold: true },
						{ text: ': posts the lead to the rep in a direct message.' },
					],
					[{ text: 'Google Sheets', bold: true }, { text: ': keeps a log for the weekly report.' }],
				],
			},
			{
				type: 'callout',
				icon: '⚠️',
				text: [
					{ text: 'Change a rule here first, then in the workflow, so the two stay the same.' },
				],
			},
		],
	},
	{
		id: 'credential-rotation',
		icon: '🔑',
		title: 'Credential rotation',
		owner: 'Security',
		editedAt: '2026-11-02T11:20:00.000Z',
		tags: ['Security', 'Quarterly'],
		blocks: [
			{
				type: 'paragraph',
				text: [
					{
						text: 'Rotate the API keys that workflows use every quarter, and when a person leaves.',
					},
				],
			},
			{
				type: 'todo',
				items: [
					{ id: 'slack', text: 'Slack bot token', checked: true },
					{ id: 'hubspot', text: 'HubSpot private app token', checked: true },
					{ id: 'openai', text: 'OpenAI API key', checked: false },
					{ id: 'stripe', text: 'Stripe restricted key', checked: false },
				],
			},
			{
				type: 'paragraph',
				text: [
					{ text: 'Update the key in ' },
					{ text: 'Credentials', bold: true },
					{ text: ' in n8n. Workflows pick up the new key on their next run.' },
				],
			},
		],
	},
];

const UNITS = [
	['day', 86400],
	['hour', 3600],
	['minute', 60],
];

const page =
	'display: grid; grid-template-columns: minmax(12rem, 16rem) minmax(0, 1fr); gap: var(--spacing--lg); max-width: 75rem; margin: 0 auto; padding: var(--spacing--xl) var(--spacing--lg)';
const stack = 'display: flex; flex-direction: column; gap: var(--spacing--xs)';
const row = 'display: flex; align-items: center; gap: var(--spacing--2xs)';
const between =
	'display: flex; align-items: center; justify-content: space-between; gap: var(--spacing--2xs); flex-wrap: wrap';
const docButton =
	'display: flex; align-items: center; gap: var(--spacing--2xs); width: 100%; padding: var(--spacing--2xs) var(--spacing--xs); border: none; border-radius: var(--radius); background: none; color: inherit; font: inherit; text-align: left; cursor: pointer';
const docButtonActive = 'background-color: var(--background--subtle); font-weight: 600';
const article =
	'display: flex; flex-direction: column; gap: var(--spacing--sm); max-width: 48rem; line-height: 1.6';
const callout =
	'display: flex; gap: var(--spacing--2xs); padding: var(--spacing--sm); border-radius: var(--radius); background-color: var(--background--subtle)';
const codeBlock =
	'margin: 0; padding: var(--spacing--sm); border-radius: var(--radius); background-color: var(--background--subtle); font-family: var(--font-family--monospace); font-size: var(--font-size--xs); white-space: pre-wrap; overflow-x: auto';
const inlineCode =
	'padding: 0 var(--spacing--5xs); border-radius: var(--radius); background-color: var(--background--subtle); font-family: var(--font-family--monospace); font-size: 0.9em';
const quote =
	'margin: 0; padding-left: var(--spacing--sm); border-left: var(--border-width) solid currentColor';
const properties =
	'display: grid; grid-template-columns: max-content 1fr; gap: var(--spacing--4xs) var(--spacing--lg); align-items: center';

export default {
	setup() {
		const locale = n8n.useLocale();
		const t = n8n.t;

		const selectedId = ref(DOCUMENTS[0].id);
		const selected = computed(
			() => DOCUMENTS.find((doc) => doc.id === selectedId.value) ?? DOCUMENTS[0],
		);

		// The to-do state is the user's own, for this session.
		const checked = ref(
			Object.fromEntries(
				DOCUMENTS.flatMap((doc) =>
					doc.blocks
						.filter((block) => block.type === 'todo')
						.flatMap((block) => block.items.map((item) => [`${doc.id}:${item.id}`, item.checked])),
				),
			),
		);

		const tasks = computed(() => {
			const ids = selected.value.blocks
				.filter((block) => block.type === 'todo')
				.flatMap((block) => block.items.map((item) => `${selected.value.id}:${item.id}`));
			return { total: ids.length, done: ids.filter((id) => checked.value[id]).length };
		});

		function toggle(item) {
			const key = `${selected.value.id}:${item.id}`;
			checked.value = { ...checked.value, [key]: !checked.value[key] };
		}

		const syncedAt = ref(new Date().toISOString());
		const isSyncing = ref(false);
		function sync() {
			if (isSyncing.value) return;
			isSyncing.value = true;
			window.setTimeout(() => {
				syncedAt.value = new Date().toISOString();
				isSyncing.value = false;
			}, SYNC_DELAY_MS);
		}

		function ago(iso) {
			const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
			const format = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' });
			for (const [unit, size] of UNITS) {
				if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
			}
			return format.format(seconds, 'second');
		}

		const editedOn = (iso) =>
			new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(
				new Date(iso),
			);

		const spanStyle = (span) => [
			span.bold ? 'font-weight: 600' : '',
			span.italic ? 'font-style: italic' : '',
			span.code ? inlineCode : '',
		];

		return {
			documents: DOCUMENTS,
			selectedId,
			selected,
			checked,
			tasks,
			toggle,
			syncedAt,
			isSyncing,
			sync,
			ago,
			editedOn,
			spanStyle,
			select: (id) => {
				selectedId.value = id;
			},
			openInNotion: () => n8n.openUrl(NOTION_URL + selected.value.id),
			page,
			stack,
			row,
			between,
			docButton,
			docButtonActive,
			article,
			callout,
			codeBlock,
			quote,
			properties,
			t,
		};
	},
	template: `
		<section data-test-id="notion-docs" :style="page">
			<nav :style="stack" :aria-label="t('uiExtensions.notionDocs.documents')">
				<div :style="row">
					<N8nIcon icon="book-open" size="medium" />
					<N8nText bold>{{ t('uiExtensions.notionDocs.workspace') }}</N8nText>
				</div>
				<N8nText size="xsmall" color="text-light">{{ t('uiExtensions.notionDocs.documents') }}</N8nText>
				<div style="display: flex; flex-direction: column; gap: var(--spacing--5xs)">
					<button
						v-for="doc in documents"
						:key="doc.id"
						type="button"
						:style="[docButton, doc.id === selectedId ? docButtonActive : '']"
						:aria-current="doc.id === selectedId ? 'page' : undefined"
						data-test-id="notion-docs-document"
						@click="select(doc.id)"
					>
						<span aria-hidden="true">{{ doc.icon }}</span>
						<N8nText size="small">{{ doc.title }}</N8nText>
					</button>
				</div>
				<N8nBadge variant="warning" style="align-self: flex-start" data-test-id="notion-docs-sample">{{ t('uiExtensions.notionDocs.sample') }}</N8nBadge>
			</nav>

			<div :style="stack" style="gap: var(--spacing--lg); min-width: 0">
				<div :style="between">
					<N8nText size="small" color="text-light" data-test-id="notion-docs-synced">{{ isSyncing ? t('uiExtensions.notionDocs.syncing') : t('uiExtensions.notionDocs.synced', { time: ago(syncedAt) }) }}</N8nText>
					<span :style="row">
						<N8nButton variant="ghost" size="small" icon="refresh-cw" :disabled="isSyncing" data-test-id="notion-docs-sync" @click="sync">{{ t('uiExtensions.notionDocs.sync') }}</N8nButton>
						<N8nButton variant="outline" size="small" icon="external-link" data-test-id="notion-docs-open" @click="openInNotion">{{ t('uiExtensions.notionDocs.open') }}</N8nButton>
					</span>
				</div>

				<article :style="article" data-test-id="notion-docs-article">
					<div style="font-size: var(--font-size--2xl)" aria-hidden="true">{{ selected.icon }}</div>
					<N8nHeading tag="h1" size="2xlarge" bold data-test-id="notion-docs-title">{{ selected.title }}</N8nHeading>

					<div :style="properties" data-test-id="notion-docs-properties">
						<N8nText size="small" color="text-light">{{ t('uiExtensions.notionDocs.owner') }}</N8nText>
						<N8nText size="small">{{ selected.owner }}</N8nText>
						<N8nText size="small" color="text-light">{{ t('uiExtensions.notionDocs.edited') }}</N8nText>
						<N8nText size="small">{{ editedOn(selected.editedAt) }}</N8nText>
						<N8nText size="small" color="text-light">{{ t('uiExtensions.notionDocs.tags') }}</N8nText>
						<span :style="row" style="flex-wrap: wrap; gap: var(--spacing--4xs)">
							<N8nTag v-for="tag in selected.tags" :key="tag" :text="tag" :clickable="false" />
						</span>
						<template v-if="tasks.total > 0">
							<N8nText size="small" color="text-light">{{ t('uiExtensions.notionDocs.tasks') }}</N8nText>
							<N8nText size="small" data-test-id="notion-docs-tasks">{{ t('uiExtensions.notionDocs.tasksDone', { done: tasks.done, total: tasks.total }) }}</N8nText>
						</template>
					</div>

					<template v-for="(block, index) in selected.blocks" :key="selected.id + index">
						<N8nHeading v-if="block.type === 'heading'" tag="h2" size="large" bold style="margin-top: var(--spacing--xs)">
							<span v-for="(span, i) in block.text" :key="i" :style="spanStyle(span)">{{ span.text }}</span>
						</N8nHeading>
						<N8nText v-else-if="block.type === 'paragraph'" tag="p" style="margin: 0">
							<span v-for="(span, i) in block.text" :key="i" :style="spanStyle(span)">{{ span.text }}</span>
						</N8nText>
						<div v-else-if="block.type === 'callout'" :style="callout" data-test-id="notion-docs-callout">
							<span aria-hidden="true">{{ block.icon }}</span>
							<N8nText>
								<span v-for="(span, i) in block.text" :key="i" :style="spanStyle(span)">{{ span.text }}</span>
							</N8nText>
						</div>
						<ul v-else-if="block.type === 'bulleted'" style="margin: 0; padding-left: var(--spacing--lg)">
							<li v-for="(item, i) in block.items" :key="i">
								<N8nText><span v-for="(span, j) in item" :key="j" :style="spanStyle(span)">{{ span.text }}</span></N8nText>
							</li>
						</ul>
						<ol v-else-if="block.type === 'numbered'" style="margin: 0; padding-left: var(--spacing--lg)">
							<li v-for="(item, i) in block.items" :key="i">
								<N8nText><span v-for="(span, j) in item" :key="j" :style="spanStyle(span)">{{ span.text }}</span></N8nText>
							</li>
						</ol>
						<div v-else-if="block.type === 'todo'" style="display: flex; flex-direction: column; gap: var(--spacing--4xs)">
							<label v-for="item in block.items" :key="item.id" :style="row" style="cursor: pointer">
								<input type="checkbox" :checked="checked[selected.id + ':' + item.id]" data-test-id="notion-docs-todo" @change="toggle(item)" />
								<N8nText :style="checked[selected.id + ':' + item.id] ? 'text-decoration: line-through; opacity: 0.6' : ''">{{ item.text }}</N8nText>
							</label>
						</div>
						<div v-else-if="block.type === 'code'" style="display: flex; flex-direction: column; gap: var(--spacing--4xs)">
							<N8nText size="xsmall" color="text-light">{{ block.language }}</N8nText>
							<pre :style="codeBlock" data-test-id="notion-docs-code">{{ block.code }}</pre>
						</div>
						<hr v-else-if="block.type === 'divider'" style="width: 100%; margin: 0; border: none; border-top: var(--border)" />
						<blockquote v-else-if="block.type === 'quote'" :style="quote">
							<N8nText><span v-for="(span, i) in block.text" :key="i" :style="spanStyle(span)">{{ span.text }}</span></N8nText>
						</blockquote>
					</template>
				</article>
			</div>
		</section>
	`,
};
