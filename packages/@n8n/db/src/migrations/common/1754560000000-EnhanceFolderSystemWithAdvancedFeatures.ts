import type { MigrationContext, ReversibleMigration } from '../migration-types';

export class EnhanceFolderSystemWithAdvancedFeatures1754560000000 implements ReversibleMigration {
	async up({ runQuery, escape, schemaBuilder: { createTable, column } }: MigrationContext) {
		const folderTable = escape.tableName('folder');

		// Add new columns to existing folder table to support advanced organization features
		await runQuery(`
			ALTER TABLE ${folderTable} 
			ADD COLUMN ${escape.columnName('description')} TEXT NULL,
			ADD COLUMN ${escape.columnName('path')} VARCHAR(1000) NOT NULL DEFAULT '',
			ADD COLUMN ${escape.columnName('level')} INTEGER NOT NULL DEFAULT 0,
			ADD COLUMN ${escape.columnName('position')} INTEGER NOT NULL DEFAULT 0,
			ADD COLUMN ${escape.columnName('color')} VARCHAR(7) NOT NULL DEFAULT '#6366f1',
			ADD COLUMN ${escape.columnName('icon')} VARCHAR(50) NOT NULL DEFAULT 'folder',
			ADD COLUMN ${escape.columnName('createdBy')} VARCHAR(36) NULL
		`);

		// Add indexes for performance
		await runQuery(
			`CREATE INDEX ${escape.indexName('folder_path')} ON ${folderTable} (${escape.columnName('path')})`,
		);
		await runQuery(
			`CREATE INDEX ${escape.indexName('folder_level')} ON ${folderTable} (${escape.columnName('level')})`,
		);

		// Add foreign key for createdBy
		await runQuery(`
			ALTER TABLE ${folderTable} 
			ADD CONSTRAINT ${escape.indexName('folder_fk_createdBy')} 
			FOREIGN KEY (${escape.columnName('createdBy')}) 
			REFERENCES ${escape.tableName('user')} (${escape.columnName('id')}) 
			ON DELETE SET NULL
		`);

		// Create folder_permissions table
		await createTable('folder_permissions')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('folderId').varchar(36).notNull,
				column('userId').varchar(36).default(null),
				column('teamId').varchar(36).default(null),
				column('role').varchar(50).notNull,
				column('canRead').bool.notNull.default(true),
				column('canWrite').bool.notNull.default(false),
				column('canDelete').bool.notNull.default(false),
				column('canShare').bool.notNull.default(false),
				column('canExecute').bool.notNull.default(false),
				column('canCreateSubfolders').bool.notNull.default(false),
				column('inherited').bool.notNull.default(false),
				column('grantedAt').timestampTimezone().notNull,
				column('grantedBy').varchar(36).notNull,
				column('expiresAt').timestampTimezone().default(null),
			)
			.withForeignKey('folderId', {
				tableName: 'folder',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('grantedBy', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['folderId'])
			.withIndexOn(['userId'])
			.withIndexOn(['teamId']).withTimestamps;

		// Create unique constraints for folder permissions
		await runQuery(`
			CREATE UNIQUE INDEX ${escape.indexName('folder_permissions_unique_folder_user')} 
			ON ${escape.tableName('folder_permissions')} (${escape.columnName('folderId')}, ${escape.columnName('userId')}) 
			WHERE ${escape.columnName('userId')} IS NOT NULL
		`);

		await runQuery(`
			CREATE UNIQUE INDEX ${escape.indexName('folder_permissions_unique_folder_team')} 
			ON ${escape.tableName('folder_permissions')} (${escape.columnName('folderId')}, ${escape.columnName('teamId')}) 
			WHERE ${escape.columnName('teamId')} IS NOT NULL
		`);

		// Create folder_shares table for public sharing
		await createTable('folder_shares')
			.withColumns(
				column('id').varchar(36).primary.notNull,
				column('folderId').varchar(36).notNull,
				column('recipientType').varchar(50).notNull,
				column('role').varchar(50).notNull,
				column('createdBy').varchar(36).notNull,
				column('expiresAt').timestampTimezone().default(null),
				column('allowCopy').bool.notNull.default(false),
				column('allowDownload').bool.notNull.default(false),
				column('requirePassword').bool.notNull.default(false),
				column('passwordHash').text.default(null),
				column('url').text.notNull,
				column('isActive').bool.notNull.default(true),
				column('accessCount').int.notNull.default(0),
				column('lastAccessedAt').timestampTimezone().default(null),
			)
			.withForeignKey('folderId', {
				tableName: 'folder',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('createdBy', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withIndexOn(['folderId'])
			.withIndexOn(['url'], true).withTimestamps; // Unique index on URL
	}

	async down({ runQuery, escape, schemaBuilder: { dropTable } }: MigrationContext) {
		const folderTable = escape.tableName('folder');

		// Drop new tables
		await dropTable('folder_shares');
		await dropTable('folder_permissions');

		// Drop indexes
		await runQuery(`DROP INDEX IF EXISTS ${escape.indexName('folder_path')}`);
		await runQuery(`DROP INDEX IF EXISTS ${escape.indexName('folder_level')}`);

		// Remove foreign key constraint
		await runQuery(
			`ALTER TABLE ${folderTable} DROP CONSTRAINT IF EXISTS ${escape.indexName('folder_fk_createdBy')}`,
		);

		// Remove new columns from folder table
		await runQuery(`
			ALTER TABLE ${folderTable} 
			DROP COLUMN IF EXISTS ${escape.columnName('description')},
			DROP COLUMN IF EXISTS ${escape.columnName('path')},
			DROP COLUMN IF EXISTS ${escape.columnName('level')},
			DROP COLUMN IF EXISTS ${escape.columnName('position')},
			DROP COLUMN IF EXISTS ${escape.columnName('color')},
			DROP COLUMN IF EXISTS ${escape.columnName('icon')},
			DROP COLUMN IF EXISTS ${escape.columnName('createdBy')}
		`);
	}
}
