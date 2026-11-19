import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { mockedStore } from '@/__tests__/utils';
import type { WorkflowResource } from '@/Interface';
import { INSTANCE_AI_NEW_VIEW } from '@/features/ai/instanceAi/constants';
import { useOpenWorkflowInAssistantStore } from '../stores/openWorkflowInAssistant.store';
import { useOpenInAssistantCard } from './useOpenInAssistantCard';

const push = vi.fn();
const resolve = vi.fn().mockReturnValue({ href: '/assistant-href' });
vi.mock('vue-router', () => ({
	useRouter: () => ({ push, resolve }),
}));

const createWorkflow = (overrides: Partial<WorkflowResource> = {}): WorkflowResource => ({
	resourceType: 'workflow',
	id: '1',
	name: 'My Workflow',
	createdAt: '2024-01-01',
	updatedAt: '2024-01-01',
	active: true,
	activeVersionId: 'v1',
	isArchived: false,
	readOnly: false,
	scopes: ['workflow:update'],
	homeProject: {
		id: 'p1',
		name: 'Personal',
		type: 'personal',
		icon: null,
		createdAt: '2024-01-01',
		updatedAt: '2024-01-01',
	},
	...overrides,
});

describe('useOpenInAssistantCard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia());
		mockedStore(useOpenWorkflowInAssistantStore).opensInAssistant = true;
	});

	it('declines archived workflows', () => {
		const openInAssistant = useOpenInAssistantCard({ data: createWorkflow({ isArchived: true }) });

		expect(openInAssistant()).toBe(false);
		expect(push).not.toHaveBeenCalled();
	});

	it('declines workflows the user cannot update', () => {
		const openInAssistant = useOpenInAssistantCard({ data: createWorkflow({ scopes: [] }) });

		expect(openInAssistant()).toBe(false);
		expect(push).not.toHaveBeenCalled();
	});

	it('opens a new tab on ctrl-click instead of navigating', () => {
		const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
		const openInAssistant = useOpenInAssistantCard({ data: createWorkflow() });

		expect(openInAssistant({ ctrlKey: true } as unknown as PointerEvent)).toBe(true);
		expect(resolve).toHaveBeenCalledWith({
			name: INSTANCE_AI_NEW_VIEW,
			query: { workflowId: '1' },
		});
		expect(windowOpen).toHaveBeenCalledWith('/assistant-href', '_blank');
		expect(push).not.toHaveBeenCalled();
	});
});
