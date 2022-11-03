import path from 'path';
import { UserSettings } from 'n8n-core';
import { entities } from './entities';

const MIGRATIONS_DIR = path.resolve('src', 'databases', 'migrations');
const ENTITIES_DIR = path.resolve('src', 'databases', 'entities');

export default [
	{
		name: 'sqlite',
		type: 'sqlite',
		logging: true,
		entities: Object.values(entities),
		database: path.resolve(UserSettings.getUserN8nFolderPath(), 'database.sqlite'),
		migrations: [path.resolve(MIGRATIONS_DIR, 'sqlite', 'index.ts')],
		cli: {
			entitiesDir: ENTITIES_DIR,
			migrationsDir: path.resolve(MIGRATIONS_DIR, 'sqlite'),
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
		migrations: [path.resolve(MIGRATIONS_DIR, 'postgresdb', 'index.ts')],
		cli: {
			entitiesDir: ENTITIES_DIR,
			migrationsDir: path.resolve(MIGRATIONS_DIR, 'postgresdb'),
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
		migrations: [path.resolve(MIGRATIONS_DIR, 'mysqldb', 'index.ts')],
		cli: {
			entitiesDir: ENTITIES_DIR,
			migrationsDir: path.resolve(MIGRATIONS_DIR, 'mysqldb'),
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
		migrations: [path.resolve(MIGRATIONS_DIR, 'mysqldb', 'index.ts')],
		cli: {
			entitiesDir: ENTITIES_DIR,
			migrationsDir: path.resolve(MIGRATIONS_DIR, 'mysqldb'),
		},
	},
];
