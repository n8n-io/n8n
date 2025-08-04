'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.DbRevertMigrationCommand = void 0;
exports.main = main;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
async function main(logger, connection, migrationExecutor) {
	const executedMigrations = await migrationExecutor.getExecutedMigrations();
	const lastExecutedMigration = executedMigrations.at(0);
	if (lastExecutedMigration === undefined) {
		logger.error(
			"Cancelled command. The database was never migrated. Are you sure you're connected to the right database?.",
		);
		return;
	}
	const lastMigrationInstance = connection.migrations.find((m) => {
		const name1 = m.name ?? m.constructor.name;
		const name2 = lastExecutedMigration.name;
		return name1 === name2;
	});
	if (lastMigrationInstance === undefined) {
		logger.error(
			`The last migration that was executed is "${lastExecutedMigration.name}", but I could not find that migration's code in the currently installed version of n8n.`,
		);
		logger.error(
			'This usually means that you downgraded n8n before running `n8n db:revert`. Please upgrade n8n again and run `n8n db:revert` and then downgrade again.',
		);
		return;
	}
	if (!lastMigrationInstance.down) {
		const message = lastMigrationInstance.name
			? `Cancelled command. The last migration "${lastMigrationInstance.name}" was irreversible.`
			: 'Cancelled command. The last migration was irreversible.';
		logger.error(message);
		return;
	}
	await connection.undoLastMigration({
		transaction: lastMigrationInstance.transaction === false ? 'none' : 'each',
	});
	await connection.destroy();
}
let DbRevertMigrationCommand = class DbRevertMigrationCommand {
	constructor(logger) {
		this.logger = logger;
	}
	async run() {
		const connectionOptions = {
			...di_1.Container.get(db_1.DbConnectionOptions).getOptions(),
			subscribers: [],
			synchronize: false,
			migrationsRun: false,
			dropSchema: false,
			logging: ['query', 'error', 'schema'],
		};
		const connection = new typeorm_1.DataSource(connectionOptions);
		await connection.initialize();
		const migrationExecutor = new typeorm_1.MigrationExecutor(connection);
		connectionOptions.migrations.forEach(db_1.wrapMigration);
		return await main(this.logger, connection, migrationExecutor);
	}
	async catch(error) {
		this.logger.error('Error reverting last migration. See log messages for details.');
		this.logger.error(error.message);
	}
	async finally(error) {
		if (this.connection?.isInitialized) await this.connection.destroy();
		process.exit(error ? 1 : 0);
	}
};
exports.DbRevertMigrationCommand = DbRevertMigrationCommand;
exports.DbRevertMigrationCommand = DbRevertMigrationCommand = __decorate(
	[
		(0, decorators_1.Command)({
			name: 'db:revert',
			description: 'Revert last database migration',
		}),
		__metadata('design:paramtypes', [backend_common_1.Logger]),
	],
	DbRevertMigrationCommand,
);
//# sourceMappingURL=revert.js.map
