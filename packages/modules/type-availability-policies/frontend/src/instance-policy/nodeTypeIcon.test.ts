import { describe, expect, it } from 'vitest';

import { FALLBACK_NODE_TYPE_ICON, nodeTypeIcon } from './nodeTypeIcon';
import type { NodeTypeSummary } from '../type-availability-policies.api';

const BASE_URL = 'http://localhost:5678/';

const summary = (fields: Partial<NodeTypeSummary> = {}): NodeTypeSummary => ({
	displayName: 'Slack',
	hidden: false,
	...fields,
});

describe('nodeTypeIcon', () => {
	it('uses the icon file of the theme', () => {
		const icon = nodeTypeIcon(
			summary({ iconUrl: { light: 'icons/light.svg', dark: 'icons/dark.svg' } }),
			'dark',
			BASE_URL,
		);

		expect(icon).toEqual({ type: 'file', src: `${BASE_URL}icons/dark.svg` });
	});

	it('keeps an absolute icon URL as it is', () => {
		const url = 'https://cdn.example.com/icon.svg';

		expect(nodeTypeIcon(summary({ iconUrl: url }), 'light', BASE_URL)).toEqual({
			type: 'file',
			src: url,
		});
	});

	it('uses a named icon with its color', () => {
		expect(
			nodeTypeIcon(summary({ icon: 'fa:slack', iconColor: 'purple' }), 'light', BASE_URL),
		).toEqual({
			type: 'icon',
			name: 'slack',
			color: 'var(--node--icon--color--purple)',
		});
	});

	it('uses a built-in node icon, but not an icon of another node type', () => {
		expect(nodeTypeIcon(summary({ icon: 'node:ai-agent' }), 'light', BASE_URL)).toEqual({
			type: 'icon',
			name: 'node:ai-agent',
			color: undefined,
		});
		expect(nodeTypeIcon(summary({ icon: 'node:n8n-nodes-base.slack' }), 'light', BASE_URL)).toBe(
			FALLBACK_NODE_TYPE_ICON,
		);
	});

	it('falls back to a generic icon', () => {
		expect(nodeTypeIcon(summary({ icon: 'file:slack.svg' }), 'light', BASE_URL)).toBe(
			FALLBACK_NODE_TYPE_ICON,
		);
	});
});
