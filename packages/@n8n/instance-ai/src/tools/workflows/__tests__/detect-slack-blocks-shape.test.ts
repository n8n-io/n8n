import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { IDataObject } from 'n8n-workflow';

import { detectSlackBlocksShape } from '../detect-slack-blocks-shape';

function workflow(
	parameters: Record<string, unknown>,
	type = 'n8n-nodes-base.slack',
	typeVersion = 2.3,
): WorkflowJSON {
	return {
		id: 'wf-test',
		name: 'Test',
		nodes: [
			{
				id: '1',
				name: 'Post Lunch Train',
				type,
				typeVersion,
				position: [0, 0],
				parameters: parameters as IDataObject,
			},
		],
		connections: {},
	};
}

function blockMessage(blocksUi: unknown, overrides: Record<string, unknown> = {}) {
	return {
		resource: 'message',
		operation: 'post',
		select: 'channel',
		messageType: 'block',
		blocksUi,
		...overrides,
	};
}

const BLOCKS = [
	{ type: 'section', text: { type: 'mrkdwn', text: 'Lunch train departs at 12:30' } },
	{ type: 'divider' },
];

describe('detectSlackBlocksShape', () => {
	const codes = (w: WorkflowJSON) => detectSlackBlocksShape(w).map((x) => x.code);

	it('flags a blocksUi JSON string that parses to a bare array', () => {
		const warnings = detectSlackBlocksShape(workflow(blockMessage(JSON.stringify(BLOCKS))));

		expect(warnings).toHaveLength(1);
		expect(warnings[0].code).toBe('SLACK_BLOCKS_SHAPE_INVALID');
		expect(warnings[0].nodeName).toBe('Post Lunch Train');
		expect(warnings[0].message).toContain('{ "blocks": [ ... ] }');
	});

	it('flags a blocksUi stored as a bare array value', () => {
		expect(codes(workflow(blockMessage(BLOCKS)))).toEqual(['SLACK_BLOCKS_SHAPE_INVALID']);
	});

	it('flags a blocksUi object that has no blocks key', () => {
		expect(codes(workflow(blockMessage({ text: 'Lunch train' })))).toEqual([
			'SLACK_BLOCKS_SHAPE_INVALID',
		]);
	});

	it('flags a blocksUi object whose blocks value is not an array', () => {
		expect(codes(workflow(blockMessage({ blocks: { type: 'section' } })))).toEqual([
			'SLACK_BLOCKS_SHAPE_INVALID',
		]);
	});

	it('flags a blocksUi string that is not valid JSON', () => {
		const warnings = detectSlackBlocksShape(workflow(blockMessage('[{ "type": "section" ')));

		expect(warnings).toHaveLength(1);
		expect(warnings[0].code).toBe('SLACK_BLOCKS_SHAPE_INVALID');
	});

	it('accepts a blocksUi JSON string wrapped in a blocks object', () => {
		expect(codes(workflow(blockMessage(JSON.stringify({ blocks: BLOCKS }))))).toEqual([]);
	});

	it('accepts a blocksUi stored as a blocks object value', () => {
		expect(codes(workflow(blockMessage({ blocks: BLOCKS })))).toEqual([]);
	});

	it('accepts an empty blocks array', () => {
		expect(codes(workflow(blockMessage({ blocks: [] })))).toEqual([]);
	});

	// The real builder writes blocksUi as an `=` expression whose body is the JSON
	// with `{{ }}` interpolations (observed while calibrating the eval case), so the
	// bare-array mistake shows up in expression form too.
	it('flags an expression whose body is a bare array', () => {
		const expr = '=' + JSON.stringify(BLOCKS);

		expect(codes(workflow(blockMessage(expr)))).toEqual(['SLACK_BLOCKS_SHAPE_INVALID']);
	});

	it('accepts an expression whose body wraps the blocks, interpolations and all', () => {
		const expr =
			'={ "blocks": [ { "type": "section", "text": { "type": "mrkdwn", "text": "Departs {{ $json.departure }}" } } ] }';

		expect(codes(workflow(blockMessage(expr)))).toEqual([]);
	});

	it('ignores an expression that is wholly dynamic, since its value is unknowable', () => {
		expect(codes(workflow(blockMessage('={{ $json.slackPayload }}')))).toEqual([]);
		expect(codes(workflow(blockMessage('={{ JSON.stringify($json.p) }}')))).toEqual([]);
	});

	it('ignores a blocks value that is an expression', () => {
		expect(codes(workflow(blockMessage({ blocks: '={{ $json.blocks }}' })))).toEqual([]);
	});

	it('ignores a node with no blocksUi set', () => {
		expect(codes(workflow(blockMessage('')))).toEqual([]);
		expect(
			codes(workflow({ resource: 'message', operation: 'post', messageType: 'block' })),
		).toEqual([]);
	});

	it('ignores non-Slack nodes', () => {
		expect(
			codes(workflow(blockMessage(JSON.stringify(BLOCKS)), 'n8n-nodes-base.slackTrigger')),
		).toEqual([]);
	});

	it('ignores Slack V1 nodes, whose blocksUi is a fixedCollection', () => {
		const v1Params = {
			resource: 'message',
			operation: 'post',
			jsonParameters: false,
			blocksUi: { blocksValues: [{ type: 'section' }] },
		};

		expect(codes(workflow(v1Params, 'n8n-nodes-base.slack', 1))).toEqual([]);
	});

	it('flags blocks built for a message that is not sent as blocks', () => {
		const warnings = detectSlackBlocksShape(
			workflow(blockMessage(JSON.stringify({ blocks: BLOCKS }), { messageType: 'text' })),
		);

		expect(warnings).toHaveLength(1);
		expect(warnings[0].code).toBe('SLACK_BLOCKS_NOT_SENT');
	});

	it('checks the update operation as well as post and schedule', () => {
		for (const operation of ['post', 'schedule', 'update']) {
			expect(codes(workflow(blockMessage(JSON.stringify(BLOCKS), { operation })))).toEqual([
				'SLACK_BLOCKS_SHAPE_INVALID',
			]);
		}
	});
});
