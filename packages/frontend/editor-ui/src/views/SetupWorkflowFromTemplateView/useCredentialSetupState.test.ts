import { mock } from 'vitest-mock-extended';
import type { IWorkflowTemplateNode } from '@n8n/rest-api-client/api/templates';
import { keyFromCredentialTypeAndName } from '@/utils/templates/templateTransforms';
import type { IWorkflowTemplateNodeWithCredentials } from '@/utils/templates/templateTransforms';
import type { CredentialUsages } from '@/views/SetupWorkflowFromTemplateView/useCredentialSetupState';
import {
	getAppCredentials,
	groupNodeCredentialsByKey,
} from '@/views/SetupWorkflowFromTemplateView/useCredentialSetupState';
import { nodeTypeTelegram, nodeTypeTwitter } from '@/utils/testData/nodeTypeTestData';

const objToMap = <TKey extends string, T>(obj: Record<TKey, T>) => {
	return new Map(Object.entries(obj)) as Map<TKey, T>;
};

describe('useCredentialSetupState', () => {
	const nodesByName = {
		Twitter: {
			id: 'twitter',
			name: 'Twitter',
			type: 'n8n-nodes-base.twitter',
			position: [720, -220],
			parameters: {
				text: '=Hey there, my design is now on a new product ✨\nVisit my {{$json["vendor"]}} shop to get this cool{{$json["title"]}} (and check out more {{$json["product_type"]}}) 🛍️',
				additionalFields: {},
			},
			credentials: {
				twitterOAuth1Api: 'twitter',
			},
			typeVersion: 1,
		},
	} satisfies Record<string, IWorkflowTemplateNodeWithCredentials>;

	describe('groupNodeCredentialsByTypeAndName', () => {
		it('returns an empty array if there are no nodes', () => {
			expect(groupNodeCredentialsByKey([])).toEqual(new Map());
		});

		it('returns credentials grouped by type and name', () => {
			expect(
				groupNodeCredentialsByKey([
					{
						node: nodesByName.Twitter,
						requiredCredentials: nodeTypeTwitter.credentials!,
					},
				]),
			).toEqual(
				objToMap({
					'twitterOAuth1Api-twitter': {
						key: 'twitterOAuth1Api-twitter',
						credentialName: 'twitter',
						credentialType: 'twitterOAuth1Api',
						nodeTypeName: 'n8n-nodes-base.twitter',
						usedBy: [nodesByName.Twitter],
					},
				}),
			);
		});

		it('returns credentials grouped when the credential names are the same', () => {
			const [node1, node2] = [
				mock<IWorkflowTemplateNode>({
					id: 'twitter',
					type: 'n8n-nodes-base.twitter',
					credentials: {
						twitterOAuth1Api: 'credential',
					},
				}) as IWorkflowTemplateNodeWithCredentials,
				mock<IWorkflowTemplateNode>({
					id: 'telegram',
					type: 'n8n-nodes-base.telegram',
					credentials: {
						telegramApi: 'credential',
					},
				}) as IWorkflowTemplateNodeWithCredentials,
			];

			expect(
				groupNodeCredentialsByKey([
					{
						node: node1,
						requiredCredentials: nodeTypeTwitter.credentials!,
					},
					{
						node: node2,
						requiredCredentials: nodeTypeTelegram.credentials!,
					},
				]),
			).toEqual(
				objToMap({
					'twitterOAuth1Api-credential': {
						key: 'twitterOAuth1Api-credential',
						credentialName: 'credential',
						credentialType: 'twitterOAuth1Api',
						nodeTypeName: 'n8n-nodes-base.twitter',
						usedBy: [node1],
					},
					'telegramApi-credential': {
						key: 'telegramApi-credential',
						credentialName: 'credential',
						credentialType: 'telegramApi',
						nodeTypeName: 'n8n-nodes-base.telegram',
						usedBy: [node2],
					},
				}),
			);
		});
	});

	describe('getAppCredentials', () => {
		it('returns an empty array if there are no nodes', () => {
			const appNameByNodeTypeName = () => 'Twitter';
			expect(getAppCredentials([], appNameByNodeTypeName)).toEqual([]);
		});

		it('returns an array of apps requiring credentials', () => {
			const credentialUsages: CredentialUsages[] = [
				{
					key: keyFromCredentialTypeAndName('twitterOAuth1Api', 'twitter'),
					credentialName: 'twitter',
					credentialType: 'twitterOAuth1Api',
					nodeTypeName: 'n8n-nodes-base.twitter',
					usedBy: [nodesByName.Twitter],
				},
			];

			const appNameByNodeTypeName = () => 'Twitter';

			expect(getAppCredentials(credentialUsages, appNameByNodeTypeName)).toEqual([
				{
					appName: 'Twitter',
					credentials: [
						{
							key: 'twitterOAuth1Api-twitter',
							credentialName: 'twitter',
							credentialType: 'twitterOAuth1Api',
							nodeTypeName: 'n8n-nodes-base.twitter',
							usedBy: [nodesByName.Twitter],
						},
					],
				},
			]);
		});
	});
});
