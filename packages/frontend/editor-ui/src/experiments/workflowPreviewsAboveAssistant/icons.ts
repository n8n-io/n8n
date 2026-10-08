// Experiment cleanup (124_workflow_previews_above_assistant)
import type {
	PreviewWorkflowNode,
	PreviewWorkflowNodeIcon,
} from '@/experiments/instanceAiWorkflowPreviewSuggestions/workflows/types';
import {
	ANTHROPIC_ICON_SVG,
	GMAIL_ICON_SVG,
	GOOGLE_CALENDAR_ICON_SVG,
	GOOGLE_SHEETS_ICON_SVG,
} from '@/experiments/instanceAiWorkflowPreviewSuggestions/workflows/process-invoices';
import {
	FIRECRAWL_ICON_PNG,
	GEMINI_ICON_SVG,
	LINKEDIN_ICON_SVG,
	REDDIT_ICON_SVG,
	X_ICON_SVG,
} from '@/experiments/instanceAiWorkflowPreviewSuggestions/workflows/schedule-social-posts';
import {
	HUBSPOT_ICON_SVG,
	LEMLIST_ICON_SVG,
	PIPEDRIVE_ICON_SVG,
	SALESFORCE_ICON_SVG,
	SLACK_ICON_SVG,
} from '@/experiments/instanceAiWorkflowPreviewSuggestions/workflows/score-my-leads';

type PreviewIcon = Pick<PreviewWorkflowNode, 'icon' | 'iconColor'>;

function fileIcon(src: string, lightInvert = false): PreviewIcon {
	return { icon: { type: 'file', src, lightInvert } };
}

// Icons referenced by key from `examples.json`, so the JSON stays free of
// inline SVG data and every icon is either a known brand asset or a Lucide name.
export const PREVIEW_ICONS: Record<string, PreviewIcon> = {
	anthropic: fileIcon(ANTHROPIC_ICON_SVG),
	firecrawl: fileIcon(FIRECRAWL_ICON_PNG),
	gemini: fileIcon(GEMINI_ICON_SVG),
	gmail: fileIcon(GMAIL_ICON_SVG),
	'google-calendar': fileIcon(GOOGLE_CALENDAR_ICON_SVG),
	'google-sheets': fileIcon(GOOGLE_SHEETS_ICON_SVG),
	hubspot: fileIcon(HUBSPOT_ICON_SVG),
	lemlist: fileIcon(LEMLIST_ICON_SVG),
	linkedin: fileIcon(LINKEDIN_ICON_SVG),
	pipedrive: fileIcon(PIPEDRIVE_ICON_SVG),
	reddit: fileIcon(REDDIT_ICON_SVG),
	salesforce: fileIcon(SALESFORCE_ICON_SVG),
	slack: fileIcon(SLACK_ICON_SVG),
	x: fileIcon(X_ICON_SVG, true),
	if: { icon: { type: 'icon', name: 'node:if' }, iconColor: 'green' },
	'code-node': { icon: { type: 'icon', name: 'node:code' }, iconColor: 'amber' },
	clock: { icon: { type: 'icon', name: 'clock' }, iconColor: 'amber' },
};

const FALLBACK_ICON: PreviewIcon = { icon: { type: 'icon', name: 'circle' } };

export function getPreviewIcon(key: string): PreviewIcon {
	return PREVIEW_ICONS[key] ?? FALLBACK_ICON;
}

export function getPreviewFileIcon(key: string): PreviewWorkflowNodeIcon | undefined {
	const icon = PREVIEW_ICONS[key]?.icon;
	return icon?.type === 'file' ? icon : undefined;
}
