import { Container } from '@n8n/di';
import {
	NodeGovernancePolicyRepository,
	NodeCategoryRepository,
	NodeCategoryAssignmentRepository,
} from '@n8n/db';

/**
 * Seeds the database with sample Node Governance data for testing
 */
export async function seedNodeGovernance(): Promise<void> {
	const categoryRepository = Container.get(NodeCategoryRepository);
	const categoryAssignmentRepository = Container.get(NodeCategoryAssignmentRepository);
	const policyRepository = Container.get(NodeGovernancePolicyRepository);

	console.log('🌱 Seeding Node Governance data...');

	// ============================================================================
	// Categories
	// ============================================================================
	const categories = [
		{
			id: 'cat_external_01',
			name: 'External Services',
			description: 'Nodes that connect to external third-party services',
		},
		{
			id: 'cat_database_01',
			name: 'Database Operations',
			description: 'Nodes for database read/write operations',
		},
		{
			id: 'cat_filesystem_01',
			name: 'File System',
			description: 'Nodes that access the local file system',
		},
		{
			id: 'cat_network_01',
			name: 'Network & SSH',
			description: 'Nodes for network operations and SSH connections',
		},
		{
			id: 'cat_code_exec_01',
			name: 'Code Execution',
			description: 'Nodes that execute arbitrary code',
		},
	];

	for (const category of categories) {
		const existing = await categoryRepository.findOne({ where: { id: category.id } });
		if (!existing) {
			await categoryRepository.save(category);
			console.log(`  ✓ Created category: ${category.name}`);
		} else {
			console.log(`  - Category exists: ${category.name}`);
		}
	}

	// ============================================================================
	// Category Assignments
	// ============================================================================
	const categoryAssignments = [
		// External Services
		{ nodeType: 'n8n-nodes-base.httpRequest', categoryId: 'cat_external_01' },
		{ nodeType: 'n8n-nodes-base.webhook', categoryId: 'cat_external_01' },
		{ nodeType: 'n8n-nodes-base.slack', categoryId: 'cat_external_01' },
		{ nodeType: 'n8n-nodes-base.gmail', categoryId: 'cat_external_01' },
		{ nodeType: 'n8n-nodes-base.googleSheets', categoryId: 'cat_external_01' },
		{ nodeType: 'n8n-nodes-base.microsoftTeams', categoryId: 'cat_external_01' },
		// Database Operations
		{ nodeType: 'n8n-nodes-base.postgres', categoryId: 'cat_database_01' },
		{ nodeType: 'n8n-nodes-base.mysql', categoryId: 'cat_database_01' },
		{ nodeType: 'n8n-nodes-base.mongodb', categoryId: 'cat_database_01' },
		{ nodeType: 'n8n-nodes-base.redis', categoryId: 'cat_database_01' },
		{ nodeType: 'n8n-nodes-base.mssql', categoryId: 'cat_database_01' },
		// File System
		{ nodeType: 'n8n-nodes-base.readWriteFile', categoryId: 'cat_filesystem_01' },
		{ nodeType: 'n8n-nodes-base.localFileTrigger', categoryId: 'cat_filesystem_01' },
		{ nodeType: 'n8n-nodes-base.ftp', categoryId: 'cat_filesystem_01' },
		{ nodeType: 'n8n-nodes-base.sftp', categoryId: 'cat_filesystem_01' },
		// Network & SSH
		{ nodeType: 'n8n-nodes-base.ssh', categoryId: 'cat_network_01' },
		{ nodeType: 'n8n-nodes-base.executeCommand', categoryId: 'cat_network_01' },
		// Code Execution
		{ nodeType: 'n8n-nodes-base.code', categoryId: 'cat_code_exec_01' },
		{ nodeType: 'n8n-nodes-base.function', categoryId: 'cat_code_exec_01' },
		{ nodeType: 'n8n-nodes-base.functionItem', categoryId: 'cat_code_exec_01' },
	];

	for (const assignment of categoryAssignments) {
		const existing = await categoryAssignmentRepository.findOne({
			where: { nodeType: assignment.nodeType, categoryId: assignment.categoryId },
		});
		if (!existing) {
			await categoryAssignmentRepository.save(assignment);
			console.log(`  ✓ Assigned ${assignment.nodeType} to category`);
		}
	}

	// ============================================================================
	// Policies
	// ============================================================================
	const policies = [
		// Global Block Policies
		{
			id: 'pol_ssh_block_01',
			name: 'Block SSH Node Globally',
			nodeType: 'n8n-nodes-base.ssh',
			action: 'block' as const,
			isGlobal: true,
			categoryId: null,
		},
		{
			id: 'pol_exec_block_01',
			name: 'Block Execute Command Globally',
			nodeType: 'n8n-nodes-base.executeCommand',
			action: 'block' as const,
			isGlobal: true,
			categoryId: null,
		},
		// Global Allow Policies
		{
			id: 'pol_http_allow_01',
			name: 'Allow HTTP Request Globally',
			nodeType: 'n8n-nodes-base.httpRequest',
			action: 'allow' as const,
			isGlobal: true,
			categoryId: null,
		},
		{
			id: 'pol_slack_allow_01',
			name: 'Allow Slack Globally',
			nodeType: 'n8n-nodes-base.slack',
			action: 'allow' as const,
			isGlobal: true,
			categoryId: null,
		},
		{
			id: 'pol_gmail_allow_01',
			name: 'Allow Gmail Globally',
			nodeType: 'n8n-nodes-base.gmail',
			action: 'allow' as const,
			isGlobal: true,
			categoryId: null,
		},
		// Category-based Block Policy
		{
			id: 'pol_code_block_01',
			name: 'Block Code Execution Category',
			nodeType: '*',
			action: 'block' as const,
			isGlobal: true,
			categoryId: 'cat_code_exec_01',
		},
	];

	for (const policy of policies) {
		const existing = await policyRepository.findOne({ where: { id: policy.id } });
		if (!existing) {
			await policyRepository.save(policy);
			console.log(`  ✓ Created policy: ${policy.name}`);
		} else {
			console.log(`  - Policy exists: ${policy.name}`);
		}
	}

	console.log('✅ Node Governance seeding complete!');
	console.log('');
	console.log('Summary:');
	console.log('  - 5 categories created');
	console.log('  - 20 node-to-category assignments');
	console.log('  - 6 policies (2 block, 3 allow, 1 category-based block)');
	console.log('');
	console.log('Expected behavior:');
	console.log('  - SSH, Execute Command: BLOCKED globally');
	console.log('  - Code, Function nodes: BLOCKED via Code Execution category');
	console.log('  - HTTP Request, Slack, Gmail: ALLOWED explicitly');
	console.log('  - Other nodes: ALLOWED by default');
}
