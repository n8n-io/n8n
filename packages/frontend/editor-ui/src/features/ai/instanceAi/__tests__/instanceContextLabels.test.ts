import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { i18nInstance, i18nVersion } from '@n8n/i18n';
import { useInstanceContextLabel, type InstanceContextEntry } from '../instanceContextLabels';

const originalLocale = i18nInstance.global.locale.value;

beforeEach(() => {
	i18nInstance.global.setLocaleMessage('es-context-test', {
		'aiAssistant.instanceContext.trace.read': 'Contexto leído',
		'aiAssistant.instanceContext.trace.readUpdate': 'Actividad nueva leída',
		'aiAssistant.instanceContext.trace.none': 'Sin contexto',
		'aiAssistant.instanceContext.trace.failed': 'No se pudo leer el contexto',
		'aiAssistant.instanceContext.trace.listSeparator': '; ',
		'aiAssistant.instanceContext.trace.withLegs': '{legs} ({head})',
		'aiAssistant.instanceContext.trace.withReach': '{reach} / {summary}',
		'aiAssistant.instanceContext.trace.workflows': '{count} flujo | {count} flujos',
		'aiAssistant.instanceContext.trace.changes': '{count} cambio | {count} cambios',
		'aiAssistant.instanceContext.trace.runs': '{count} flujo ejecutado | {count} flujos ejecutados',
		'aiAssistant.instanceContext.trace.surface.activity-list': 'Listó más actividad',
		'aiAssistant.instanceContext.trace.surface.workflow-read': 'Inspeccionó un flujo',
	});
	i18nInstance.global.locale.value = 'es-context-test';
	i18nVersion.value++;
});

afterEach(() => {
	i18nInstance.global.locale.value = originalLocale;
	i18nVersion.value++;
});

describe('instance context labels', () => {
	it.each([
		{
			name: 'initial context',
			injection: {
				state: 'injected',
				isUpdate: false,
				legs: { inventory: 3, events: 2, runs: 1 },
				chars: 120,
			},
			summary: '3 flujos; 2 cambios; 1 flujo ejecutado (Contexto leído)',
		},
		{
			name: 'new activity',
			injection: {
				state: 'injected',
				isUpdate: true,
				legs: { inventory: 0, events: 1, runs: 0 },
				chars: 40,
			},
			summary: '1 cambio (Actividad nueva leída)',
		},
		{
			name: 'empty injected context',
			injection: {
				state: 'injected',
				isUpdate: false,
				legs: { inventory: 0, events: 0, runs: 0 },
				chars: 0,
			},
			summary: 'Contexto leído',
		},
		{
			name: 'empty read',
			injection: { state: 'absent', reason: 'empty' },
			summary: 'Sin contexto',
		},
		{
			name: 'failed read',
			injection: { state: 'absent', reason: 'failed' },
			summary: 'No se pudo leer el contexto',
		},
	] satisfies Array<{
		name: string;
		injection: InstanceContextEntry['injection'];
		summary: string;
	}>)('uses translated separators and clause order for $name', ({ injection, summary }) => {
		const { getInstanceContextLabel } = useInstanceContextLabel();
		const entry: InstanceContextEntry = {
			type: 'instance-context',
			runId: 'run-1',
			injection,
		};

		expect(
			getInstanceContextLabel({
				...entry,
				reach: { surfaces: ['activity-list', 'workflow-read'] },
			}),
		).toBe(`Listó más actividad; Inspeccionó un flujo / ${summary}`);
		expect(getInstanceContextLabel(entry)).toBe(summary);
		expect(getInstanceContextLabel({ ...entry, reach: { surfaces: [] } })).toBe(summary);
	});
});
