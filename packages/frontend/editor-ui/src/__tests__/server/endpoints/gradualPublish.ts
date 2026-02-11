import type { Server } from 'miragejs';
import { Response } from 'miragejs';

export function routesForGradualPublish(server: Server) {
	server.post('/rest/workflows/:workflowId/gradual-rollout', (_schema, request) => {
		const { percentage, versionId } = JSON.parse(request.requestBody);

		// Mock: Active gradual rollout (1-99%)
		return new Response(
			200,
			{},
			{
				data: {
					gradualRollout: {
						enabled: true,
						versions: [
							{
								versionId: versionId ?? `new-version-${Date.now()}`,
								percentage,
								isNew: true,
							},
							{
								versionId: `current-active-${request.params.workflowId}`,
								percentage: 100 - percentage,
								isNew: false,
							},
						],
					},
				},
			},
		);
	});

	// DELETE endpoint: Remove gradual rollout (rollback to version A)
	server.delete('/rest/workflows/:workflowId/gradual-rollout', () => {
		return new Response(
			200,
			{},
			{
				data: {
					gradualRollout: null,
				},
			},
		);
	});
}
