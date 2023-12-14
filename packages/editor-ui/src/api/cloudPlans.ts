import type { Cloud, IRestApiContext, InstanceUsage, LeadEnrichmentTemplates } from '@/Interface';
import { get, post } from '@/utils/apiUtils';

export async function getCurrentPlan(context: IRestApiContext): Promise<Cloud.PlanData> {
	return get(context.baseUrl, '/admin/cloud-plan');
}

export async function getCurrentUsage(context: IRestApiContext): Promise<InstanceUsage> {
	return get(context.baseUrl, '/cloud/limits');
}

export async function getCloudUserInfo(context: IRestApiContext): Promise<Cloud.UserAccount> {
	return get(context.baseUrl, '/cloud/proxy/user/me');
}

export async function confirmEmail(context: IRestApiContext): Promise<Cloud.UserAccount> {
	return post(context.baseUrl, '/cloud/proxy/user/resend-confirmation-email');
}

export async function getAdminPanelLoginCode(context: IRestApiContext): Promise<{ code: string }> {
	return get(context.baseUrl, '/cloud/proxy/login/code');
}

// TODO: Call the real endpoint once it is ready
export function getLeadEnrichmentTemplates(): LeadEnrichmentTemplates {
	return {
		sections: [
			{
				name: 'Lead enrichment',
				title: 'Explore curated lead enrichment workflows or start fresh with a blank canvas',
				workflows: [
					{
						title:
							'Score new leads with AI from Facebook Lead Ads with AI and get notifications for high scores on Slack',
						description:
							'This workflow will help you save tons of time and will notify you fully automatically about the most important incoming leads from Facebook Lead Ads. The workflow will automatically fire for every submission. It will then take the name, company, and email information, enrich the submitter via AI, and score it based on metrics that you can easily set.',
						preview: {
							nodes: [
								{
									id: '9971f7ab-ecc3-468b-8eb9-b58491b660bd',
									name: "On clicking 'execute'",
									type: 'n8n-nodes-base.manualTrigger',
									position: [1040, 360],
									parameters: {},
									typeVersion: 1,
								},
								{
									id: 'bb212963-9b6f-434c-9777-3360fb456d4b',
									name: 'Note',
									type: 'n8n-nodes-base.stickyNote',
									position: [1320, 600],
									parameters: {
										width: 1020,
										height: 360,
										content: '# 3. Add items from B below items from A\n',
									},
									typeVersion: 1,
								},
							],
							connections: {
								'A. Queen': {
									main: [
										[
											{
												node: 'Super Band',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								'A. Ingredients': {
									main: [
										[
											{
												node: 'Merge recipe',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								'B. Led Zeppelin': {
									main: [
										[
											{
												node: 'Super Band',
												type: 'main',
												index: 1,
											},
										],
									],
								},
								'B. Recipe quantities': {
									main: [
										[
											{
												node: 'Merge recipe',
												type: 'main',
												index: 1,
											},
										],
									],
								},
								'A. Ingredients Needed': {
									main: [
										[
											{
												node: 'Ingredients in stock from recipe',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								"On clicking 'execute'": {
									main: [
										[
											{
												node: 'A. Ingredients Needed',
												type: 'main',
												index: 0,
											},
											{
												node: 'B. Ingredients in stock',
												type: 'main',
												index: 0,
											},
											{
												node: 'A. Ingredients',
												type: 'main',
												index: 0,
											},
											{
												node: 'B. Recipe quantities',
												type: 'main',
												index: 0,
											},
											{
												node: 'A. Queen',
												type: 'main',
												index: 0,
											},
											{
												node: 'B. Led Zeppelin',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								'B. Ingredients in stock': {
									main: [
										[
											{
												node: 'Ingredients in stock from recipe',
												type: 'main',
												index: 1,
											},
										],
									],
								},
							},
						},
						nodes: [
							{
								id: 24,
								icon: 'fa:code-branch',
								name: 'n8n-nodes-base.merge',
								defaults: {
									name: 'Merge',
									color: '#00bbcc',
								},
								iconData: {
									icon: 'code-branch',
									type: 'icon',
								},
								categories: [
									{
										id: 9,
										name: 'Core Nodes',
									},
								],
								displayName: 'Merge',
								typeVersion: 2,
							},
						],
					},
					{
						title: 'Verify the email address every time a contact is created in HubSpot',
						description:
							'This workflow will help you save tons of time and will notify you fully automatically about the most important incoming leads from Facebook Lead Ads. The workflow will automatically fire for every submission. It will then take the name, company, and email information, enrich the submitter via AI, and score it based on metrics that you can easily set.',
						preview: {
							nodes: [
								{
									id: '9971f7ab-ecc3-468b-8eb9-b58491b660bd',
									name: "On clicking 'execute'",
									type: 'n8n-nodes-base.manualTrigger',
									position: [1040, 360],
									parameters: {},
									typeVersion: 1,
								},
								{
									id: 'bb212963-9b6f-434c-9777-3360fb456d4b',
									name: 'Note',
									type: 'n8n-nodes-base.stickyNote',
									position: [1320, 600],
									parameters: {
										width: 1020,
										height: 360,
										content: '# 3. Add items from B below items from A\n',
									},
									typeVersion: 1,
								},
							],
							connections: {
								'A. Queen': {
									main: [
										[
											{
												node: 'Super Band',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								'A. Ingredients': {
									main: [
										[
											{
												node: 'Merge recipe',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								'B. Led Zeppelin': {
									main: [
										[
											{
												node: 'Super Band',
												type: 'main',
												index: 1,
											},
										],
									],
								},
								'B. Recipe quantities': {
									main: [
										[
											{
												node: 'Merge recipe',
												type: 'main',
												index: 1,
											},
										],
									],
								},
								'A. Ingredients Needed': {
									main: [
										[
											{
												node: 'Ingredients in stock from recipe',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								"On clicking 'execute'": {
									main: [
										[
											{
												node: 'A. Ingredients Needed',
												type: 'main',
												index: 0,
											},
											{
												node: 'B. Ingredients in stock',
												type: 'main',
												index: 0,
											},
											{
												node: 'A. Ingredients',
												type: 'main',
												index: 0,
											},
											{
												node: 'B. Recipe quantities',
												type: 'main',
												index: 0,
											},
											{
												node: 'A. Queen',
												type: 'main',
												index: 0,
											},
											{
												node: 'B. Led Zeppelin',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								'B. Ingredients in stock': {
									main: [
										[
											{
												node: 'Ingredients in stock from recipe',
												type: 'main',
												index: 1,
											},
										],
									],
								},
							},
						},
						nodes: [
							{
								id: 14,
								icon: 'fa:code',
								name: 'n8n-nodes-base.function',
								defaults: {
									name: 'Function',
									color: '#FF9922',
								},
								iconData: {
									icon: 'code',
									type: 'icon',
								},
								categories: [
									{
										id: 5,
										name: 'Development',
									},
									{
										id: 9,
										name: 'Core Nodes',
									},
								],
								displayName: 'Function',
								typeVersion: 1,
							},
							{
								id: 24,
								icon: 'fa:code-branch',
								name: 'n8n-nodes-base.merge',
								defaults: {
									name: 'Merge',
									color: '#00bbcc',
								},
								iconData: {
									icon: 'code-branch',
									type: 'icon',
								},
								categories: [
									{
										id: 9,
										name: 'Core Nodes',
									},
								],
								displayName: 'Merge',
								typeVersion: 2,
							},
						],
					},
					{
						title: 'Enrich leads from HubSpot with company information via OpenAi',
						description:
							'This workflow will help you save tons of time and will notify you fully automatically about the most important incoming leads from Facebook Lead Ads. The workflow will automatically fire for every submission. It will then take the name, company, and email information, enrich the submitter via AI, and score it based on metrics that you can easily set.',
						preview: {
							nodes: [
								{
									id: '9971f7ab-ecc3-468b-8eb9-b58491b660bd',
									name: "On clicking 'execute'",
									type: 'n8n-nodes-base.manualTrigger',
									position: [1040, 360],
									parameters: {},
									typeVersion: 1,
								},
								{
									id: 'bb212963-9b6f-434c-9777-3360fb456d4b',
									name: 'Note',
									type: 'n8n-nodes-base.stickyNote',
									position: [1320, 600],
									parameters: {
										width: 1020,
										height: 360,
										content: '# 3. Add items from B below items from A\n',
									},
									typeVersion: 1,
								},
							],
							connections: {
								'A. Queen': {
									main: [
										[
											{
												node: 'Super Band',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								'A. Ingredients': {
									main: [
										[
											{
												node: 'Merge recipe',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								'B. Led Zeppelin': {
									main: [
										[
											{
												node: 'Super Band',
												type: 'main',
												index: 1,
											},
										],
									],
								},
								'B. Recipe quantities': {
									main: [
										[
											{
												node: 'Merge recipe',
												type: 'main',
												index: 1,
											},
										],
									],
								},
								'A. Ingredients Needed': {
									main: [
										[
											{
												node: 'Ingredients in stock from recipe',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								"On clicking 'execute'": {
									main: [
										[
											{
												node: 'A. Ingredients Needed',
												type: 'main',
												index: 0,
											},
											{
												node: 'B. Ingredients in stock',
												type: 'main',
												index: 0,
											},
											{
												node: 'A. Ingredients',
												type: 'main',
												index: 0,
											},
											{
												node: 'B. Recipe quantities',
												type: 'main',
												index: 0,
											},
											{
												node: 'A. Queen',
												type: 'main',
												index: 0,
											},
											{
												node: 'B. Led Zeppelin',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								'B. Ingredients in stock': {
									main: [
										[
											{
												node: 'Ingredients in stock from recipe',
												type: 'main',
												index: 1,
											},
										],
									],
								},
							},
						},
						nodes: [
							{
								id: 14,
								icon: 'fa:code',
								name: 'n8n-nodes-base.function',
								defaults: {
									name: 'Function',
									color: '#FF9922',
								},
								iconData: {
									icon: 'code',
									type: 'icon',
								},
								categories: [
									{
										id: 5,
										name: 'Development',
									},
									{
										id: 9,
										name: 'Core Nodes',
									},
								],
								displayName: 'Function',
								typeVersion: 1,
							},
						],
					},
					{
						title:
							'Score new lead submissions from Facebook Lead Ads with AI and notify me on Slack when it is a high score lead',
						description:
							'This workflow will help you save tons of time and will notify you fully automatically about the most important incoming leads from Facebook Lead Ads. The workflow will automatically fire for every submission. It will then take the name, company, and email information, enrich the submitter via AI, and score it based on metrics that you can easily set.',
						preview: {
							nodes: [
								{
									id: '9971f7ab-ecc3-468b-8eb9-b58491b660bd',
									name: "On clicking 'execute'",
									type: 'n8n-nodes-base.manualTrigger',
									position: [1040, 360],
									parameters: {},
									typeVersion: 1,
								},
								{
									id: 'bb212963-9b6f-434c-9777-3360fb456d4b',
									name: 'Note',
									type: 'n8n-nodes-base.stickyNote',
									position: [1320, 600],
									parameters: {
										width: 1020,
										height: 360,
										content: '# 3. Add items from B below items from A\n',
									},
									typeVersion: 1,
								},
							],
							connections: {
								'A. Queen': {
									main: [
										[
											{
												node: 'Super Band',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								'A. Ingredients': {
									main: [
										[
											{
												node: 'Merge recipe',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								'B. Led Zeppelin': {
									main: [
										[
											{
												node: 'Super Band',
												type: 'main',
												index: 1,
											},
										],
									],
								},
								'B. Recipe quantities': {
									main: [
										[
											{
												node: 'Merge recipe',
												type: 'main',
												index: 1,
											},
										],
									],
								},
								'A. Ingredients Needed': {
									main: [
										[
											{
												node: 'Ingredients in stock from recipe',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								"On clicking 'execute'": {
									main: [
										[
											{
												node: 'A. Ingredients Needed',
												type: 'main',
												index: 0,
											},
											{
												node: 'B. Ingredients in stock',
												type: 'main',
												index: 0,
											},
											{
												node: 'A. Ingredients',
												type: 'main',
												index: 0,
											},
											{
												node: 'B. Recipe quantities',
												type: 'main',
												index: 0,
											},
											{
												node: 'A. Queen',
												type: 'main',
												index: 0,
											},
											{
												node: 'B. Led Zeppelin',
												type: 'main',
												index: 0,
											},
										],
									],
								},
								'B. Ingredients in stock': {
									main: [
										[
											{
												node: 'Ingredients in stock from recipe',
												type: 'main',
												index: 1,
											},
										],
									],
								},
							},
						},
						nodes: [
							{
								id: 14,
								icon: 'fa:code',
								name: 'n8n-nodes-base.function',
								defaults: {
									name: 'Function',
									color: '#FF9922',
								},
								iconData: {
									icon: 'code',
									type: 'icon',
								},
								categories: [
									{
										id: 5,
										name: 'Development',
									},
									{
										id: 9,
										name: 'Core Nodes',
									},
								],
								displayName: 'Function',
								typeVersion: 1,
							},
							{
								id: 24,
								icon: 'fa:code-branch',
								name: 'n8n-nodes-base.merge',
								defaults: {
									name: 'Merge',
									color: '#00bbcc',
								},
								iconData: {
									icon: 'code-branch',
									type: 'icon',
								},
								categories: [
									{
										id: 9,
										name: 'Core Nodes',
									},
								],
								displayName: 'Merge',
								typeVersion: 2,
							},
						],
					},
				],
			},
		],
	};
}
