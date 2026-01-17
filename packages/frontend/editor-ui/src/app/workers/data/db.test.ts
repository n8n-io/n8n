import { describe, it, expect } from 'vitest';
import { databaseSchema, getAllTableSchemas, getTableSchema } from './db';

describe('Data Worker Database Schema', () => {
	describe('databaseSchema', () => {
		it('should have all expected tables defined', () => {
			expect(databaseSchema.tables).toHaveProperty('executions');
			expect(databaseSchema.tables).toHaveProperty('nodeTypes');
			expect(databaseSchema.tables).toHaveProperty('credentials');
			expect(databaseSchema.tables).toHaveProperty('workflows');
		});

		it('should have exactly 4 tables', () => {
			expect(Object.keys(databaseSchema.tables)).toHaveLength(4);
		});

		describe('executions table', () => {
			it('should have correct name', () => {
				expect(databaseSchema.tables.executions.name).toBe('executions');
			});

			it('should have CREATE TABLE statement', () => {
				expect(databaseSchema.tables.executions.schema).toContain(
					'CREATE TABLE IF NOT EXISTS executions',
				);
			});

			it('should have required columns', () => {
				const schema = databaseSchema.tables.executions.schema;
				expect(schema).toContain('id TEXT PRIMARY KEY');
				expect(schema).toContain('workflow_id TEXT NOT NULL');
				expect(schema).toContain('data TEXT NOT NULL');
				expect(schema).toContain('workflow TEXT NOT NULL');
				expect(schema).toContain('created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
			});

			it('should have indexes for workflow_id and created_at', () => {
				const schema = databaseSchema.tables.executions.schema;
				expect(schema).toContain(
					'CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON executions(workflow_id)',
				);
				expect(schema).toContain(
					'CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at)',
				);
			});
		});

		describe('nodeTypes table', () => {
			it('should have correct name', () => {
				expect(databaseSchema.tables.nodeTypes.name).toBe('nodeTypes');
			});

			it('should have CREATE TABLE statement', () => {
				expect(databaseSchema.tables.nodeTypes.schema).toContain(
					'CREATE TABLE IF NOT EXISTS nodeTypes',
				);
			});

			it('should have required columns', () => {
				const schema = databaseSchema.tables.nodeTypes.schema;
				expect(schema).toContain('id TEXT PRIMARY KEY');
				expect(schema).toContain('data TEXT NOT NULL');
				expect(schema).toContain('updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
			});
		});

		describe('credentials table', () => {
			it('should have correct name', () => {
				expect(databaseSchema.tables.credentials.name).toBe('credentials');
			});

			it('should have CREATE TABLE statement', () => {
				expect(databaseSchema.tables.credentials.schema).toContain(
					'CREATE TABLE IF NOT EXISTS credentials',
				);
			});

			it('should have required columns', () => {
				const schema = databaseSchema.tables.credentials.schema;
				expect(schema).toContain('id TEXT PRIMARY KEY');
				expect(schema).toContain('data TEXT NOT NULL');
				expect(schema).toContain('updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
			});
		});

		describe('workflows table', () => {
			it('should have correct name', () => {
				expect(databaseSchema.tables.workflows.name).toBe('workflows');
			});

			it('should have CREATE TABLE statement', () => {
				expect(databaseSchema.tables.workflows.schema).toContain(
					'CREATE TABLE IF NOT EXISTS workflows',
				);
			});

			it('should have required columns', () => {
				const schema = databaseSchema.tables.workflows.schema;
				expect(schema).toContain('id TEXT PRIMARY KEY');
				expect(schema).toContain('data TEXT NOT NULL');
				expect(schema).toContain('updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
			});

			it('should have index for updated_at', () => {
				const schema = databaseSchema.tables.workflows.schema;
				expect(schema).toContain(
					'CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON workflows(updated_at)',
				);
			});
		});
	});

	describe('getAllTableSchemas', () => {
		it('should return an array of schemas', () => {
			const schemas = getAllTableSchemas();
			expect(Array.isArray(schemas)).toBe(true);
		});

		it('should return 4 schemas (one for each table)', () => {
			const schemas = getAllTableSchemas();
			expect(schemas).toHaveLength(4);
		});

		it('should return strings containing CREATE TABLE statements', () => {
			const schemas = getAllTableSchemas();
			schemas.forEach((schema) => {
				expect(typeof schema).toBe('string');
				expect(schema).toContain('CREATE TABLE IF NOT EXISTS');
			});
		});

		it('should include schema for all tables', () => {
			const schemas = getAllTableSchemas();
			const joinedSchemas = schemas.join(' ');

			expect(joinedSchemas).toContain('executions');
			expect(joinedSchemas).toContain('nodeTypes');
			expect(joinedSchemas).toContain('credentials');
			expect(joinedSchemas).toContain('workflows');
		});

		it('should return a new array on each call', () => {
			const schemas1 = getAllTableSchemas();
			const schemas2 = getAllTableSchemas();

			expect(schemas1).not.toBe(schemas2);
			expect(schemas1).toEqual(schemas2);
		});
	});

	describe('getTableSchema', () => {
		it('should return the executions table schema', () => {
			const schema = getTableSchema('executions');

			expect(schema).toContain('CREATE TABLE IF NOT EXISTS executions');
			expect(schema).toBe(databaseSchema.tables.executions.schema);
		});

		it('should return the nodeTypes table schema', () => {
			const schema = getTableSchema('nodeTypes');

			expect(schema).toContain('CREATE TABLE IF NOT EXISTS nodeTypes');
			expect(schema).toBe(databaseSchema.tables.nodeTypes.schema);
		});

		it('should return the credentials table schema', () => {
			const schema = getTableSchema('credentials');

			expect(schema).toContain('CREATE TABLE IF NOT EXISTS credentials');
			expect(schema).toBe(databaseSchema.tables.credentials.schema);
		});

		it('should return the workflows table schema', () => {
			const schema = getTableSchema('workflows');

			expect(schema).toContain('CREATE TABLE IF NOT EXISTS workflows');
			expect(schema).toBe(databaseSchema.tables.workflows.schema);
		});

		it('should return a string', () => {
			const tableNames = ['executions', 'nodeTypes', 'credentials', 'workflows'] as const;

			tableNames.forEach((tableName) => {
				const schema = getTableSchema(tableName);
				expect(typeof schema).toBe('string');
			});
		});
	});
});
