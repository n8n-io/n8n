import type { StoryFn } from '@storybook/vue3';

import Sidebar from './Sidebar.vue';
import { type TreeItemType } from '.';

export default {
	title: 'Sidebar/Sidebar',
	component: Sidebar,
};

const mockPersonalItems: TreeItemType[] = [
	{
		id: 'personal-folder-1',
		label: 'Customer Management',
		type: 'folder',
		children: [
			{
				id: 'personal-subfolder-1',
				label: 'Onboarding Processes',
				type: 'folder',
				children: [
					{
						id: 'personal-subfolder-1-1',
						label: 'New Customer Flows',
						type: 'folder',
						children: [
							{
								id: 'personal-subfolder-1-1-1',
								label: 'Enterprise Customers',
								type: 'folder',
								children: [
									{ id: 'workflow-1', label: 'Enterprise Customer Onboarding', type: 'workflow' },
									{ id: 'workflow-2', label: 'Enterprise Account Setup', type: 'workflow' },
									{ id: 'workflow-3', label: 'Enterprise Training Schedule', type: 'workflow' },
								],
							},
							{
								id: 'personal-subfolder-1-1-2',
								label: 'Small Business Customers',
								type: 'folder',
								children: [
									{ id: 'workflow-4', label: 'SMB Quick Onboarding', type: 'workflow' },
									{ id: 'workflow-5', label: 'SMB Account Verification', type: 'workflow' },
								],
							},
						],
					},
					{
						id: 'personal-subfolder-1-2',
						label: 'Returning Customer Flows',
						type: 'folder',
						children: [
							{ id: 'workflow-6', label: 'Account Reactivation', type: 'workflow' },
							{ id: 'workflow-7', label: 'Update Customer Info', type: 'workflow' },
						],
					},
				],
			},
			{
				id: 'personal-subfolder-2',
				label: 'Support Operations',
				type: 'folder',
				children: [
					{
						id: 'personal-subfolder-2-1',
						label: 'Ticket Management',
						type: 'folder',
						children: [
							{
								id: 'personal-subfolder-2-1-1',
								label: 'Priority Handling',
								type: 'folder',
								children: [
									{ id: 'workflow-8', label: 'Critical Issue Handler', type: 'workflow' },
									{ id: 'workflow-9', label: 'Urgent Escalation', type: 'workflow' },
								],
							},
							{ id: 'workflow-10', label: 'General Support Tickets', type: 'workflow' },
						],
					},
					{ id: 'workflow-11', label: 'Customer Satisfaction Survey', type: 'workflow' },
				],
			},
		],
	},
	{
		id: 'personal-folder-2',
		label: 'Analytics & Reporting',
		type: 'folder',
		children: [
			{
				id: 'personal-analytics-1',
				label: 'Sales Analytics',
				type: 'folder',
				children: [
					{
						id: 'personal-analytics-1-1',
						label: 'Daily Reports',
						type: 'folder',
						children: [
							{
								id: 'personal-analytics-1-1-1',
								label: 'Revenue Tracking',
								type: 'folder',
								children: [
									{
										id: 'personal-analytics-1-1-1-1',
										label: 'Product Line Analysis',
										type: 'folder',
										children: [
											{ id: 'workflow-12', label: 'Software Revenue', type: 'workflow' },
											{ id: 'workflow-13', label: 'Service Revenue', type: 'workflow' },
											{ id: 'workflow-14', label: 'Subscription Revenue', type: 'workflow' },
										],
									},
									{ id: 'workflow-15', label: 'Daily Revenue Report', type: 'workflow' },
								],
							},
							{ id: 'workflow-16', label: 'Sales Performance', type: 'workflow' },
						],
					},
					{
						id: 'personal-analytics-1-2',
						label: 'Weekly Reports',
						type: 'folder',
						children: [
							{ id: 'workflow-17', label: 'Weekly Sales Summary', type: 'workflow' },
							{ id: 'workflow-18', label: 'Team Performance Review', type: 'workflow' },
						],
					},
				],
			},
			{
				id: 'personal-analytics-2',
				label: 'User Analytics',
				type: 'folder',
				children: [
					{
						id: 'personal-analytics-2-1',
						label: 'Behavior Analysis',
						type: 'folder',
						children: [
							{ id: 'workflow-19', label: 'User Activity Analysis', type: 'workflow' },
							{ id: 'workflow-20', label: 'Feature Usage Tracking', type: 'workflow' },
						],
					},
				],
			},
		],
	},
	{
		id: 'personal-folder-3',
		label: 'Development & Testing',
		type: 'folder',
		children: [
			{
				id: 'personal-dev-1',
				label: 'Automated Testing',
				type: 'folder',
				children: [
					{
						id: 'personal-dev-1-1',
						label: 'Unit Tests',
						type: 'folder',
						children: [
							{
								id: 'personal-dev-1-1-1',
								label: 'Frontend Tests',
								type: 'folder',
								children: [
									{
										id: 'personal-dev-1-1-1-1',
										label: 'Component Tests',
										type: 'folder',
										children: [
											{ id: 'workflow-21', label: 'Button Component Test', type: 'workflow' },
											{ id: 'workflow-22', label: 'Form Component Test', type: 'workflow' },
											{ id: 'workflow-23', label: 'Modal Component Test', type: 'workflow' },
										],
									},
									{ id: 'workflow-24', label: 'Service Tests', type: 'workflow' },
								],
							},
							{ id: 'workflow-25', label: 'Backend API Tests', type: 'workflow' },
						],
					},
					{ id: 'workflow-26', label: 'Integration Tests', type: 'workflow' },
				],
			},
			{
				id: 'personal-dev-2',
				label: 'Empty Folder Test',
				type: 'folder',
				children: [],
			},
		],
	},
	{ id: 'workflow-27', label: 'Quick Data Sync', type: 'workflow' },
];

const mockSharedItems: TreeItemType[] = [
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

const mockProjects = [
	{
		id: 'project-1',
		title: 'E-commerce Platform',
		icon: 'folder' as const,
		items: [
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
						icon: 'workflow',
					},
					{
						id: 'workflow-13',
						label: 'Abandoned Cart Recovery',
						type: 'workflow',
						icon: 'workflow',
					},
				],
			},
		] as TreeItemType[],
	},
	{
		id: 'project-2',
		title: 'Marketing Automation',
		icon: 'folder' as const,
		items: [
			{ id: 'workflow-14', label: 'Lead Scoring', type: 'workflow' },
			{
				id: 'workflow-15',
				label: 'Campaign Performance Tracker',
				type: 'workflow',
				icon: 'workflow',
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
		] as TreeItemType[],
	},
	{
		id: 'project-3',
		title: 'Stress Test - Deep Nesting',
		icon: 'folder' as const,
		items: [
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
		] as TreeItemType[],
	},
];

const Template: StoryFn = (args, { argTypes }) => ({
	setup: () => ({ args }),
	props: Object.keys(argTypes),
	components: {
		Sidebar,
	},
	template: `
		<div class="story">
			<Sidebar v-bind="args" />
		</div>
	`,
});

export const primary = Template.bind({});
primary.args = {
	personal: mockPersonalItems,
	shared: mockSharedItems,
	projects: mockProjects,
	collapsed: false,
	releaseChannel: 'stable' as const,
};

export const collapsed = Template.bind({});
collapsed.args = {
	personal: mockPersonalItems,
	shared: mockSharedItems,
	projects: mockProjects,
	collapsed: true,
	releaseChannel: 'stable' as const,
};
