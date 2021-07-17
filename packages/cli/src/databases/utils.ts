import {
	DatabaseType,
} from '../index';
import { getConfigValueSync } from '../../src/GenericHelpers';

/**
 * Resolves the data type for the used database type
 *
 * @export
 * @param {string} dataType
 * @returns {string}
 */
export function resolveDataType(dataType: string) {
	const dbType = getConfigValueSync('database.type') as DatabaseType;

	const typeMap: { [key in DatabaseType]: { [key: string]: string } } = {
		sqlite: {
			json: 'simple-json',
		},
		postgresdb: {
			datetime: 'timestamptz',
		},
		mysqldb: {},
		mariadb: {},
	};

	return typeMap[dbType][dataType] ?? dataType;
}

export function getTimestampSyntax() {
	const dbType = getConfigValueSync('database.type') as DatabaseType;

	const map: { [key in DatabaseType]: string } = {
		sqlite: "STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')",
		postgresdb: "CURRENT_TIMESTAMP(3)",
		mysqldb: "CURRENT_TIMESTAMP(3)",
		mariadb: "CURRENT_TIMESTAMP(3)",
	};

	return map[dbType];
}

