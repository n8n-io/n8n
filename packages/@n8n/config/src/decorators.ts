import 'reflect-metadata';
import { Container, Service } from '@n8n/di';
import { readFileSync } from 'fs';
import { z } from 'zod';

import * as coerce from './coerce';

// eslint-disable-next-line @typescript-eslint/no-restricted-types
type Class = Function;
type Constructable<T = unknown> = new (rawValue: string) => T;
type PropertyKey = string | symbol;
type PropertyType = number | boolean | string | Class;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InstanceTransform = (value: string, config: any) => unknown;
interface PropertyMetadata {
	type: PropertyType;
	envName?: string;
	schema?: z.ZodType<unknown>;
	instanceTransform?: InstanceTransform;
}

const globalMetadata = new Map<Class, Map<PropertyKey, PropertyMetadata>>();

const readEnv = (envName: string) => {
	if (envName in process.env) return process.env[envName];

	// Read the value from a file, if "_FILE" environment variable is defined
	const filePath = process.env[`${envName}_FILE`];
	if (filePath) {
		const value = readFileSync(filePath, 'utf8');
		if (value !== value.trim()) {
			console.warn(
				`[n8n] Warning: The file specified by ${envName}_FILE contains leading or trailing whitespace, which may cause authentication failures.`,
			);
		}
		return value;
	}

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

		const deferred: Array<[PropertyKey, string, InstanceTransform]> = [];

		for (const [key, { type, envName, schema, instanceTransform }] of classMetadata) {
			if (typeof type === 'function' && globalMetadata.has(type)) {
				config[key] = Container.get(type as Constructable);
			} else if (envName) {
				// Defer properties with instance transforms to a second pass,
				// so they can reference other already-resolved properties
				if (instanceTransform) {
					deferred.push([key, envName, instanceTransform]);
					continue;
				}

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
					const parsed = coerce.toNumber(value);
					if (parsed === undefined) {
						console.warn(`Invalid number value for ${envName}: ${value}`);
					} else {
						config[key] = parsed;
					}
				} else if (type === Boolean) {
					const parsed = coerce.toBoolean(value);
					if (parsed === undefined) {
						console.warn(`Invalid boolean value for ${envName}: ${value}`);
					} else {
						config[key] = parsed;
					}
				} else if (type === Date) {
					const parsed = coerce.toDate(value);
					if (parsed === undefined) {
						console.warn(`Invalid timestamp value for ${envName}: ${value}`);
					} else {
						config[key] = parsed;
					}
				} else if (type === String) {
					config[key] = coerce.toString(value);
				} else {
					config[key] = new (type as Constructable)(value);
				}
			}
		}

		// Second pass: process instance transforms with access to all resolved properties
		for (const [key, envName, instanceTransform] of deferred) {
			const value = readEnv(envName);
			if (value === undefined) continue;
			config[key] = instanceTransform(value, config);
		}

		if (typeof config.sanitize === 'function') config.sanitize();

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
	(
		envName: string,
		schemaOrTransform?: PropertyMetadata['schema'] | InstanceTransform,
	): PropertyDecorator =>
	(target: object, key: PropertyKey) => {
		const ConfigClass = target.constructor;
		const classMetadata =
			globalMetadata.get(ConfigClass) ?? new Map<PropertyKey, PropertyMetadata>();

		const type = Reflect.getMetadata('design:type', target, key) as PropertyType;
		const isZodSchema = schemaOrTransform instanceof z.ZodType;
		const isInstanceTransform = typeof schemaOrTransform === 'function';
		if (type === Object && !isZodSchema && !isInstanceTransform) {
			throw new Error(
				`Invalid decorator metadata on key "${key as string}" on ${ConfigClass.name}\n Please use explicit typing on all config fields`,
			);
		}

		classMetadata.set(key, {
			type,
			envName,
			schema: isZodSchema ? schemaOrTransform : undefined,
			instanceTransform: isInstanceTransform ? schemaOrTransform : undefined,
		});
		globalMetadata.set(ConfigClass, classMetadata);
	};
