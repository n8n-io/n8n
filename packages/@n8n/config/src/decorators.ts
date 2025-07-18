import 'reflect-metadata';
import { Container, Service } from '@n8n/di';
import { readFileSync } from 'fs';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-restricted-types
type Class = Function;
type Constructable<T = unknown> = new (rawValue: string) => T;
type PropertyKey = string | symbol;
type PropertyType = number | boolean | string | Class;
interface PropertyMetadata {
	type: PropertyType;
	envName?: string;
	schema?: z.ZodType<unknown>;
}

const globalMetadata = new Map<Class, Map<PropertyKey, PropertyMetadata>>();

const readEnv = (envName: string) => {
	if (envName in process.env) return process.env[envName];

	// Read the value from a file, if "_FILE" environment variable is defined
	const filePath = process.env[`${envName}_FILE`];
	if (filePath) return readFileSync(filePath, 'utf8');

	return undefined;
};

export const Config: ClassDecorator = (ConfigClass: Class) => {
	const factory = function (...args: unknown[]) {
		const config = new (ConfigClass as new (...a: unknown[]) => Record<PropertyKey, unknown>)(
			...args,
		);
		const classMetadata = globalMetadata.get(ConfigClass);
		if (!classMetadata) {
			throw new Error('Invalid config class: ' + ConfigClass.name);
		}

		for (const [key, { type, envName, schema }] of classMetadata) {
			if (typeof type === 'function' && globalMetadata.has(type)) {
				config[key] = Container.get(type as Constructable);
			} else if (envName) {
				const value = readEnv(envName);
				if (value === undefined) continue;

				if (schema) {
					const result = schema.safeParse(value);
					if (result.error) {
						console.warn(
							`Invalid value for ${envName} - ${result.error.issues[0].message}. Falling back to default value.`,
						);
						continue;
					}
					config[key] = result.data;
				} else if (type === Number) {
					const parsed = Number(value);
					if (isNaN(parsed)) {
						console.warn(`Invalid number value for ${envName}: ${value}`);
					} else {
						config[key] = parsed;
					}
				} else if (type === Boolean) {
					if (['true', '1'].includes(value.toLowerCase())) {
						config[key] = true;
					} else if (['false', '0'].includes(value.toLowerCase())) {
						config[key] = false;
					} else {
						console.warn(`Invalid boolean value for ${envName}: ${value}`);
					}
				} else if (type === Date) {
					const timestamp = Date.parse(value);
					if (isNaN(timestamp)) {
						console.warn(`Invalid timestamp value for ${envName}: ${value}`);
					} else {
						config[key] = new Date(timestamp);
					}
				} else if (type === String) {
					config[key] = value;
				} else {
					config[key] = new (type as Constructable)(value);
				}
			}
		}
		return config;
	};
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return Service({ factory })(ConfigClass);
};

export const Nested: PropertyDecorator = (target: object, key: PropertyKey) => {
	const ConfigClass = target.constructor;
	const classMetadata = globalMetadata.get(ConfigClass) ?? new Map<PropertyKey, PropertyMetadata>();
	const type = Reflect.getMetadata('design:type', target, key) as PropertyType;
	classMetadata.set(key, { type });
	globalMetadata.set(ConfigClass, classMetadata);
};

export const Env =
	(envName: string, schema?: PropertyMetadata['schema']): PropertyDecorator =>
	(target: object, key: PropertyKey) => {
		const ConfigClass = target.constructor;
		const classMetadata =
			globalMetadata.get(ConfigClass) ?? new Map<PropertyKey, PropertyMetadata>();

		const type = Reflect.getMetadata('design:type', target, key) as PropertyType;
		const isZodSchema = schema instanceof z.ZodType;
		if (type === Object && !isZodSchema) {
			throw new Error(
				`Invalid decorator metadata on key "${key as string}" on ${ConfigClass.name}\n Please use explicit typing on all config fields`,
			);
		}

		classMetadata.set(key, { type, envName, schema });
		globalMetadata.set(ConfigClass, classMetadata);
	};
