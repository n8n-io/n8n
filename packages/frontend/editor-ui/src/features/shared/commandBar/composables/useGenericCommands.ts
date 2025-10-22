import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import { useUIStore } from '@/stores/ui.store';
import { WHATS_NEW_MODAL_KEY, VIEWS, ABOUT_MODAL_KEY } from '@/constants';
import { EXTERNAL_LINKS } from '@/constants/externalLinks';
import { useBugReporting } from '@/composables/useBugReporting';
import type { CommandGroup, CommandBarItem } from '../types';

const ITEM_ID = {
	WHATS_NEW: 'whats-new',
	SETTINGS: 'settings',
	SIGN_OUT: 'sign-out',
	TEMPLATES: 'templates',
	VARIABLES: 'variables',
	INSIGHTS: 'insights',
	QUICKSTART: 'quickstart',
	DOCUMENTATION: 'documentation',
	FORUM: 'forum',
	COURSE: 'course',
	REPORT_BUG: 'report-bug',
	ABOUT: 'about',
} as const;

export function useGenericCommands(): CommandGroup {
	const i18n = useI18n();
	const uiStore = useUIStore();
	const router = useRouter();
	const { getReportingURL } = useBugReporting();

	const genericCommands = computed<CommandBarItem[]>(() => [
		{
			id: ITEM_ID.WHATS_NEW,
			title: i18n.baseText('mainSidebar.whatsNew'),
			section: i18n.baseText('commandBar.sections.general'),
			handler: () => {
				uiStore.openModal(WHATS_NEW_MODAL_KEY);
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'bell',
				},
			},
			keywords: [
				i18n.baseText('mainSidebar.whatsNew').toLowerCase(),
				i18n.baseText('mainSidebar.whatsNew.fullChangelog').toLowerCase(),
			],
		},
		{
			id: ITEM_ID.TEMPLATES,
			title: i18n.baseText('mainSidebar.templates'),
			section: i18n.baseText('commandBar.sections.general'),
			handler: () => {
				void router.push({ name: VIEWS.PRE_BUILT_AGENT_TEMPLATES });
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'package-open',
				},
			},
			keywords: [i18n.baseText('mainSidebar.templates').toLowerCase()],
		},
		{
			id: ITEM_ID.VARIABLES,
			title: i18n.baseText('mainSidebar.variables'),
			section: i18n.baseText('commandBar.sections.general'),
			handler: () => {
				void router.push({ name: VIEWS.VARIABLES });
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'variable',
				},
			},
			keywords: [i18n.baseText('mainSidebar.variables').toLowerCase()],
		},
		{
			id: ITEM_ID.INSIGHTS,
			title: 'Insights',
			section: i18n.baseText('commandBar.sections.general'),
			handler: () => {
				void router.push({ name: VIEWS.INSIGHTS });
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'chart-column-decreasing',
				},
			},
			keywords: ['insights'],
		},
		{
			id: ITEM_ID.QUICKSTART,
			title: i18n.baseText('mainSidebar.helpMenuItems.quickstart'),
			section: i18n.baseText('mainSidebar.help'),
			handler: () => {
				window.open(EXTERNAL_LINKS.QUICKSTART_VIDEO, '_blank', 'noreferrer');
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'video',
				},
			},
			keywords: [i18n.baseText('mainSidebar.helpMenuItems.quickstart').toLowerCase()],
		},
		{
			id: ITEM_ID.DOCUMENTATION,
			title: i18n.baseText('mainSidebar.helpMenuItems.documentation'),
			section: i18n.baseText('mainSidebar.help'),
			handler: () => {
				window.open(EXTERNAL_LINKS.DOCUMENTATION, '_blank', 'noreferrer');
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'book',
				},
			},
			keywords: [i18n.baseText('mainSidebar.helpMenuItems.documentation').toLowerCase()],
		},
		{
			id: ITEM_ID.FORUM,
			title: i18n.baseText('mainSidebar.helpMenuItems.forum'),
			section: i18n.baseText('mainSidebar.help'),
			handler: () => {
				window.open(EXTERNAL_LINKS.FORUM, '_blank', 'noreferrer');
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'users',
				},
			},
			keywords: [i18n.baseText('mainSidebar.helpMenuItems.forum').toLowerCase()],
		},
		{
			id: ITEM_ID.COURSE,
			title: i18n.baseText('mainSidebar.helpMenuItems.course'),
			section: i18n.baseText('mainSidebar.help'),
			handler: () => {
				window.open(EXTERNAL_LINKS.COURSES, '_blank', 'noreferrer');
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'graduation-cap',
				},
			},
			keywords: [i18n.baseText('mainSidebar.helpMenuItems.course').toLowerCase()],
		},
		{
			id: ITEM_ID.REPORT_BUG,
			title: i18n.baseText('mainSidebar.helpMenuItems.reportBug'),
			section: i18n.baseText('mainSidebar.help'),
			handler: () => {
				window.open(getReportingURL(), '_blank', 'noreferrer');
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'bug',
				},
			},
			keywords: [i18n.baseText('mainSidebar.helpMenuItems.reportBug').toLowerCase()],
		},
		{
			id: ITEM_ID.ABOUT,
			title: i18n.baseText('mainSidebar.aboutN8n'),
			section: i18n.baseText('mainSidebar.help'),
			handler: () => {
				uiStore.openModal(ABOUT_MODAL_KEY);
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'info',
				},
			},
			keywords: [i18n.baseText('mainSidebar.aboutN8n').toLowerCase()],
		},
		{
			id: ITEM_ID.SETTINGS,
			title: i18n.baseText('settings'),
			section: i18n.baseText('commandBar.sections.general'),
			handler: () => {
				void router.push({ name: VIEWS.SETTINGS });
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'cog',
				},
			},
			keywords: [i18n.baseText('settings').toLowerCase()],
		},
		{
			id: ITEM_ID.SIGN_OUT,
			title: i18n.baseText('auth.signout'),
			section: i18n.baseText('commandBar.sections.general'),
			handler: () => {
				void router.push({ name: VIEWS.SIGNOUT });
			},
			icon: {
				component: N8nIcon,
				props: {
					icon: 'sign-out-alt',
				},
			},
			keywords: [i18n.baseText('auth.signout').toLowerCase()],
		},
	]);

	return {
		commands: genericCommands,
	};
}
