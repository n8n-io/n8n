'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const active_workflow_manager_1 = require('@/active-workflow-manager');
describe('ActiveWorkflowManager', () => {
	let activeWorkflowManager;
	const instanceSettings = (0, jest_mock_extended_1.mock)({ isMultiMain: false });
	const nodeTypes = (0, jest_mock_extended_1.mock)();
	const workflowRepository = (0, jest_mock_extended_1.mock)();
	beforeEach(() => {
		jest.clearAllMocks();
		activeWorkflowManager = new active_workflow_manager_1.ActiveWorkflowManager(
			(0, backend_test_utils_1.mockLogger)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			nodeTypes,
			(0, jest_mock_extended_1.mock)(),
			workflowRepository,
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			instanceSettings,
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
		);
	});
	describe('checkIfWorkflowCanBeActivated', () => {
		const disabledNode = (0, jest_mock_extended_1.mock)({ type: 'triggerNode', disabled: true });
		const unknownNode = (0, jest_mock_extended_1.mock)({ type: 'unknownNode' });
		const noTriggersNode = (0, jest_mock_extended_1.mock)({ type: 'noTriggersNode' });
		const pollNode = (0, jest_mock_extended_1.mock)({ type: 'pollNode' });
		const triggerNode = (0, jest_mock_extended_1.mock)({ type: 'triggerNode' });
		const webhookNode = (0, jest_mock_extended_1.mock)({ type: 'webhookNode' });
		nodeTypes.getByNameAndVersion.mockImplementation((type) => {
			if (type === 'unknownNode') return undefined;
			const partial = {
				poll: undefined,
				trigger: undefined,
				webhook: undefined,
				description: (0, jest_mock_extended_1.mock)({
					properties: [],
				}),
			};
			if (type === 'pollNode') partial.poll = jest.fn();
			if (type === 'triggerNode') partial.trigger = jest.fn();
			if (type === 'webhookNode') partial.webhook = jest.fn();
			return (0, jest_mock_extended_1.mock)(partial);
		});
		test.each([
			['should skip disabled nodes', disabledNode, [], false],
			['should skip nodes marked as ignored', triggerNode, ['triggerNode'], false],
			['should skip unknown nodes', unknownNode, [], false],
			['should skip nodes with no trigger method', noTriggersNode, [], false],
			['should activate if poll method exists', pollNode, [], true],
			['should activate if trigger method exists', triggerNode, [], true],
			['should activate if webhook method exists', webhookNode, [], true],
		])('%s', (_, node, ignoredNodes, expected) => {
			const workflow = new n8n_workflow_1.Workflow(
				(0, jest_mock_extended_1.mock)({ nodeTypes, nodes: [node] }),
			);
			const canBeActivated = activeWorkflowManager.checkIfWorkflowCanBeActivated(
				workflow,
				ignoredNodes,
			);
			expect(canBeActivated).toBe(expected);
		});
	});
	describe('shouldAddWebhooks', () => {
		describe('if leader', () => {
			beforeAll(() => {
				Object.assign(instanceSettings, { isLeader: true, isFollower: false });
			});
			test('should return `true` for `init`', () => {
				const result = activeWorkflowManager.shouldAddWebhooks('init');
				expect(result).toBe(true);
			});
			test('should return `false` for `leadershipChange`', () => {
				const result = activeWorkflowManager.shouldAddWebhooks('leadershipChange');
				expect(result).toBe(false);
			});
			test('should return `true` for `update` or `activate`', () => {
				const modes = ['update', 'activate'];
				for (const mode of modes) {
					const result = activeWorkflowManager.shouldAddWebhooks(mode);
					expect(result).toBe(true);
				}
			});
		});
		describe('if follower', () => {
			beforeAll(() => {
				Object.assign(instanceSettings, { isLeader: false, isFollower: true });
			});
			test('should return `false` for `update` or `activate`', () => {
				const modes = ['update', 'activate'];
				for (const mode of modes) {
					const result = activeWorkflowManager.shouldAddWebhooks(mode);
					expect(result).toBe(false);
				}
			});
		});
		describe('add', () => {
			test.each([['init'], ['leadershipChange']])(
				'should skip inactive workflow in `%s` activation mode',
				async (mode) => {
					const checkSpy = jest.spyOn(activeWorkflowManager, 'checkIfWorkflowCanBeActivated');
					const addWebhooksSpy = jest.spyOn(activeWorkflowManager, 'addWebhooks');
					const addTriggersAndPollersSpy = jest.spyOn(
						activeWorkflowManager,
						'addTriggersAndPollers',
					);
					workflowRepository.findById.mockResolvedValue(
						(0, jest_mock_extended_1.mock)({ active: false }),
					);
					const added = await activeWorkflowManager.add('some-id', mode);
					expect(checkSpy).not.toHaveBeenCalled();
					expect(addWebhooksSpy).not.toHaveBeenCalled();
					expect(addTriggersAndPollersSpy).not.toHaveBeenCalled();
					expect(added).toEqual({ triggersAndPollers: false, webhooks: false });
				},
			);
		});
	});
});
//# sourceMappingURL=active-workflow-manager.test.js.map
