import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { onMounted, reactive, ref } from 'vue';

import N8nBadge from '../N8nBadge';
import N8nIcon from '../N8nIcon';
import N8nEnterpriseReadinessBadge from '../EnterpriseReadinessBadge/EnterpriseReadinessBadge.vue';
import N8nPreviewBadge from '../PreviewBadge/PreviewBadge.vue';
import N8nSettingsPageHeader from '../N8nSettingsPageHeader';
import N8nSettingsRowGroup from '../N8nSettingsRowGroup';
import N8nSettingsLayout from '../N8nSettingsLayout';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';
import N8nSettingsEnableRow from './SettingsEnableRow.vue';

const DOCS_URL = 'https://docs.n8n.io/advanced-ai/chat-hub/';

// Trial looks only. The product badges stay on the current grey treatment.
function tint(color: string) {
	return {
		'--n8n-badge--background': `var(--color--${color}-200)`,
		'--n8n-badge--border-color': `var(--color--${color}-400)`,
		'--n8n-badge--text-color': `var(--color--${color}-900)`,
	};
}

// A 1.5px solid border paints as two lines. Keep the standard 1px outline.
const solidPreviewStyle = {
	'--n8n-badge--text-color': 'var(--text-color--subtle)',
};

// The border matches the fill, so the badge has no separate edge.
function quietFill(color: string) {
	return {
		'--n8n-badge--background': `var(--color--${color}-200)`,
		'--n8n-badge--border-color': `var(--color--${color}-200)`,
		'--n8n-badge--text-color': `var(--color--${color}-900)`,
	};
}

const quietFillGrey = {
	'--n8n-badge--background': 'var(--color--neutral-200)',
	'--n8n-badge--border-color': 'var(--color--neutral-200)',
	'--n8n-badge--text-color': 'var(--text-color--subtle)',
};

const withIcons = {
	previewIcon: 'flask-conical',
	enterpriseIcon: 'shield-half',
};

const appearanceOptions = [
	{
		label: 'Current',
		current: true,
	},
	{
		label: 'Pink with icons',
		...withIcons,
		previewStyle: tint('pink'),
		enterpriseStyle: tint('pink'),
	},
	{
		label: 'Purple with icons',
		...withIcons,
		previewStyle: tint('purple'),
		enterpriseStyle: tint('purple'),
	},
	{
		label: 'Blue with icons',
		...withIcons,
		previewStyle: tint('blue'),
		enterpriseStyle: tint('blue'),
	},
	{
		label: 'Orange with icons',
		...withIcons,
		previewStyle: tint('orange'),
		enterpriseStyle: tint('orange'),
	},
	{
		label: 'Grey, solid border',
		previewStyle: solidPreviewStyle,
	},
	{
		label: 'Grey with icons',
		...withIcons,
		previewStyle: solidPreviewStyle,
	},
	{
		label: 'Quiet fill',
		previewStyle: quietFillGrey,
		enterpriseStyle: quietFillGrey,
	},
	{
		label: 'Pink quiet fill',
		previewStyle: quietFill('pink'),
		enterpriseStyle: quietFill('pink'),
	},
	{
		label: 'Purple quiet fill',
		previewStyle: quietFill('purple'),
		enterpriseStyle: quietFill('purple'),
	},
	{
		label: 'Blue quiet fill',
		previewStyle: quietFill('blue'),
		enterpriseStyle: quietFill('blue'),
	},
	{
		label: 'Orange quiet fill',
		previewStyle: quietFill('orange'),
		enterpriseStyle: quietFill('orange'),
	},
];

const meta = {
	title: 'Areas/Settings/SettingsEnableRow',
	component: N8nSettingsEnableRow,
	parameters: {
		docs: {
			description: {
				component:
					'A settings row with a switch. Use it for the enable control at the top of a settings screen. Pass a badge through the titleTrailing slot when the setting still uses a standalone badge.',
			},
		},
	},
} satisfies Meta<typeof N8nSettingsEnableRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => ({
		components: { N8nSettingsEnableRow, N8nPreviewBadge },
		setup() {
			const agents = ref(true);
			const roles = ref(false);
			return { agents, roles };
		},
		template: `
			<div style="display: flex; flex-direction: column; max-width: 720px;">
				<N8nSettingsEnableRow
					v-model="agents"
					title="Enable Agents"
					description="Allow users to build and run agents on this instance."
				>
					<template #titleTrailing>
						<N8nPreviewBadge />
					</template>
				</N8nSettingsEnableRow>
				<N8nSettingsEnableRow
					v-model="roles"
					title="Enable roles"
					description="Let admins assign project roles to members."
				/>
			</div>
		`,
	}),
};

export const Disabled: Story = {
	args: {
		title: 'Enable Chat',
		description: 'Chat is turned off for this instance.',
		modelValue: false,
		disabled: true,
		disabledTooltip: 'Ask an instance owner to turn Chat on.',
	},
};

