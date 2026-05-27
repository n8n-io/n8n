import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useUniqueNodeName } from '@/app/composables/useUniqueNodeName';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '../stores/workflowDocument.store';

const TEST_WF_ID = 'test-wf-id';

describe('useUniqueNodeName', () => {
	beforeAll(() => {
		setActivePinia(createTestingPinia());
		useWorkflowsStore().workflowId = TEST_WF_ID;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	test('should return a unique node name for an alphabetic node name', () => {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(TEST_WF_ID));

		const mockCanvasNames = new Set(['Hello']);

		vi.spyOn(workflowDocumentStore, 'canvasNames', 'get').mockReturnValue(mockCanvasNames);

		const { uniqueNodeName } = useUniqueNodeName();

		expect(uniqueNodeName('Hello')).toBe('Hello1');

		mockCanvasNames.add('Hello1');

		expect(uniqueNodeName('Hello')).toBe('Hello2');
	});

	test('should return a unique node name for a numeric node name', () => {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(TEST_WF_ID));

		const mockCanvasNames = new Set(['123']);

		vi.spyOn(workflowDocumentStore, 'canvasNames', 'get').mockReturnValue(mockCanvasNames);

		const { uniqueNodeName } = useUniqueNodeName();

		expect(uniqueNodeName('123')).toBe('123-1');

		mockCanvasNames.add('123-1');

		expect(uniqueNodeName('123')).toBe('123-2');
	});

	test('should return a unique node name for a number-suffixed node name', () => {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(TEST_WF_ID));
		const nodeTypesStore = useNodeTypesStore();

		const mockCanvasNames = new Set(['S3']);

		vi.spyOn(workflowDocumentStore, 'canvasNames', 'get').mockReturnValue(mockCanvasNames);
		vi.spyOn(nodeTypesStore, 'allNodeTypes', 'get').mockReturnValue([
			{
				displayName: 'S3',
				name: 'S3',
				description: '',
				version: 1,
				inputs: [],
				outputs: [],
				group: ['input'],
				properties: [],
				defaults: {
					name: 'S3',
				},
			},
		]);

		const { uniqueNodeName } = useUniqueNodeName();

		expect(uniqueNodeName('S3')).toBe('S31');

		mockCanvasNames.add('S31');

		expect(uniqueNodeName('S3')).toBe('S32');
	});

	test('should preserve decimal suffix when duplicating a node name ending with a version-like decimal', () => {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(TEST_WF_ID));

		const mockCanvasNames = new Set(['Claude Sonnet 4.6']);

		vi.spyOn(workflowDocumentStore, 'canvasNames', 'get').mockReturnValue(mockCanvasNames);

		const { uniqueNodeName } = useUniqueNodeName();

		expect(uniqueNodeName('Claude Sonnet 4.6')).toBe('Claude Sonnet 4.61');

		mockCanvasNames.add('Claude Sonnet 4.61');

		expect(uniqueNodeName('Claude Sonnet 4.6')).toBe('Claude Sonnet 4.62');
	});

	test('should preserve multi-digit decimal suffix when duplicating', () => {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(TEST_WF_ID));

		const mockCanvasNames = new Set(['GPT 5.10']);

		vi.spyOn(workflowDocumentStore, 'canvasNames', 'get').mockReturnValue(mockCanvasNames);

		const { uniqueNodeName } = useUniqueNodeName();

		expect(uniqueNodeName('GPT 5.10')).toBe('GPT 5.101');
	});

	test('should preserve multi-segment decimal suffix when duplicating', () => {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(TEST_WF_ID));

		const mockCanvasNames = new Set(['Gemini 2.0.5']);

		vi.spyOn(workflowDocumentStore, 'canvasNames', 'get').mockReturnValue(mockCanvasNames);

		const { uniqueNodeName } = useUniqueNodeName();

		expect(uniqueNodeName('Gemini 2.0.5')).toBe('Gemini 2.0.51');
	});

	test('should still treat trailing digits with no decimal as a counter', () => {
		const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(TEST_WF_ID));

		const mockCanvasNames = new Set(['MyNode', 'MyNode42']);

		vi.spyOn(workflowDocumentStore, 'canvasNames', 'get').mockReturnValue(mockCanvasNames);

		const { uniqueNodeName } = useUniqueNodeName();

		expect(uniqueNodeName('MyNode42')).toBe('MyNode43');
	});
});
