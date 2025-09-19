import type { Driver, TableColumnOptions } from '@n8n/typeorm';

export class Column {
	private type:
		| 'int'
		| 'boolean'
		| 'varchar'
		| 'text'
		| 'json'
		| 'timestamptz'
		| 'timestamp'
		| 'uuid'
		| 'double';

	private isGenerated = false;

	private isGenerated2 = false;

	private isNullable = true;

	private isPrimary = false;

	private length: number | 'auto';

	private defaultValue: unknown;

	private primaryKeyConstraintName: string | undefined;

	private commentValue: string | undefined;

	constructor(private name: string) {}

	get bool() {
		this.type = 'boolean';
		return this;
	}

	get int() {
		this.type = 'int';
		return this;
	}

	get double() {
		this.type = 'double';
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

	/**
	 * @deprecated use `timestampTimezone` instead
	 **/
	timestamp(msPrecision = 3) {
		this.type = 'timestamptz';
		this.length = msPrecision ?? 'auto';
		return this;
	}

	timestampTimezone(msPrecision = 3) {
		this.type = 'timestamptz';
		this.length = msPrecision ?? 'auto';
		return this;
	}

	timestampNoTimezone(msPrecision = 3) {
		this.type = 'timestamp';
		this.length = msPrecision ?? 'auto';
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

	primaryWithName(name?: string) {
		this.isPrimary = true;
		this.primaryKeyConstraintName = name;
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

	/**
	 * @deprecated, use autoGenerate2 instead
	 **/
	get autoGenerate() {
		this.isGenerated = true;
		return this;
	}

	/**
	 * Prefers `identity` over `increment` (which turns to `serial` for pg)
	 * See https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_serial
	 **/
	get autoGenerate2() {
		this.isGenerated2 = true;
		return this;
	}

	comment(comment: string) {
		this.commentValue = comment;
		return this;
	}

	toOptions(driver: Driver): TableColumnOptions {
		const {
			name,
			type,
			isNullable,
			isPrimary,
			isGenerated,
			isGenerated2,
			length,
			primaryKeyConstraintName,
		} = this;
		const isMysql = 'mysql' in driver;
		const isPostgres = 'postgres' in driver;
		const isSqlite = 'sqlite' in driver;

		const options: TableColumnOptions = {
			primaryKeyConstraintName,
			name,
			isNullable,
			isPrimary,
			type,
		};

		if (options.type === 'int' && isSqlite) {
			options.type = 'integer';
		} else if (type === 'boolean' && isMysql) {
			options.type = 'tinyint(1)';
		} else if (type === 'timestamptz') {
			options.type = isPostgres ? 'timestamptz' : 'datetime';
		} else if (type === 'timestamp') {
			options.type = isPostgres ? 'timestamp' : 'datetime';
		} else if (type === 'json' && isSqlite) {
			options.type = 'text';
		} else if (type === 'uuid') {
			// mysql does not support uuid type
			if (isMysql) options.type = 'varchar(36)';
			// we haven't been defining length on "uuid" varchar on sqlite
			if (isSqlite) options.type = 'varchar';
		} else if (type === 'double') {
			if (isPostgres) {
				options.type = 'double precision';
			} else if (isMysql) {
				options.type = 'double';
			} else if (isSqlite) {
				options.type = 'real';
			}
		}

		if (
			(type === 'varchar' || type === 'timestamptz' || type === 'timestamp') &&
			length !== 'auto'
		) {
			options.type = `${options.type}(${length})`;
		}

		if (isGenerated) {
			options.isGenerated = true;
			options.generationStrategy = type === 'uuid' ? 'uuid' : 'increment';
		}

		if (isGenerated2) {
			options.isGenerated = true;
			options.generationStrategy = type === 'uuid' ? 'uuid' : isMysql ? 'increment' : 'identity';
		}

		if (isPrimary || isGenerated || isGenerated2) {
			options.isNullable = false;
		}

		if (this.defaultValue !== undefined) {
			if ((type === 'timestamptz' || type === 'timestamp') && this.defaultValue === 'NOW()') {
				options.default = isSqlite
					? "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')"
					: 'CURRENT_TIMESTAMP(3)';
			} else {
				options.default = this.defaultValue;
			}
		}

		if (this.commentValue) {
			options.comment = this.commentValue;
		}

		return options;
	}
}
