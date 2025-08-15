import type { StoryFn } from '@storybook/vue3';

import N8nSidebar from '.';
import type { IMenuItem, IMenuElement } from '@n8n/design-system/types';

export default {
	title: 'Sidebar/Sidebar',
	component: N8nSidebar,
};

const mockPersonalItems: IMenuItem[] = Array(10000)
	.fill(null)
	.map((_, index) => ({
		id: `workflow-${index}`,
		label: `Workflow ${index}`,
		type: 'workflow' as const,
	}));

const mockSharedItems: IMenuItem[] = [
	{
		id: 'shared-folder-1',
		label: 'Team Workflows',
		type: 'folder',
		children: [
			{
				id: 'shared-subfolder-1',
				label: 'Development Team',
				type: 'folder',
				children: [
					{
						id: 'shared-subfolder-1-1',
						label: 'Sprint Management',
						type: 'folder',
						children: [
							{
								id: 'shared-subfolder-1-1-1',
								label: 'Daily Operations',
								type: 'folder',
								children: [
									{
										id: 'shared-subfolder-1-1-1-1',
										label: 'Standup Automation',
										type: 'folder',
										children: [
											{ id: 'workflow-28', label: 'Daily Standup Prep', type: 'workflow' },
											{ id: 'workflow-29', label: 'Standup Summary Generator', type: 'workflow' },
											{ id: 'workflow-30', label: 'Standup Follow-up Tasks', type: 'workflow' },
										],
									},
									{ id: 'workflow-31', label: 'Sprint Velocity Tracking', type: 'workflow' },
								],
							},
							{ id: 'workflow-32', label: 'Sprint Planning Assistant', type: 'workflow' },
						],
					},
					{
						id: 'shared-subfolder-1-2',
						label: 'Code Quality',
						type: 'folder',
						children: [
							{
								id: 'shared-subfolder-1-2-1',
								label: 'Review Processes',
								type: 'folder',
								children: [
									{ id: 'workflow-33', label: 'PR Review Assignment', type: 'workflow' },
									{ id: 'workflow-34', label: 'Code Review Notifications', type: 'workflow' },
									{ id: 'workflow-35', label: 'Review Completion Tracker', type: 'workflow' },
								],
							},
							{ id: 'workflow-36', label: 'Code Quality Metrics', type: 'workflow' },
						],
					},
				],
			},
			{
				id: 'shared-subfolder-2',
				label: 'DevOps Team',
				type: 'folder',
				children: [
					{
						id: 'shared-subfolder-2-1',
						label: 'Infrastructure',
						type: 'folder',
						children: [
							{
								id: 'shared-subfolder-2-1-1',
								label: 'Monitoring & Alerts',
								type: 'folder',
								children: [
									{
										id: 'shared-subfolder-2-1-1-1',
										label: 'System Health',
										type: 'folder',
										children: [
											{ id: 'workflow-37', label: 'Server Health Check', type: 'workflow' },
											{
												id: 'workflow-38',
												label: 'Database Performance Monitor',
												type: 'workflow',
											},
											{ id: 'workflow-39', label: 'API Response Time Tracker', type: 'workflow' },
										],
									},
									{ id: 'workflow-40', label: 'Alert Management System', type: 'workflow' },
								],
							},
							{ id: 'workflow-41', label: 'Deployment Pipeline Monitor', type: 'workflow' },
						],
					},
					{
						id: 'shared-empty-folder',
						label: 'Archive (Empty for Testing)',
						type: 'folder',
						children: [],
					},
				],
			},
		],
	},
	{
		id: 'shared-folder-2',
		label: 'Cross-Team Initiatives',
		type: 'folder',
		children: [
			{
				id: 'shared-folder-2-1',
				label: 'Company-wide Projects',
				type: 'folder',
				children: [
					{
						id: 'shared-folder-2-1-1',
						label: 'Digital Transformation',
						type: 'folder',
						children: [
							{
								id: 'shared-folder-2-1-1-1',
								label: 'Process Automation',
								type: 'folder',
								children: [
									{
										id: 'shared-folder-2-1-1-1-1',
										label: 'HR Automation',
										type: 'folder',
										children: [
											{
												id: 'workflow-42',
												label: 'Employee Onboarding Automation',
												type: 'workflow',
											},
											{ id: 'workflow-43', label: 'Leave Request Processing', type: 'workflow' },
											{
												id: 'workflow-44',
												label: 'Performance Review Scheduler',
												type: 'workflow',
											},
										],
									},
									{ id: 'workflow-45', label: 'Finance Approval Workflows', type: 'workflow' },
								],
							},
							{ id: 'workflow-46', label: 'Digital Asset Management', type: 'workflow' },
						],
					},
					{ id: 'workflow-47', label: 'Quarterly Business Review Generator', type: 'workflow' },
				],
			},
			{ id: 'workflow-48', label: 'All-Hands Meeting Prep', type: 'workflow' },
		],
	},
	{ id: 'workflow-49', label: 'Shared Dashboard Update', type: 'workflow' },
];

