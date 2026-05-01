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
		useWorkflowsStore().workflow.id = TEST_WF_ID;
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
});
