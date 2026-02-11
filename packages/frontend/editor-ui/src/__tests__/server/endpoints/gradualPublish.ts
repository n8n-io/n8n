import type { Server } from 'miragejs';
import { Response } from 'miragejs';

export function routesForGradualPublish(server: Server) {
	server.post('/rest/workflows/:workflowId/gradual-publish', (_schema, request) => {
		const { percentage, versionId } = JSON.parse(request.requestBody);

		// Mock: 0% = rollback, 100% = complete (both disable gradual rollout)
		if (percentage === 0 || percentage === 100) {
			return new Response(
				200,
				{},
				{
					data: {
						gradualRollout: null,
					},
				},
			);
		}

		// Mock: Active gradual rollout
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
}