const mockProjects: IMenuElement[] = [
	{
		id: 'project-1',
		label: 'E-commerce Platform',
		type: 'project',
		children: [
			{
				id: 'ecommerce-folder-1',
				label: 'Order Processing',
				type: 'folder',
				children: [
					{ id: 'workflow-9', label: 'Order Confirmation', type: 'workflow' },
					{ id: 'workflow-10', label: 'Inventory Update', type: 'workflow' },
					{ id: 'workflow-11', label: 'Shipping Notification', type: 'workflow' },
				],
			},
			{
				id: 'ecommerce-folder-2',
				label: 'Customer Communication',
				type: 'folder',
				children: [
					{
						id: 'workflow-12',
						label: 'Welcome Email Sequence',
						type: 'workflow',
					},
					{
						id: 'workflow-13',
						label: 'Abandoned Cart Recovery',
						type: 'workflow',
					},
				],
			},
		],
	},
	{
		id: 'project-2',
		label: 'Marketing Automation',
		type: 'project',
		children: [
			{ id: 'workflow-14', label: 'Lead Scoring', type: 'workflow' },
			{
				id: 'workflow-15',
				label: 'Campaign Performance Tracker',
				type: 'workflow',
			},
			{
				id: 'marketing-folder-1',
				label: 'Social Media',
				type: 'folder',
				children: [
					{ id: 'workflow-16', label: 'Auto Post Scheduler', type: 'workflow' },
					{ id: 'workflow-17', label: 'Engagement Tracker', type: 'workflow' },
				],
			},
		],
	},
	{
		id: 'project-3',
		label: 'Stress Test - Deep Nesting',
		type: 'project',
		children: [
			{
				id: 'stress-test-folder',
				label: 'Level 1 - Root Organization',
				type: 'folder',
				children: [
					{
						id: 'stress-level-2',
						label: 'Level 2 - Department Structure',
						type: 'folder',
						children: [
							{
								id: 'stress-level-3',
								label:
									'Level 3 - Team Subdivisions with Very Long Descriptive Names That Test UI Wrapping',
								type: 'folder',
								children: [
									{
										id: 'stress-level-4',
										label:
											'Level 4 - Project Categories and Workflow Types for Complex Business Process Management',
										type: 'folder',
										children: [
											{
												id: 'stress-level-5',
												label:
													'Level 5 - Specific Implementation Details and Granular Task Definitions',
												type: 'folder',
												children: [
													{
														id: 'stress-level-6',
														label:
															'Level 6 - Final Implementation Layer with Atomic Workflow Components',
														type: 'folder',
														children: [
															{
																id: 'stress-workflow-1',
																label: 'Ultra-Deep Nested Workflow #1 - Data Processing Pipeline',
																type: 'workflow',
															},
															{
																id: 'stress-workflow-2',
																label: 'Ultra-Deep Nested Workflow #2 - Error Handling System',
																type: 'workflow',
															},
															{
																id: 'stress-workflow-3',
																label:
																	'Ultra-Deep Nested Workflow #3 - Performance Monitoring Suite',
																type: 'workflow',
															},
														],
													},
													{
														id: 'stress-workflow-4',
														label: 'Level 5 Direct Workflow - Integration Manager',
														type: 'workflow',
													},
												],
											},
											{
												id: 'stress-workflow-5',
												label: 'Level 4 Direct Workflow - Configuration Handler',
												type: 'workflow',
											},
										],
									},
									{
										id: 'stress-level-4-alternate',
										label: 'Level 4 Alternate - Another Deep Branch for Comprehensive Testing',
										type: 'folder',
										children: [
											{
												id: 'stress-empty-deep',
												label: 'Empty Folder at Level 5 - Testing Edge Cases',
												type: 'folder',
												children: [],
											},
											{
												id: 'stress-workflow-6',
												label: 'Alternative Branch Workflow - Backup Systems',
												type: 'workflow',
											},
										],
									},
								],
							},
							{
								id: 'stress-parallel-branch',
								label: 'Level 3 Parallel Branch - Additional Complexity',
								type: 'folder',
								children: [
									{
										id: 'stress-workflow-7',
										label: 'Parallel Branch Workflow - Load Balancer',
										type: 'workflow',
									},
									{
										id: 'stress-workflow-8',
										label: 'Parallel Branch Workflow - Cache Manager',
										type: 'workflow',
									},
								],
							},
						],
					},
					{
						id: 'stress-many-items',
						label: 'Level 2 - Folder with Many Direct Children',
						type: 'folder',
						children: [
							{
								id: 'many-workflow-1',
								label: 'Bulk Test Workflow #01 - First in Series',
								type: 'workflow',
							},
							{
								id: 'many-workflow-2',
								label: 'Bulk Test Workflow #02 - Second in Series',
								type: 'workflow',
							},
							{
								id: 'many-workflow-3',
								label: 'Bulk Test Workflow #03 - Third in Series',
								type: 'workflow',
							},
							{
								id: 'many-workflow-4',
								label: 'Bulk Test Workflow #04 - Fourth in Series',
								type: 'workflow',
							},
							{
								id: 'many-workflow-5',
								label: 'Bulk Test Workflow #05 - Fifth in Series',
								type: 'workflow',
							},
							{
								id: 'many-workflow-6',
								label: 'Bulk Test Workflow #06 - Sixth in Series',
								type: 'workflow',
							},
							{
								id: 'many-workflow-7',
								label: 'Bulk Test Workflow #07 - Seventh in Series',
								type: 'workflow',
							},
							{
								id: 'many-workflow-8',
								label: 'Bulk Test Workflow #08 - Eighth in Series',
								type: 'workflow',
							},
							{
								id: 'many-workflow-9',
								label: 'Bulk Test Workflow #09 - Ninth in Series',
								type: 'workflow',
							},
							{
								id: 'many-workflow-10',
								label: 'Bulk Test Workflow #10 - Tenth in Series',
								type: 'workflow',
							},
							{
								id: 'many-subfolder-1',
								label: 'Subfolder Within Many Items - Testing Mixed Content',
								type: 'folder',
								children: [
									{
										id: 'nested-many-1',
										label: 'Nested Within Many - Workflow A',
										type: 'workflow',
									},
									{
										id: 'nested-many-2',
										label: 'Nested Within Many - Workflow B',
										type: 'workflow',
									},
								],
							},
							{
								id: 'many-workflow-11',
								label: 'Bulk Test Workflow #11 - Eleventh in Series',
								type: 'workflow',
							},
							{
								id: 'many-workflow-12',
								label: 'Bulk Test Workflow #12 - Final in Series',
								type: 'workflow',
							},
						],
					},
				],
			},
			{
				id: 'edge-cases-folder',
				label: 'Edge Cases Testing',
				type: 'folder',
				children: [
					{
						id: 'empty-folder-test-1',
						label: 'Empty Folder Test #1',
						type: 'folder',
						children: [],
					},
					{
						id: 'empty-folder-test-2',
						label: 'Empty Folder Test #2 with Longer Name for UI Testing',
						type: 'folder',
						children: [],
					},
					{
						id: 'single-item-folder',
						label: 'Single Item Folder',
						type: 'folder',
						children: [
							{
								id: 'single-workflow',
								label: 'Lonely Workflow in Single Item Folder',
								type: 'workflow',
							},
						],
					},
				],
			},
		],
	},
];

