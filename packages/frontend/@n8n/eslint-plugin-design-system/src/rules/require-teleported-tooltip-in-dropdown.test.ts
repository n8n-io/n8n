import { describe, expect, it } from 'vitest';

import { findUnteleportedTooltipsInSource } from './require-teleported-tooltip-in-dropdown.js';

const sfc = (template: string) =>
	`<script setup lang="ts">\nconst shouldTeleport = false;\n</script>\n\n<template>${template}</template>\n`;

const positions = (template: string) =>
	findUnteleportedTooltipsInSource(sfc(template)).map(({ start }) => [start.line, start.column]);

describe('require-teleported-tooltip-in-dropdown', () => {
	it.each([
		'<N8nDropdownMenu><N8nTooltip /></N8nDropdownMenu>',
		'<N8nDropdownMenu><N8nTooltip teleported /></N8nDropdownMenu>',
		'<N8nDropdownMenu><N8nTooltip teleported="" /></N8nDropdownMenu>',
		'<N8nDropdownMenu><N8nTooltip teleported="true" /></N8nDropdownMenu>',
		'<N8nDropdownMenu><N8nTooltip :teleported="true" /></N8nDropdownMenu>',
		'<N8nTooltip :teleported="false" />',
		'<n8n-dropdown-menu><template #item-label><n8n-tooltip /></template></n8n-dropdown-menu>',
	])('accepts %s', (template) => {
		expect(positions(template)).toEqual([]);
	});

	it.each([
		'<N8nDropdownMenu><N8nTooltip :teleported="false" /></N8nDropdownMenu>',
		'<N8nDropdownMenu><template #item-label><N8nTooltip :teleported="shouldTeleport" /></template></N8nDropdownMenu>',
		'<n8n-dropdown-menu><n8n-tooltip :teleported="false" /></n8n-dropdown-menu>',
		'<N8nDropdownMenu><div v-if="true"><N8nTooltip v-bind:teleported="false" /></div></N8nDropdownMenu>',
	])('rejects %s', (template) => {
		expect(positions(template)).toHaveLength(1);
	});

	it('reports the position of the attribute in the SFC', () => {
		expect(
			positions(
				'\n\t<N8nDropdownMenu>\n\t\t<N8nTooltip :teleported="false" />\n\t</N8nDropdownMenu>\n',
			),
		).toEqual([[7, 15]]);
	});

	it('does not throw on a template that does not parse', () => {
		expect(() =>
			positions('<N8nDropdownMenu><N8nTooltip :teleported="false"></N8nDropdownMenu>'),
		).not.toThrow();
	});
});
