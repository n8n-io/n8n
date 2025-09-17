import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { UserAction } from '@n8n/design-system';
import ProjectMembersActionsCell from '@/components/Projects/ProjectMembersActionsCell.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { ProjectMemberData } from '@/types/projects.types';

vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nActionToggle: {
			name: 'N8nActionToggle',
			props: {
				actions: { type: Array, required: true },
			},
			emits: ['action'],
			template: `
        <div>
          <button
            v-for="a in actions"
            :key="a.value"
            :data-test-id="'action-' + a.value"
            @click="$emit('action', a.value)"
          >
            {{ a.label }}
          </button>
        </div>
      `,
		},
	};
});

const baseMember: ProjectMemberData = {
	id: '1',
	firstName: 'John',
	lastName: 'Doe',
	email: 'john@example.com',
	role: 'project:editor',
};

const removeAction: UserAction<ProjectMemberData> = {
	value: 'remove',
	label: 'Remove user',
};

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('ProjectMembersActionsCell', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(ProjectMembersActionsCell, {
			pinia: createTestingPinia(),
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders actions when allowed and emits on click', async () => {
		const props = {
			data: baseMember,
			actions: [removeAction],
			currentUserId: '2', // not self
		};
		const { emitted } = renderComponent({ props });

		const user = userEvent.setup();
		await user.click(screen.getByTestId('action-remove'));

		expect(emitted()).toHaveProperty('action');
		expect(emitted().action[0]).toEqual([{ action: 'remove', userId: '1' }]);
	});

	it('does not render when actions list is empty', () => {
		const props = {
			data: baseMember,
			actions: [],
			currentUserId: '2',
		};
		const { container } = renderComponent({ props });
		expect(container.querySelector('button')).toBeNull();
	});

	it('does not render for current user', () => {
		const props = {
			data: baseMember,
			actions: [removeAction],
			currentUserId: '1',
		};
		renderComponent({ props });
		expect(screen.queryByTestId('action-remove')).not.toBeInTheDocument();
	});

	it('does not render for personal owner role', () => {
		const props = {
			data: { ...baseMember, role: 'project:personalOwner' },
			actions: [removeAction],
			currentUserId: '2',
		};
		renderComponent({ props });
		expect(screen.queryByTestId('action-remove')).not.toBeInTheDocument();
	});
});
