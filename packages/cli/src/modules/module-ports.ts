import { InstanceVersion, ModulePubSubPublisher, WorkflowProjectLookup } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import { N8N_VERSION } from '@/constants';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import type { PubSub } from '@/scaling/pubsub/pubsub.types';
import { OwnershipService } from '@/services/ownership.service';

/**
 * Binds the cli implementations behind the ports that backend modules depend
 * on, so that a module never reaches into cli internals.
 *
 * Each binding resolves its service on call, not on bind. Binding eagerly would
 * open a Redis publisher client and build the repository graph in every CLI
 * command, including the ones that never publish or read a project.
 */
export function bindModulePorts() {
	Container.set(ModulePubSubPublisher, {
		// The port carries payload-less commands only. `PubSub.Command` demands the
		// payload that belongs to each command name, and that map stays in cli.
		publishCommand: async (msg) =>
			await Container.get(Publisher).publishCommand(msg as PubSub.Command),
	});

	Container.set(WorkflowProjectLookup, {
		getWorkflowProjectCached: async (workflowId) =>
			await Container.get(OwnershipService).getWorkflowProjectCached(workflowId),
	});

	Container.set(InstanceVersion, { version: N8N_VERSION });
}
