import type { RunTargetOption } from '../run-target-recommendation';
import {
	isAlwaysOnTrigger,
	LOCAL_ONLY_NODE_TYPES,
	recommendRunTarget,
} from '../run-target-recommendation';

const MANUAL = 'n8n-nodes-base.manualTrigger';
const SCHEDULE = 'n8n-nodes-base.scheduleTrigger';
const WEBHOOK = 'n8n-nodes-base.webhook';
const READ_WRITE_FILE = 'n8n-nodes-base.readWriteFile';
const EXECUTE_COMMAND = 'n8n-nodes-base.executeCommand';
const LOCAL_FILE_TRIGGER = 'n8n-nodes-base.localFileTrigger';
const SLACK = 'n8n-nodes-base.slack';

const laptop: RunTargetOption = {
	id: 'laptop',
	kind: 'local',
	label: 'This computer',
	status: 'online',
};
const cloud = (id: string, status: RunTargetOption['status']): RunTargetOption => ({
	id,
	kind: 'linked',
	label: `Cloud ${id}`,
	status,
});

describe('LOCAL_ONLY_NODE_TYPES', () => {
	it('maps each file, command and local-trigger node to its reason', () => {
		expect(LOCAL_ONLY_NODE_TYPES).toStrictEqual({
			'n8n-nodes-base.readWriteFile': 'needs-local-files',
			'n8n-nodes-base.readBinaryFile': 'needs-local-files',
			'n8n-nodes-base.readBinaryFiles': 'needs-local-files',
			'n8n-nodes-base.writeBinaryFile': 'needs-local-files',
			'n8n-nodes-base.executeCommand': 'needs-local-commands',
			'n8n-nodes-base.localFileTrigger': 'needs-local-trigger',
		});
	});

	it('cannot be changed at runtime', () => {
		expect(Object.isFrozen(LOCAL_ONLY_NODE_TYPES)).toBe(true);
	});
});

describe('isAlwaysOnTrigger', () => {
	it.each([
		SCHEDULE,
		'n8n-nodes-base.cron',
		'n8n-nodes-base.interval',
		WEBHOOK,
		'n8n-nodes-base.formTrigger',
		'@n8n/n8n-nodes-langchain.chatTrigger',
		'n8n-nodes-base.slackTrigger',
		'n8n-nodes-base.gmailTrigger',
		'community-nodes.someAppTrigger',
	])('is true for %s', (nodeType) => {
		expect(isAlwaysOnTrigger(nodeType)).toBe(true);
	});

	it.each([
		MANUAL,
		'n8n-nodes-base.executeWorkflowTrigger',
		'n8n-nodes-base.errorTrigger',
		LOCAL_FILE_TRIGGER,
		SLACK,
		READ_WRITE_FILE,
		'n8n-nodes-base.scheduletrigger',
		'n8n-nodes-base.webhookResponse',
		'',
	])('is false for %j', (nodeType) => {
		expect(isAlwaysOnTrigger(nodeType)).toBe(false);
	});
});

