import type { AquariumActivity } from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import type { ActivitySnapshot, AquariumSourceContext } from '../aquarium.types';
import { entityKey } from './source.utils';

export function toActivitySnapshot(activity: AquariumActivity): ActivitySnapshot {
	return {
		windowSeconds: activity.windowSeconds,
		byKey: new Map(
			activity.workflows.map((workflow) => [
				entityKey('workflow', workflow.workflowId),
				{
					running: workflow.running,
					started: workflow.started,
					succeeded: workflow.succeeded,
					failed: workflow.failed,
					waiting: workflow.waiting,
					paused: workflow.paused,
					startedPerSecond: workflow.startedPerSecond,
					lastEventAt: Date.parse(workflow.lastEventAt),
				},
			]),
		),
	};
}

/** Needs the `aquarium` backend module. */
export async function fetchActivity({
	restApiContext,
}: AquariumSourceContext): Promise<ActivitySnapshot> {
	const activity = await makeRestApiRequest<AquariumActivity>(
		restApiContext,
		'GET',
		'/aquarium/activity',
	);
	return toActivitySnapshot(activity);
}