function generateRandomItems(
	depth: number = 0,
	maxDepth: number = 5,
	parentId: string = '',
): IMenuItem[] {
	const items: IMenuItem[] = [];

	if (depth >= maxDepth) {
		// At max depth, only create workflows
		const workflowCount = Math.floor(Math.random() * 5) + 1;
		for (let i = 0; i < workflowCount; i++) {
			items.push({
				id: `${parentId}-workflow-${i}-${Date.now()}-${Math.random()}`,
				label: `Workflow ${i + 1}`,
				type: 'workflow',
			});
		}
		return items;
	}

	// Randomly decide how many items at this level
	const itemCount = Math.floor(Math.random() * 8) + 2;

	for (let i = 0; i < itemCount; i++) {
		const isFolder = Math.random() > 0.3 && depth < maxDepth - 1;
		const itemId = `${parentId}-item-${i}-${Date.now()}-${Math.random()}`;

		if (isFolder) {
			// Create a folder with children
			const children = generateRandomItems(depth + 1, maxDepth, itemId);
			items.push({
				id: itemId,
				label: `Folder ${i + 1}`,
				type: 'folder',
				icon: 'folder',
				children: children.length > 0 ? children : undefined,
			});
		} else {
			// Create a workflow
			items.push({
				id: itemId,
				label: `Workflow ${i + 1}`,
				type: 'workflow',
			});
		}
	}

	return items;
}

