import {
	DatabaseType,
	GenericHelpers,
} from '../';

/**
 * Resolves the data type for the used database type
 *
 * @export
 * @param {string} dataType
 * @returns {string}
 */
export function resolveDataType(dataType: string) {
	const dbType = GenericHelpers.getConfigValueSync('database.type') as DatabaseType;

	const typeMap: { [key in DatabaseType]: { [key: string]: string } } = {
		sqlite: {
			json: 'simple-json',
		},
		postgresdb: {
			datetime: 'timestamp',
		},
		mysqldb: {},
		mariadb: {},
	};

	return typeMap[dbType][dataType] ?? dataType;
}

