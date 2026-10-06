import type { ICredentialType, INodeType } from 'n8n-workflow';

import { messageGemini } from '../../nodes/google-gemini/actions/text.message';
import {
	actionNode,
	compareRuns,
	requireBuilt,
	runNode,
	type AllowedDifference,
	type ParityCase,
} from '../../../../nodes-core/src/__tests__/parity/harness';

// The legacy node ships in nodes-langchain, which this package does not depend on.
const { GoogleGemini } = requireBuilt(
	'@n8n/nodes-langchain/dist/nodes/vendors/GoogleGemini/GoogleGemini.node.js',
) as { GoogleGemini: new () => INodeType };
const { GooglePalmApi } = requireBuilt(
	'@n8n/nodes-langchain/dist/credentials/GooglePalmApi.credentials.js',
) as { GooglePalmApi: new () => ICredentialType };

const MODEL = 'models/gemini-2.5-flash';

describe('googleGemini.text.message parity with Google Gemini v1.2 text message', () => {
	const parityCase: ParityCase = {
		credential: {
			data: { host: 'https://generativelanguage.googleapis.com', apiKey: 'key-parity' },
			types: [new GooglePalmApi()],
		},
		input: [{ prompt: 'Say hello' }, { prompt: 'Say bye' }],
		routes: [
			{
				method: 'POST',
				url: `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent`,
				json: {
					candidates: [
						{
							content: { parts: [{ text: 'Hello' }, { text: ' there' }], role: 'model' },
							finishReason: 'STOP',
							index: 0,
						},
					],
					usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 2, totalTokenCount: 6 },
					modelVersion: 'gemini-2.5-flash',
				},
			},
		],
	};

	const ALLOWED: readonly AllowedDifference[] = [0, 1].map((index) => ({
		path: `requests.POST https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent #${index}.body.tools`,
		kind: 'intended',
		reason: 'The action has no tools, so it omits the empty tools list the legacy node sends.',
	}));

	it('sends the same requests and emits the same items', async () => {
		const legacy = await runNode(
			{
				nodeType: new GoogleGemini(),
				type: '@n8n/n8n-nodes-langchain.googleGemini',
				typeVersion: 1.2,
				credential: 'googlePalmApi',
				parameters: {
					resource: 'text',
					operation: 'message',
					modelId: { __rl: true, mode: 'id', value: MODEL },
					messages: { values: [{ content: '={{ $json.prompt }}', role: 'user' }] },
					simplify: true,
					jsonOutput: true,
					options: {
						includeMergedResponse: true,
						systemMessage: 'Answer in one word',
						temperature: 0.2,
						maxOutputTokens: 64,
					},
				},
			},
			parityCase,
		);
		const next = await runNode(
			actionNode(
				messageGemini,
				{
					model: MODEL,
					messages: '={{ [{ role: "user", content: $json.prompt }] }}',
					systemMessage: 'Answer in one word',
					jsonOutput: true,
					temperature: 0.2,
					maxOutputTokens: 64,
				},
				'googlePalmApi',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, ALLOWED)).toEqual({ unexplained: [], stale: [] });
	});
});
