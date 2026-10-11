import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { agentsEventBus, type AgentCredentialHelpRequest } from '@/features/agents/agents.eventBus';
import { AGENT_BUILDER_VIEW, AGENT_PREVIEW_VIEW } from '@/features/agents/constants';
import { useInstanceAiCredentialHelp } from '../useInstanceAiCredentialHelp';

const { route, ready, available, startThread } = vi.hoisted(() => ({
	route: { name: 'Credentials', params: { projectId: 'p1', agentId: 'a1' } },
	ready: { value: true },
	available: { value: true },
	startThread: vi.fn(),
}));

vi.mock('vue-router', () => ({ useRoute: () => route }));
vi.mock('../useInstanceAiAvailability', () => ({
	useInstanceAiReady: () => ready,
	useInstanceAiAvailable: () => available,
}));
vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({ currentProject: { id: 'p1' } }),
}));
vi.mock('../useInstanceAiHandoff', async (importOriginal) => ({
	...(await importOriginal<typeof import('../useInstanceAiHandoff')>()),
	useInstanceAiHandoff: () => ({ startThread }),
}));

const credential = { credentialType: 'googleDriveOAuth2Api', displayName: 'Google Drive' };

beforeEach(() => {
	vi.clearAllMocks();
	route.name = 'Credentials';
	route.params = { projectId: 'p1', agentId: 'a1' };
	ready.value = true;
	available.value = true;
});

describe('useInstanceAiCredentialHelp', () => {
	it.each([AGENT_BUILDER_VIEW, AGENT_PREVIEW_VIEW])(
		'uses the Agent panel from %s instead of a new Assistant chat',
		async (name) => {
			route.name = name;
			const accept = vi.fn().mockResolvedValue(true);
			const listener = (request: AgentCredentialHelpRequest) => {
				expect(request).toMatchObject({ projectId: 'p1', agentId: 'a1', credential });
				request.handle = accept;
			};
			agentsEventBus.on('credentialHelpRequested', listener);
			try {
				const help = useInstanceAiCredentialHelp()();
				expect(await help?.(credential)).toBe(true);
				expect(accept).toHaveBeenCalledOnce();
				expect(startThread).not.toHaveBeenCalled();
			} finally {
				agentsEventBus.off('credentialHelpRequested', listener);
			}
		},
	);

	it('keeps the modal open when its Agent builder is no longer mounted', async () => {
		route.name = AGENT_BUILDER_VIEW;
		const help = useInstanceAiCredentialHelp()();
		expect(await help?.(credential)).toBe(false);
		expect(startThread).not.toHaveBeenCalled();
	});

	it('hides Agent help before Assistant setup is complete', () => {
		route.name = AGENT_BUILDER_VIEW;
		ready.value = false;
		expect(useInstanceAiCredentialHelp()()).toBeUndefined();
		expect(startThread).not.toHaveBeenCalled();
	});

	it('keeps the new-tab behavior on the credentials page', async () => {
		const help = useInstanceAiCredentialHelp()();
		expect(await help?.(credential)).toBe(false);
		expect(startThread).toHaveBeenCalledWith(
			'p1',
			expect.stringContaining('Google Drive'),
			{ kind: 'prefill', prefillType: 'handoff_credential_setup' },
			{ source: 'credentials_list', origin: 'internal' },
			undefined,
			undefined,
			{ newTab: true, context: { source: 'credential-modal', credential } },
		);
	});

	it('passes the service name to the Agent panel', async () => {
		route.name = AGENT_BUILDER_VIEW;
		const listener = (request: AgentCredentialHelpRequest) => {
			expect(request.credential.displayName).toBe('Acme API');
			request.handle = async () => true;
		};
		agentsEventBus.on('credentialHelpRequested', listener);
		try {
			const help = useInstanceAiCredentialHelp({ serviceName: ref('Acme API') })();
			expect(await help?.(credential)).toBe(true);
		} finally {
			agentsEventBus.off('credentialHelpRequested', listener);
		}
	});
});
