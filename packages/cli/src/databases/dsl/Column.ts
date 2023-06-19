import type { Driver, TableColumnOptions } from 'typeorm';

export class Column {
	private type: 'int' | 'boolean' | 'varchar' | 'text' | 'json' | 'timestamp' | 'uuid';

	private isGenerated = false;

	private isNullable = true;

	private isPrimary = false;

	private length: number | 'auto';

	private defaultValue: unknown;

	constructor(private name: string) {}

	get bool() {
		this.type = 'boolean';
		return this;
	}

	get int() {
		this.type = 'int';
		return this;
	}

	varchar(length?: number) {
		this.type = 'varchar';
		this.length = length ?? 'auto';
		return this;
	}

	get text() {
		this.type = 'text';
		return this;
	}

	get json() {
		this.type = 'json';
		return this;
	}

	timestamp(length?: number) {
		this.type = 'timestamp';
		this.length = length ?? 'auto';
		return this;
	}

	get uuid() {
		this.type = 'uuid';
		return this;
	}

	get primary() {
		this.isPrimary = true;
		return this;
	}

	get notNull() {
		this.isNullable = false;
		return this;
	}

	default(value: unknown) {
		this.defaultValue = value;
		return this;
	}

	get autoGenerate() {
		this.isGenerated = true;
		return this;
	}

	toOptions(driver: Driver): TableColumnOptions {
		const { name, type, isNullable, isPrimary, isGenerated, length } = this;
		const isMysql = 'mysql' in driver;
		const isPostgres = 'postgres' in driver;
		const isSqlite = 'sqlite' in driver;

		const options: TableColumnOptions = {
			name,
			isNullable,
			isPrimary,
			type,
		};

		if (options.type === 'int' && isSqlite) {
			options.type = 'integer';
		} else if (type === 'boolean' && isMysql) {
			options.type = 'tinyint(1)';
		} else if (type === 'timestamp' && !isPostgres) {
			options.type = 'datetime';
		} else if (type === 'json' && isSqlite) {
			options.type = 'text';
		}

		if ((type === 'varchar' || type === 'timestamp') && length !== 'auto') {
			options.type = `${options.type}(${length})`;
		}

		if (isGenerated) {
			options.isGenerated = true;
			options.generationStrategy = type === 'uuid' ? 'uuid' : 'increment';
		}

		if (isPrimary || isGenerated) {
			options.isNullable = false;
		}

		if (this.defaultValue !== undefined) {
			options.default = this.defaultValue;
		}

		return options;
	}
}
