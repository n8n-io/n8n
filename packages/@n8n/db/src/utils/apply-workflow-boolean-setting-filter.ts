import type { GlobalConfig } from '@n8n/config';
import type { SelectQueryBuilder } from '@n8n/typeorm';

type BooleanSettingFilterOptions = {
	alias?: string;
	method?: 'where' | 'andWhere' | 'orWhere';
	includeNullOnFalse?: boolean;
};

const VALID_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export function applyWorkflowBooleanSettingFilter<Entity extends object>(
	qb: SelectQueryBuilder<Entity>,
	globalConfig: GlobalConfig,
	key: string,
	value: boolean,
	options: BooleanSettingFilterOptions = {},
): void {
	if (!VALID_KEY_PATTERN.test(key)) {
		throw new Error(`Invalid settings key: ${key}`);
	}

	const { alias = 'workflow', method = 'andWhere', includeNullOnFalse = false } = options;
	const dbType = globalConfig.database.type;
	const settingsColumn = `${alias}.settings`;
	const parameterName = key;

	if (value) {
		// When filtering for true, only match explicit true values.
		if (dbType === 'postgresdb') {
			qb[method](`${settingsColumn} ->> '${key}' = :${parameterName}`, {
				[parameterName]: 'true',
			});
		} else if (dbType === 'sqlite') {
			qb[method](`JSON_EXTRACT(${settingsColumn}, '$.${key}') = :${parameterName}`, {
				[parameterName]: 1,
			});
		}
	} else if (dbType === 'postgresdb') {
		// Optionally treat null/undefined the same as false for settings that default to off.
		const nullClause = includeNullOnFalse ? ` OR ${settingsColumn} ->> '${key}' IS NULL` : '';
		qb[method](`(${settingsColumn} ->> '${key}' = :${parameterName}${nullClause})`, {
			[parameterName]: 'false',
		});
	} else if (dbType === 'sqlite') {
		// SQLite stores booleans as 0/1 inside JSON_EXTRACT results.
		const extracted = `JSON_EXTRACT(${settingsColumn}, '$.${key}')`;
		const nullClause = includeNullOnFalse ? ` OR ${extracted} IS NULL` : '';
		qb[method](`(${extracted} = :${parameterName}${nullClause})`, {
			[parameterName]: 0,
		});
	}
}
