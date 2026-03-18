import {
	getSubAgentMemoryTemplate,
	MEMORY_ENABLED_ROLES,
	BUILDER_MEMORY_TEMPLATE,
	DEBUGGER_MEMORY_TEMPLATE,
	DATA_TABLE_MEMORY_TEMPLATE,
} from '../sub-agent-memory-templates';

describe('getSubAgentMemoryTemplate', () => {
	it('returns template for workflow-builder', () => {
		expect(getSubAgentMemoryTemplate('workflow-builder')).toBe(BUILDER_MEMORY_TEMPLATE);
	});

	it('returns template for execution-debugger', () => {
		expect(getSubAgentMemoryTemplate('execution-debugger')).toBe(DEBUGGER_MEMORY_TEMPLATE);
	});

	it('returns template for data-table-manager', () => {
		expect(getSubAgentMemoryTemplate('data-table-manager')).toBe(DATA_TABLE_MEMORY_TEMPLATE);
	});

	it('returns undefined for unknown roles', () => {
		expect(getSubAgentMemoryTemplate('random-role')).toBeUndefined();
		expect(getSubAgentMemoryTemplate('')).toBeUndefined();
	});
});

describe('MEMORY_ENABLED_ROLES', () => {
	it('contains all template roles', () => {
		expect(MEMORY_ENABLED_ROLES.has('workflow-builder')).toBe(true);
		expect(MEMORY_ENABLED_ROLES.has('execution-debugger')).toBe(true);
		expect(MEMORY_ENABLED_ROLES.has('data-table-manager')).toBe(true);
	});

	it('does not contain non-template roles', () => {
		expect(MEMORY_ENABLED_ROLES.has('random')).toBe(false);
	});

	it('has exactly 3 roles', () => {
		expect(MEMORY_ENABLED_ROLES.size).toBe(3);
	});
});

describe('template content', () => {
	it('builder template has key sections', () => {
		expect(BUILDER_MEMORY_TEMPLATE).toContain('# Credential Map');
		expect(BUILDER_MEMORY_TEMPLATE).toContain('# Node Gotchas');
		expect(BUILDER_MEMORY_TEMPLATE).toContain('# Workflow Topology');
		expect(BUILDER_MEMORY_TEMPLATE).toContain('# Recurring Errors & Fixes');
		expect(BUILDER_MEMORY_TEMPLATE).toContain('# User Conventions');
		expect(BUILDER_MEMORY_TEMPLATE).toContain('# SDK & Build Patterns');
	});

	it('debugger template has key sections', () => {
		expect(DEBUGGER_MEMORY_TEMPLATE).toContain('# Known Failure Patterns');
		expect(DEBUGGER_MEMORY_TEMPLATE).toContain('# Credential & Auth Issues');
		expect(DEBUGGER_MEMORY_TEMPLATE).toContain('# Environment Quirks');
		expect(DEBUGGER_MEMORY_TEMPLATE).toContain('# Workflow Health');
	});

	it('data table template has key sections', () => {
		expect(DATA_TABLE_MEMORY_TEMPLATE).toContain('# Table Inventory');
		expect(DATA_TABLE_MEMORY_TEMPLATE).toContain('# Schema Patterns');
		expect(DATA_TABLE_MEMORY_TEMPLATE).toContain('# Query Patterns');
	});
});
