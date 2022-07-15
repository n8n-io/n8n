import path from 'path';
import { UserSettings } from 'n8n-core';
import { entities } from './entities';

export default [
	{
		name: 'sqlite',
		type: 'sqlite',
		logging: true,
		entities: Object.values(entities),
		database: path.resolve(UserSettings.getUserN8nFolderPath(), 'database.sqlite'),
		migrations: [path.resolve('migrations', 'sqlite', 'index.ts')],
		cli: {
			entitiesDir: path.resolve('entities'),
			migrationsDir: path.resolve('migrations', 'sqlite'),
		},
	},
	{
		name: 'postgres',
		type: 'postgres',
		database: 'n8n',
		schema: 'public',
		username: 'postgres',
		password: '',
		host: 'localhost',
		port: 5432,
		logging: false,
		entities: Object.values(entities),
		migrations: [path.resolve('migrations', 'postgresdb', 'index.ts')],
		cli: {
			entitiesDir: path.resolve('entities'),
			migrationsDir: path.resolve('migrations', 'postgresdb'),
		},
	},
	{
		name: 'mysql',
		type: 'mysql',
		database: 'n8n',
		username: 'root',
		password: 'password',
		host: 'localhost',
		port: 3306,
		logging: false,
		entities: Object.values(entities),
		migrations: [path.resolve('migrations', 'mysqldb', 'index.ts')],
		cli: {
			entitiesDir: path.resolve('entities'),
			migrationsDir: path.resolve('migrations', 'mysqldb'),
		},
	},
	{
		name: 'mariadb',
		type: 'mariadb',
		database: 'n8n',
		username: 'root',
		password: 'password',
		host: 'localhost',
		port: 3306,
		logging: false,
		entities: Object.values(entities),
		migrations: [path.resolve('migrations', 'mysqldb', 'index.ts')],
		cli: {
			entitiesDir: path.resolve('entities'),
			migrationsDir: path.resolve('migrations', 'mysqldb'),
		},
	},
];