function generateMockData(totalItems: number = 10000): IMenuItem[] {
	const items: IMenuElement[] = [];
	let currentItems = 0;

	// Add some subtitle and empty state items

	// Generate random nested structure
	while (currentItems < totalItems) {
		const batchItems = generateRandomItems(0, Math.floor(Math.random() * 4) + 2);
		items.push(...batchItems);
		currentItems += countTotalItems(batchItems);
	}

	// Add some empty folders for testing
	items.push({
		id: 'empty-folder-test',
		label: 'Empty Folder',
		type: 'folder',
		children: [],
	});

	return [
		{
			id: 'personal',
			label: 'Personal',
			icon: 'user',
			children: items,
		},
	];
}

function countTotalItems(items: IMenuItem[]): number {
	let count = items.length;
	for (const item of items) {
		if (item.children) {
			count += countTotalItems(item.children as IMenuItem[]);
		}
	}
	return count;
}

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		N8nSidebar,
	},
	template: `
		<div class="story" style="height: 100vh; display: flex;">
			<N8nSidebar v-bind="args" />
		</div>
	`,
});

export const primary = Template.bind({});
primary.args = {
	items: [mockSharedItems],
	bottomItems: [
		{ id: 'settings', label: 'Settings', icon: 'cog', type: 'other' as const },
		{ id: 'help', label: 'Help', icon: 'question-circle', type: 'other' as const },
	],
	userName: 'John Doe',
	releaseChannel: 'stable',
	helpItems: [
		{
			id: 'docs',
			label: 'Documentation',
			children: [
				{ id: 'docs-1', label: 'Getting Started', link: { href: '#' } },
				{ id: 'docs-2', label: 'API Reference', link: { href: '#' } },
			],
		},
	],
};

export const withVirtualization = Template.bind({});
withVirtualization.args = {
	items: generateMockData(10000),
	bottomItems: [
		{ id: 'settings', label: 'Settings', icon: 'cog', type: 'other' as const },
		{ id: 'help', label: 'Help', icon: 'question-circle', type: 'other' as const },
	],
	userName: 'Test User',
	releaseChannel: 'stable',
	helpItems: [
		{
			id: 'docs',
			label: 'Documentation',
			children: [
				{ id: 'docs-1', label: 'Getting Started', link: { href: '#' } },
				{ id: 'docs-2', label: 'API Reference', link: { href: '#' } },
			],
		},
	],
};

export const withProjects = Template.bind({});
withProjects.args = {
	items: mockProjects,
	bottomItems: [
		{ id: 'settings', label: 'Settings', icon: 'cog', type: 'other' as const },
		{ id: 'help', label: 'Help', icon: 'question-circle', type: 'other' as const },
	],
	userName: 'Project Manager',
	releaseChannel: 'stable',
	helpItems: [
		{
			id: 'docs',
			label: 'Documentation',
			children: [
				{ id: 'docs-1', label: 'Getting Started', link: { href: '#' } },
				{ id: 'docs-2', label: 'API Reference', link: { href: '#' } },
			],
		},
	],
};
