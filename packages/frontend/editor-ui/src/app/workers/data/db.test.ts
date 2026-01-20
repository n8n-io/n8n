import { describe, it, expect } from 'vitest';
import { databaseSchema, getAllTableSchemas, getTableSchema } from './db';

describe('Data Worker Database Schema', () => {
	describe('databaseSchema', () => {
		it('should have nodeTypes table defined', () => {
			expect(databaseSchema.tables).toHaveProperty('nodeTypes');
		});

		it('should have exactly 1 table', () => {
			expect(Object.keys(databaseSchema.tables)).toHaveLength(1);
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
	});

	describe('getAllTableSchemas', () => {
		it('should return an array of schemas', () => {
			const schemas = getAllTableSchemas();
			expect(Array.isArray(schemas)).toBe(true);
		});

		it('should return 1 schema (one for each table)', () => {
			const schemas = getAllTableSchemas();
			expect(schemas).toHaveLength(1);
		});

		it('should return strings containing CREATE TABLE statements', () => {
			const schemas = getAllTableSchemas();
			schemas.forEach((schema) => {
				expect(typeof schema).toBe('string');
				expect(schema).toContain('CREATE TABLE IF NOT EXISTS');
			});
		});

		it('should include schema for nodeTypes table', () => {
			const schemas = getAllTableSchemas();
			const joinedSchemas = schemas.join(' ');

			expect(joinedSchemas).toContain('nodeTypes');
		});

		it('should return a new array on each call', () => {
			const schemas1 = getAllTableSchemas();
			const schemas2 = getAllTableSchemas();

			expect(schemas1).not.toBe(schemas2);
			expect(schemas1).toEqual(schemas2);
		});
	});

	describe('getTableSchema', () => {
		it('should return the nodeTypes table schema', () => {
			const schema = getTableSchema('nodeTypes');

			expect(schema).toContain('CREATE TABLE IF NOT EXISTS nodeTypes');
			expect(schema).toBe(databaseSchema.tables.nodeTypes.schema);
		});

		it('should return a string', () => {
			const schema = getTableSchema('nodeTypes');
			expect(typeof schema).toBe('string');
		});
	});
});
