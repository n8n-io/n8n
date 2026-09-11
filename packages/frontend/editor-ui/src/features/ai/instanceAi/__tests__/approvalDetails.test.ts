import { afterEach, describe, expect, it } from 'vitest';
import { i18nInstance, i18nVersion } from '@n8n/i18n';
import type { InstanceAiApprovalDetails } from '@n8n/api-types';
import { formatApprovalDetails } from '../approvalDetails';

const originalLocale = i18nInstance.global.locale.value;
afterEach(() => {
	i18nInstance.global.locale.value = originalLocale;
	i18nVersion.value++;
});

const rows: InstanceAiApprovalDetails = {
	action: 'insert-rows',
	count: 5,
	rows: [
		{ values: [{ column: 'email', value: '"alice.test@example.com"' }], remainingColumns: 1 },
		{ values: [{ column: 'status', value: null }], remainingColumns: 2 },
		{ values: [], remainingColumns: 0 },
	],
};

describe('approval details', () => {
	it('renders row values, empty values, omitted counts, and paragraph breaks', () => {
		expect(formatApprovalDetails(rows)).toBe(
			'Add 5 rows\n\nRow 1: set "email" to "alice.test@example.com", 1 more column\n\nRow 2: set "status" to no value, 2 more columns\n\nRow 3: no column values supplied\n\n2 more rows',
		);
	});

	it('renders the same saved details in the selected locale', () => {
		formatApprovalDetails(rows);
		i18nInstance.global.setLocaleMessage('es-approval-test', {
			'instanceAi.approval.addRows': 'Añadir {count} fila | Añadir {count} filas',
			'instanceAi.approval.row': 'Fila {index}: establecer {changes}',
			'instanceAi.approval.emptyRow': 'Fila {index}: sin valores',
			'instanceAi.approval.value': '"{column}" en {value}',
			'instanceAi.approval.emptyValue': '"{column}" sin valor',
			'instanceAi.approval.moreColumns': '{count} columna más | {count} columnas más',
			'instanceAi.approval.moreRows': '{count} fila más | {count} filas más',
			'instanceAi.approval.listSeparator': ', ',
		});
		i18nInstance.global.locale.value = 'es-approval-test';
		i18nVersion.value++;
		expect(formatApprovalDetails(rows)).toBe(
			'Añadir 5 filas\n\nFila 1: establecer "email" en "alice.test@example.com", 1 columna más\n\nFila 2: establecer "status" sin valor, 2 columnas más\n\nFila 3: sin valores\n\n2 filas más',
		);
	});

	it.each([
		['like', 'foo', 'contains "foo" (matching case)'],
		['ilike', 'foo', 'contains "foo" (ignoring case)'],
		['like', 'foo%', 'matches the text pattern "foo%"'],
		['ilike', '%foo', 'matches the text pattern (ignoring case) "%foo"'],
		['eq', null, 'has no value'],
		['neq', null, 'has a value'],
		['gt', 5, 'is greater than 5'],
	] satisfies Array<['like' | 'ilike' | 'eq' | 'neq' | 'gt', string | number | null, string]>)(
		'describes %s filters with value %s',
		(condition, value, expected) => {
			expect(
				formatApprovalDetails({
					action: 'delete-rows',
					filter: { type: 'and', filters: [{ columnName: 'status', condition, value }] },
				}),
			).toBe(`Delete rows where "status" ${expected}`);
		},
	);

	it('translates filter conjunctions and column types', () => {
		i18nInstance.global.setLocaleMessage('es-approval-test', {
			'instanceAi.approval.deleteRows': 'Eliminar filas donde {filter}',
			'instanceAi.approval.filter.eq': '"{column}" es {value}',
			'instanceAi.approval.filter.or': ' o ',
			'instanceAi.approval.addColumn': 'Añadir columna "{column}" ({type})',
			'instanceAi.approval.columnType.string': 'texto',
		});
		i18nInstance.global.locale.value = 'es-approval-test';
		i18nVersion.value++;
		expect(
			formatApprovalDetails({
				action: 'delete-rows',
				filter: {
					type: 'or',
					filters: [
						{ columnName: 'a', condition: 'eq', value: 1 },
						{ columnName: 'b', condition: 'eq', value: 2 },
					],
				},
			}),
		).toBe('Eliminar filas donde "a" es 1 o "b" es 2');
		expect(
			formatApprovalDetails({ action: 'add-column', column: 'email', columnType: 'string' }),
		).toBe('Añadir columna "email" (texto)');
	});

	it('keeps generated summaries and translates the mandatory publish notices', () => {
		i18nInstance.global.setLocaleMessage('es-approval-test', {
			'instanceAi.approval.supportingWorkflows':
				'Publicar también {count} flujo auxiliar. | Publicar también {count} flujos auxiliares.',
			'instanceAi.approval.verification.failed': 'La verificación no pasó.',
			'instanceAi.approval.verification.simulated': 'Se simuló la salida de: {nodes}.',
			'instanceAi.approval.listSeparator': ', ',
		});
		i18nInstance.global.locale.value = 'es-approval-test';
		i18nVersion.value++;
		expect(
			formatApprovalDetails({
				action: 'publish-workflow',
				summary: 'Enviar alertas.',
				selectedVersion: false,
				supportingCount: 2,
				verification: {
					level: 'failed',
					unprovenTargets: [],
					pendingTriggers: [],
					nodesNotReached: [],
					plannedNodeCount: 1,
					simulatedNodes: ['Slack'],
					pinnedNodes: [],
				},
			}),
		).toBe(
			'Enviar alertas.\n\nPublicar también 2 flujos auxiliares.\n\nLa verificación no pasó.\n\nSe simuló la salida de: Slack.',
		);
	});

	it('formats version dates in the current locale and translates missing dates', () => {
		i18nInstance.global.setLocaleMessage('es', {
			'instanceAi.approval.restoreVersion': 'Restaurar versión "{version}" ({timestamp})',
			'instanceAi.approval.unknownDate': 'fecha desconocida',
		});
		i18nInstance.global.locale.value = 'es';
		i18nVersion.value++;
		expect(formatApprovalDetails({ action: 'restore-version', version: 'Draft' })).toBe(
			'Restaurar versión "Draft" (fecha desconocida)',
		);
		const createdAt = '2026-09-11T10:30:00.000Z';
		const timestamp = new Intl.DateTimeFormat('es', {
			dateStyle: 'medium',
			timeStyle: 'medium',
		}).format(new Date(createdAt));
		expect(formatApprovalDetails({ action: 'restore-version', version: 'Draft', createdAt })).toBe(
			`Restaurar versión "Draft" (${timestamp})`,
		);
	});

	it('uses translated fallbacks for saved tool calls without a summary', () => {
		expect(formatApprovalDetails({ action: 'run-workflow', trigger: 'Webhook' })).toBe(
			'Run this workflow live from "Webhook"',
		);
		expect(
			formatApprovalDetails({
				action: 'publish-workflow',
				selectedVersion: true,
				supportingCount: 1,
			}),
		).toBe('Make the selected version live\n\nAlso publish 1 supporting workflow.');
		expect(formatApprovalDetails({ action: 'edit-workflow', summary: '  ' })).toBe(
			'Save the changes to this workflow',
		);
	});
});
