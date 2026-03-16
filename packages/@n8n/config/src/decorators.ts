import 'reflect-metadata';
import { Container, Service } from '@n8n/di';
import { readFileSync } from 'fs';
import { z } from 'zod';

import * as coerce from './coerce';

// eslint-disable-next-line @typescript-eslint/no-restricted-types
type Class = Function;
type Constructable<T = unknown> = new (rawValue: string) => T;
type PropertyKey = string | symbol;
type PropertyType =
	| NumberConstructor
	| BooleanConstructor
	| StringConstructor
	| DateConstructor
	| Class;
type InstanceTransform<TConfig = unknown, TValue = unknown> = {
	bivarianceHack(value: string, config: TConfig): TValue;
}['bivarianceHack'];
interface PropertyMetadata {
	type: PropertyType;
	envName?: string;
	schema?: z.ZodType<unknown>;
	instanceTransform?: InstanceTransform;
}

const globalMetadata = new Map<Class, Map<PropertyKey, PropertyMetadata>>();

const getTypeName = (type: PropertyType) => {
	if (type === Number) return 'number';
	if (type === Boolean) return 'boolean';
	if (type === String) return 'string';
	if (type === Date) return 'Date';
	if (type === Array) return 'array';
	if (type === Object) return 'object';
	return type.name;
};

const isTransformedValueCompatible = (value: unknown, type: PropertyType) => {
	if (type === Number) return typeof value === 'number' && !Number.isNaN(value);
	if (type === Boolean) return typeof value === 'boolean';
	if (type === String) return typeof value === 'string';
	if (type === Date) return value instanceof Date && !Number.isNaN(value.getTime());
	if (type === Array) return Array.isArray(value);
	if (type === Object) return typeof value === 'object' && value !== null;
	return value instanceof (type as Constructable);
};

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

		const deferred: Array<[PropertyKey, string, PropertyType, InstanceTransform]> = [];

		for (const [key, { type, envName, schema, instanceTransform }] of classMetadata) {
			if (typeof type === 'function' && globalMetadata.has(type)) {
				config[key] = Container.get(type as Constructable);
			} else if (envName) {
				// Defer properties with instance transforms to a second pass,
				// so they can reference other already-resolved properties
				if (instanceTransform) {
					deferred.push([key, envName, type, instanceTransform]);
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
		for (const [key, envName, type, instanceTransform] of deferred) {
			const value = readEnv(envName);
			if (value === undefined) continue;
			const transformed = instanceTransform(value, config);
			if (!isTransformedValueCompatible(transformed, type)) {
				console.warn(
					`Invalid transformed value for ${envName}: expected ${getTypeName(type)}. Falling back to default value.`,
				);
				continue;
			}
			config[key] = transformed;
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
	<TConfig = unknown, TValue = unknown>(
		envName: string,
		schemaOrTransform?: PropertyMetadata['schema'] | InstanceTransform<TConfig, TValue>,
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
