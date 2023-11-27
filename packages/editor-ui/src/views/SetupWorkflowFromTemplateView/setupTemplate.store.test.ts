import type { IWorkflowTemplateNodeWithCredentials } from '@/utils/templates/templateTransforms';
import type { CredentialUsages } from '@/views/SetupWorkflowFromTemplateView/setupTemplate.store';
import {
	getAppCredentials,
	getAppsRequiringCredentials,
	groupNodeCredentialsByName,
} from '@/views/SetupWorkflowFromTemplateView/setupTemplate.store';

const objToMap = <T>(obj: Record<string, T>) => {
	return new Map<string, T>(Object.entries(obj));
};

describe('SetupWorkflowFromTemplateView store', () => {
	const nodesByName = {
		Twitter: {
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
		Telegram: {
			name: 'Telegram',
			type: 'n8n-nodes-base.telegram',
			position: [720, -20],
			parameters: {
				text: '=Hey there, my design is now on a new product!\nVisit my {{$json["vendor"]}} shop to get this cool{{$json["title"]}} (and check out more {{$json["product_type"]}})',
				chatId: '123456',
				additionalFields: {},
			},
			credentials: {
				telegramApi: 'telegram',
			},
			typeVersion: 1,
		},
		shopify: {
			name: 'shopify',
			type: 'n8n-nodes-base.shopifyTrigger',
			position: [540, -110],
			webhookId: '2a7e0e50-8f09-4a2b-bf54-a849a6ac4fe0',
			parameters: {
				topic: 'products/create',
			},
			credentials: {
				shopifyApi: 'shopify',
			},
			typeVersion: 1,
		},
	} satisfies Record<string, IWorkflowTemplateNodeWithCredentials>;

	describe('groupNodeCredentialsByName', () => {
		it('returns an empty array if there are no nodes', () => {
			expect(groupNodeCredentialsByName([])).toEqual(new Map());
		});

		it('returns credentials grouped by name', () => {
			expect(groupNodeCredentialsByName(Object.values(nodesByName))).toEqual(
				objToMap({
					twitter: {
						credentialName: 'twitter',
						credentialType: 'twitterOAuth1Api',
						nodeTypeName: 'n8n-nodes-base.twitter',
						usedBy: [nodesByName.Twitter],
					},
					telegram: {
						credentialName: 'telegram',
						credentialType: 'telegramApi',
						nodeTypeName: 'n8n-nodes-base.telegram',
						usedBy: [nodesByName.Telegram],
					},
					shopify: {
						credentialName: 'shopify',
						credentialType: 'shopifyApi',
						nodeTypeName: 'n8n-nodes-base.shopifyTrigger',
						usedBy: [nodesByName.shopify],
					},
				}),
			);
		});
	});

	describe('getAppsRequiringCredentials', () => {
		it('returns an empty array if there are no nodes', () => {
			const appNameByNodeTypeName = () => 'Twitter';
			expect(getAppsRequiringCredentials(new Map(), appNameByNodeTypeName)).toEqual([]);
		});

		it('returns an array of apps requiring credentials', () => {
			const credentialUsages: Map<string, CredentialUsages> = objToMap({
				twitter: {
					credentialName: 'twitter',
					credentialType: 'twitterOAuth1Api',
					nodeTypeName: 'n8n-nodes-base.twitter',
					usedBy: [nodesByName.Twitter],
				},
			});

			const appNameByNodeTypeName = () => 'Twitter';

			expect(getAppsRequiringCredentials(credentialUsages, appNameByNodeTypeName)).toEqual([
				{
					appName: 'Twitter',
					count: 1,
				},
			]);
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