describe('recommendRunTarget', () => {
	describe('rule 1: local-only nodes', () => {
		it('keeps a workflow that reads files on this computer', () => {
			expect(
				recommendRunTarget({
					nodeTypes: [MANUAL, READ_WRITE_FILE],
					targets: [laptop, cloud('cloud', 'online')],
				}),
			).toStrictEqual({ targetId: 'laptop', kind: 'local', reasons: ['needs-local-files'] });
		});

		it('gives unique reasons in the order their nodes first occur', () => {
			const result = recommendRunTarget({
				nodeTypes: [
					LOCAL_FILE_TRIGGER,
					EXECUTE_COMMAND,
					'n8n-nodes-base.readBinaryFile',
					'n8n-nodes-base.writeBinaryFile',
					EXECUTE_COMMAND,
				],
				targets: [laptop],
			});

			// Not alphabetical, so a sort would fail this test.
			expect(result.reasons).toEqual([
				'needs-local-trigger',
				'needs-local-commands',
				'needs-local-files',
			]);
		});

		it('keeps a schedule on this computer when it also needs local files', () => {
			expect(
				recommendRunTarget({
					nodeTypes: [SCHEDULE, READ_WRITE_FILE, SLACK],
					targets: [cloud('cloud', 'online'), laptop],
				}),
			).toStrictEqual({ targetId: 'laptop', kind: 'local', reasons: ['needs-local-files'] });
		});

		it('treats the local file trigger as a local need, not an always-on trigger', () => {
			expect(
				recommendRunTarget({
					nodeTypes: [LOCAL_FILE_TRIGGER, SLACK],
					targets: [laptop, cloud('cloud', 'online')],
				}),
			).toStrictEqual({ targetId: 'laptop', kind: 'local', reasons: ['needs-local-trigger'] });
		});

		it('does not match inherited object keys as local-only node types', () => {
			expect(
				recommendRunTarget({
					nodeTypes: ['constructor', '__proto__', 'toString', 'hasOwnProperty'],
					targets: [laptop],
				}),
			).toStrictEqual({ targetId: 'laptop', kind: 'local', reasons: ['manual-only'] });
		});
	});

	describe('rule 2: always-on triggers', () => {
		it('moves a schedule to the first online cloud target', () => {
			expect(
				recommendRunTarget({
					nodeTypes: [SCHEDULE, SLACK],
					targets: [laptop, cloud('cloud', 'online')],
				}),
			).toStrictEqual({ targetId: 'cloud', kind: 'linked', reasons: ['always-on-trigger'] });
		});

		it('skips an offline cloud target and picks the next online one', () => {
			expect(
				recommendRunTarget({
					nodeTypes: [WEBHOOK],
					targets: [laptop, cloud('eu', 'offline'), cloud('us', 'online')],
				}),
			).toStrictEqual({ targetId: 'us', kind: 'linked', reasons: ['always-on-trigger'] });
		});

		it('picks the first of two online cloud targets', () => {
			const result = recommendRunTarget({
				nodeTypes: [WEBHOOK],
				targets: [cloud('eu', 'online'), laptop, cloud('us', 'online')],
			});

			expect(result.targetId).toBe('eu');
		});

		it.each(['offline', 'unauthorised', 'unknown'] as const)(
			'stays on this computer when the only cloud target is %s',
			(status) => {
				expect(
					recommendRunTarget({
						nodeTypes: [SCHEDULE],
						targets: [laptop, cloud('cloud', status)],
					}),
				).toStrictEqual({
					targetId: 'laptop',
					kind: 'local',
					reasons: ['always-on-trigger', 'cloud-offline'],
				});
			},
		);

		it('stays on this computer when no cloud target is linked', () => {
			expect(
				recommendRunTarget({ nodeTypes: ['n8n-nodes-base.formTrigger'], targets: [laptop] }),
			).toStrictEqual({
				targetId: 'laptop',
				kind: 'local',
				reasons: ['always-on-trigger', 'no-cloud-linked'],
			});
		});
	});

	describe('rule 3: nothing needs a specific place', () => {
		it('stays on this computer for a manual workflow, even when the cloud is online', () => {
			expect(
				recommendRunTarget({
					nodeTypes: [MANUAL, SLACK],
					targets: [cloud('cloud', 'online'), laptop],
				}),
			).toStrictEqual({ targetId: 'laptop', kind: 'local', reasons: ['manual-only'] });
		});

		it('stays on this computer when the workflow has no nodes', () => {
			expect(recommendRunTarget({ nodeTypes: [], targets: [laptop] })).toStrictEqual({
				targetId: 'laptop',
				kind: 'local',
				reasons: ['manual-only'],
			});
		});
	});

	describe('target fallbacks', () => {
		it('returns the fixed local answer when there are no targets', () => {
			const expected = { targetId: 'local', kind: 'local', reasons: ['no-cloud-linked'] };

			expect(recommendRunTarget({ nodeTypes: [], targets: [] })).toStrictEqual(expected);
			expect(recommendRunTarget({ nodeTypes: [SCHEDULE], targets: [] })).toStrictEqual(expected);
			expect(recommendRunTarget({ nodeTypes: [READ_WRITE_FILE], targets: [] })).toStrictEqual(
				expected,
			);
		});

		it('uses the first target in place of a missing local target', () => {
			expect(
				recommendRunTarget({
					nodeTypes: [EXECUTE_COMMAND],
					targets: [cloud('eu', 'online'), cloud('us', 'online')],
				}),
			).toStrictEqual({ targetId: 'eu', kind: 'local', reasons: ['needs-local-commands'] });
		});

		it('uses the first target when all cloud targets are offline and none is local', () => {
			expect(
				recommendRunTarget({
					nodeTypes: [SCHEDULE],
					targets: [cloud('eu', 'offline'), cloud('us', 'unknown')],
				}),
			).toStrictEqual({
				targetId: 'eu',
				kind: 'local',
				reasons: ['always-on-trigger', 'cloud-offline'],
			});
		});

		it('does not change its input', () => {
			const nodeTypes = Object.freeze([SCHEDULE, READ_WRITE_FILE]);
			const targets = Object.freeze([Object.freeze(laptop), Object.freeze(cloud('c', 'online'))]);

			expect(() => recommendRunTarget({ nodeTypes, targets })).not.toThrow();
			expect(nodeTypes).toEqual([SCHEDULE, READ_WRITE_FILE]);
		});
	});
});
