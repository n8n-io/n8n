import {
	createCanvasNodeProvide,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { createTestingPinia } from '@pinia/testing';
import CanvasNodeSettingsIcons from './CanvasNodeSettingsIcons.vue';
import type { INode } from 'n8n-workflow';

vi.mock('@/features/shared/envFeatureFlag/useEnvFeatureFlag', () => ({
	useEnvFeatureFlag: vi.fn(),
}));

import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

const mockedUseEnvFeatureFlag = vi.mocked(useEnvFeatureFlag);

const renderComponent = createComponentRenderer(CanvasNodeSettingsIcons, {
	pinia: createTestingPinia(),
});

describe('CanvasNodeSettingsIcons', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let credentialsStore: MockedStore<typeof useCredentialsStore>;

	const createMockNode = (overrides: Partial<INode> = {}): INode =>
		({
			name: 'Test Node',
			type: 'test',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		}) as INode;

	beforeEach(() => {
		workflowsStore = mockedStore(useWorkflowsStore);
		credentialsStore = mockedStore(useCredentialsStore);

		// Default: feature flag disabled
		mockedUseEnvFeatureFlag.mockReturnValue({
			check: { value: () => false },
		} as ReturnType<typeof useEnvFeatureFlag>);
	});

	describe('dynamic credentials icon', () => {
		it('should not render when feature flag is disabled', () => {
			const node = createMockNode({
				credentials: { testCred: { id: 'cred-1', name: 'Test Cred' } },
			});
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({ isResolvable: true });

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should render when feature flag enabled and credential is resolvable', () => {
			mockedUseEnvFeatureFlag.mockReturnValue({
				check: { value: (flag: string) => flag === 'DYNAMIC_CREDENTIALS' },
			} as ReturnType<typeof useEnvFeatureFlag>);

			const node = createMockNode({
				credentials: { testCred: { id: 'cred-1', name: 'Test Cred' } },
			});
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({ isResolvable: true });

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-dynamic-credentials')).toBeInTheDocument();
		});

		it('should not render when credential is not resolvable', () => {
			mockedUseEnvFeatureFlag.mockReturnValue({
				check: { value: (flag: string) => flag === 'DYNAMIC_CREDENTIALS' },
			} as ReturnType<typeof useEnvFeatureFlag>);

			const node = createMockNode({
				credentials: { testCred: { id: 'cred-1', name: 'Test Cred' } },
			});
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({ isResolvable: false });

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should render when node has context establishment hooks', () => {
			mockedUseEnvFeatureFlag.mockReturnValue({
				check: { value: (flag: string) => flag === 'DYNAMIC_CREDENTIALS' },
			} as ReturnType<typeof useEnvFeatureFlag>);

			const node = createMockNode({
				parameters: {
					contextEstablishmentHooks: { hooks: [{ id: 'hook-1' }] },
				},
			});
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-dynamic-credentials')).toBeInTheDocument();
		});

		it('should not render when node has empty context establishment hooks', () => {
			mockedUseEnvFeatureFlag.mockReturnValue({
				check: { value: (flag: string) => flag === 'DYNAMIC_CREDENTIALS' },
			} as ReturnType<typeof useEnvFeatureFlag>);

			const node = createMockNode({
				parameters: {
					contextEstablishmentHooks: { hooks: [] },
				},
			});
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should not render when node has no credentials', () => {
			mockedUseEnvFeatureFlag.mockReturnValue({
				check: { value: (flag: string) => flag === 'DYNAMIC_CREDENTIALS' },
			} as ReturnType<typeof useEnvFeatureFlag>);

			const node = createMockNode({ credentials: undefined });
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should not render when credential has no id', () => {
			mockedUseEnvFeatureFlag.mockReturnValue({
				check: { value: (flag: string) => flag === 'DYNAMIC_CREDENTIALS' },
			} as ReturnType<typeof useEnvFeatureFlag>);

			const node = createMockNode({
				credentials: { testCred: { id: '', name: 'Test Cred' } },
			});
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({ isResolvable: true });

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should not render when credential is not found in store', () => {
			mockedUseEnvFeatureFlag.mockReturnValue({
				check: { value: (flag: string) => flag === 'DYNAMIC_CREDENTIALS' },
			} as ReturnType<typeof useEnvFeatureFlag>);

			const node = createMockNode({
				credentials: { testCred: { id: 'cred-1', name: 'Test Cred' } },
			});
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(undefined);

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should not render when contextEstablishmentHooks is not an object', () => {
			mockedUseEnvFeatureFlag.mockReturnValue({
				check: { value: (flag: string) => flag === 'DYNAMIC_CREDENTIALS' },
			} as ReturnType<typeof useEnvFeatureFlag>);

			const node = createMockNode({
				parameters: {
					contextEstablishmentHooks: 'not-an-object',
				},
			});
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should not render when contextEstablishmentHooks has no hooks property', () => {
			mockedUseEnvFeatureFlag.mockReturnValue({
				check: { value: (flag: string) => flag === 'DYNAMIC_CREDENTIALS' },
			} as ReturnType<typeof useEnvFeatureFlag>);

			const node = createMockNode({
				parameters: {
					contextEstablishmentHooks: { other: 'property' },
				},
			});
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should not render when hooks is not an array', () => {
			mockedUseEnvFeatureFlag.mockReturnValue({
				check: { value: (flag: string) => flag === 'DYNAMIC_CREDENTIALS' },
			} as ReturnType<typeof useEnvFeatureFlag>);

			const node = createMockNode({
				parameters: {
					contextEstablishmentHooks: { hooks: 'not-an-array' },
				},
			});
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});
	});

	describe('other settings icons', () => {
		beforeEach(() => {
			workflowsStore.workflowObject = {
				getNode: vi.fn().mockReturnValue(createMockNode()),
			} as never;
		});

		it('should render always output data icon when enabled', () => {
			const node = createMockNode({ alwaysOutputData: true });
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-always-output-data')).toBeInTheDocument();
		});

		it('should render execute once icon when enabled', () => {
			const node = createMockNode({ executeOnce: true });
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-execute-once')).toBeInTheDocument();
		});

		it('should render retry on fail icon when enabled', () => {
			const node = createMockNode({ retryOnFail: true });
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-retry-on-fail')).toBeInTheDocument();
		});

		it('should render continue on error icon when onError is continueRegularOutput', () => {
			const node = createMockNode({ onError: 'continueRegularOutput' });
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-continue-on-error')).toBeInTheDocument();
		});

		it('should render continue on error icon when onError is continueErrorOutput', () => {
			const node = createMockNode({ onError: 'continueErrorOutput' });
			workflowsStore.workflowObject = { getNode: vi.fn().mockReturnValue(node) } as never;

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-continue-on-error')).toBeInTheDocument();
		});
	});
});
