import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { applyPinData } from '../apply-pin-data.service';

const wf = (pinData?: WorkflowJSON['pinData']): WorkflowJSON =>
	({
		name: 't',
		nodes: [],
		connections: {},
		pinData,
		settings: {},
	}) as unknown as WorkflowJSON;

describe('applyPinData', () => {
	it('returns the workflow unchanged when generated map is empty', () => {
		const original = wf({ Existing: [{ json: { x: 1 } }] });
		const result = applyPinData(original, {});
		expect(result).toBe(original);
	});

	it('adds new pinData entries to a workflow that has none', () => {
		const result = applyPinData(wf(), {
			'Telegram Trigger': [{ json: { chat_id: '1' } }],
		});
		expect(result.pinData).toEqual({
			'Telegram Trigger': [{ json: { chat_id: '1' } }],
		});
	});

	it('preserves existing pinData on the same node (skip-if-set)', () => {
		const original = wf({
			'Telegram Trigger': [{ json: { chat_id: 'user-set' } }],
		});
		const result = applyPinData(original, {
			'Telegram Trigger': [{ json: { chat_id: 'generated' } }],
		});
		expect(result.pinData).toEqual({
			'Telegram Trigger': [{ json: { chat_id: 'user-set' } }],
		});
	});

	it('merges new entries with existing pinData on different nodes', () => {
		const original = wf({ Webhook: [{ json: { id: 'w' } }] });
		const result = applyPinData(original, {
			'Telegram Trigger': [{ json: { chat_id: '1' } }],
		});
		expect(result.pinData).toEqual({
			Webhook: [{ json: { id: 'w' } }],
			'Telegram Trigger': [{ json: { chat_id: '1' } }],
		});
	});

	it('does not mutate the input workflow object', () => {
		const original = wf();
		const beforeKeys = Object.keys(original.pinData ?? {});
		applyPinData(original, { 'Telegram Trigger': [{ json: { chat_id: '1' } }] });
		expect(Object.keys(original.pinData ?? {})).toEqual(beforeKeys);
	});

	it('returns the same reference when every generated entry was skipped', () => {
		const original = wf({ Existing: [{ json: { x: 1 } }] });
		const result = applyPinData(original, { Existing: [{ json: { x: 999 } }] });
		expect(result).toBe(original);
	});
});