export const AppearanceOptions: Story = {
	name: 'Appearance options',
	parameters: {
		docs: {
			description: {
				story:
					'Trial looks for the Preview and Limited enterprise support pair, placed on the enable row. Current is the product pair, with a dashed Preview badge. The other rows are trials. Hover or focus a Limited enterprise support badge to open the docs tooltip.',
			},
		},
	},
	render: () => ({
		components: {
			N8nBadge,
			N8nEnterpriseReadinessBadge,
			N8nIcon,
			N8nPreviewBadge,
			N8nSettingsEnableRow,
			N8nSettingsLayout,
			N8nSettingsPageHeader,
			N8nSettingsRowGroup,
			N8nText,
			N8nTooltip,
		},
		setup() {
			const enabled = reactive(
				Object.fromEntries(appearanceOptions.map((option) => [option.label, true])),
			);
			onMounted(() => {
				const styleId = 'settings-enable-row-appearance-options';
				const style = document.getElementById(styleId) ?? document.createElement('style');
				style.id = styleId;
				// Trial-only. The product badges keep their own size, padding, and alignment.
				style.textContent = `
					/* Half a pixel up. A full pixel sat too high against Current, and no shift sat too low. */
					.appearance-options .trial-badge .n8n-text {
						transform: translateY(-0.5px);
					}
					/* The product badge shifts an icon label down 1px. A 10px icon does not need that. */
					.appearance-options .trial-badge:has(.n8n-icon) .n8n-text {
						transform: none;
					}
					/* Icon badges only. 8px of inline padding reads wide next to an icon. */
					.appearance-options .trial-badge:has(.n8n-icon) {
						--n8n-badge--padding-inline-start: var(--spacing--3xs);
						--n8n-badge--padding-inline-end: var(--spacing--3xs);
					}
					/* Extra-small icon size. Two steps under the 14px medium icon. */
					.appearance-options .trial-badge .n8n-icon {
						width: 10px;
						height: 10px;
					}
					/* Wider than the shared 180px cap. Padding matches the enterprise badge tooltip. */
					.n8n-tooltip.appearance-tooltip {
						/* No spacing token is 10px. */
						padding: 10px;
						max-width: 240px;
						align-items: flex-start;
						text-align: left;
					}
					.appearance-docs-link {
						color: inherit;
						display: inline-flex;
						align-items: center;
						gap: var(--spacing--5xs);
						text-decoration: none;
						white-space: nowrap;
					}
					.appearance-docs-link span {
						text-decoration: underline;
					}
				`;
				document.head.append(style);
			});
			return { appearanceOptions, docsUrl: DOCS_URL, enabled };
		},
		template: `
			<div class="appearance-options" style="display: flex; flex-direction: column; gap: var(--spacing--2xl);">
				<section v-for="option in appearanceOptions" :key="option.label">
					<N8nSettingsLayout>
						<N8nText size="small" color="text-light" style="width: 100%; margin-inline: 0;">
							{{ option.label }}
						</N8nText>
						<N8nSettingsPageHeader
							title="Chat"
							description="Message models and agents from one place."
							:docs-url="docsUrl"
						/>
						<N8nSettingsRowGroup>
							<N8nSettingsEnableRow
								v-model="enabled[option.label]"
								title="Enable Chat"
								description="When disabled, Chat is hidden across the app and its API endpoints are turned off."
							>
								<template #titleTrailing>
									<template v-if="option.current">
										<N8nTooltip placement="top-start" as-child content-class="appearance-tooltip">
											<N8nPreviewBadge tabindex="0" />
											<template #content>
												<p style="margin: 0; align-self: stretch; line-height: inherit;">
													This feature is in preview. It can change before release.
												</p>
											</template>
										</N8nTooltip>
										<N8nEnterpriseReadinessBadge :docs-url="docsUrl" />
									</template>
									<template v-else>
										<N8nTooltip placement="top-start" as-child content-class="appearance-tooltip">
											<N8nBadge
												class="trial-badge"
												size="xxsmall"
												tabindex="0"
												:leading-icon="option.previewIcon"
												:style="option.previewStyle"
											>
												Preview
											</N8nBadge>
											<template #content>
												<p style="margin: 0; align-self: stretch; line-height: inherit;">
													This feature is in preview. It can change before release.
												</p>
											</template>
										</N8nTooltip>
										<N8nTooltip placement="top-start" as-child content-class="appearance-tooltip">
											<N8nBadge
												class="trial-badge"
												size="xxsmall"
												variant="outline"
												tabindex="0"
												:leading-icon="option.enterpriseIcon"
												:style="option.enterpriseStyle"
											>
												Limited enterprise support
											</N8nBadge>
											<template #content>
												<p style="margin: 0; align-self: stretch; line-height: inherit;">
													Some enterprise capabilities don't cover this feature yet.
													<a
														class="appearance-docs-link"
														:href="docsUrl"
														target="_blank"
														rel="noopener noreferrer"
													><span>Learn more</span><N8nIcon icon="external-link" /></a>
												</p>
											</template>
										</N8nTooltip>
									</template>
								</template>
							</N8nSettingsEnableRow>
						</N8nSettingsRowGroup>
					</N8nSettingsLayout>
				</section>
			</div>
		`,
	}),
};
