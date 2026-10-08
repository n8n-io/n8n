import { NodeHelpers, Workflow, type INode, type INodeTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EmbeddingsGoogleVertex } from '../../nodes/embeddings/EmbeddingsGoogleVertex/EmbeddingsGoogleVertex.node';
import { LmChatGoogleVertex } from '../../nodes/llms/LmChatGoogleVertex/LmChatGoogleVertex.node';
describe.each([new LmChatGoogleVertex(), new EmbeddingsGoogleVertex()])(
	'$description.displayName credential selection',
	(node) => {
		it.each([undefined, 'googleApi', 'googleVertexAiApi'])(
			'keeps the project field and credentials consistent for authentication %s',
			(authentication) => {
				const description = node.description;
				const savedNode: INode = {
					id: 'vertex-node',
					name: 'Vertex',
					type: description.name,
					typeVersion: 1,
					position: [0, 0],
					parameters: {
						...(authentication ? { authentication } : {}),
						projectId: { __rl: true, mode: 'id', value: '={{ "legacy-project" }}' },
					},
				};
				const workflow = new Workflow({
					nodes: [savedNode],
					connections: {},
					active: false,
					nodeTypes: mock<INodeTypes>({ getByNameAndVersion: () => node }),
				});
				const parameters = workflow.nodes.Vertex.parameters;
				const visibleCredentials = description.credentials?.filter((credential) =>
					NodeHelpers.displayParameter(parameters, credential, null, description),
				);
				expect(visibleCredentials?.map((credential) => credential.name)).toEqual([
					authentication ?? 'googleApi',
				]);
				const projectField = description.properties.find(
					(property) => property.name === 'projectId',
				)!;
				expect(NodeHelpers.displayParameter(parameters, projectField, null, description)).toBe(
					authentication !== 'googleVertexAiApi',
				);
				if (authentication !== 'googleVertexAiApi') {
					expect(
						workflow.expression.getComplexParameterValue(savedNode, parameters, 'manual', {}),
					).toMatchObject({ projectId: { value: 'legacy-project' } });
				}
			},
		);
	},
);
