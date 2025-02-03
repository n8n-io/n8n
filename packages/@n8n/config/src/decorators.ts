import 'reflect-metadata';
import { Container, Service } from '@n8n/di';
import { readFileSync } from 'fs';

// eslint-disable-next-line @typescript-eslint/ban-types
type Class = Function;
type Constructable<T = unknown> = new (rawValue: string) => T;
type PropertyKey = string | symbol;
type PropertyType = number | boolean | string | Class;
interface PropertyMetadata {
	type: PropertyType;
	envName?: string;
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
	const factory = function () {
		const config = new (ConfigClass as new () => Record<PropertyKey, unknown>)();
		const classMetadata = globalMetadata.get(ConfigClass);
		if (!classMetadata) {
			// eslint-disable-next-line n8n-local-rules/no-plain-errors
			throw new Error('Invalid config class: ' + ConfigClass.name);
		}

		for (const [key, { type, envName }] of classMetadata) {
			if (typeof type === 'function' && globalMetadata.has(type)) {
				config[key] = Container.get(type as Constructable);
			} else if (envName) {
				const value = readEnv(envName);
				if (value === undefined) continue;

				if (type === Number) {
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
	(envName: string): PropertyDecorator =>
	(target: object, key: PropertyKey) => {
		const ConfigClass = target.constructor;
		const classMetadata =
			globalMetadata.get(ConfigClass) ?? new Map<PropertyKey, PropertyMetadata>();
		const type = Reflect.getMetadata('design:type', target, key) as PropertyType;
		if (type === Object) {
			// eslint-disable-next-line n8n-local-rules/no-plain-errors
			throw new Error(
				`Invalid decorator metadata on key "${key as string}" on ${ConfigClass.name}\n Please use explicit typing on all config fields`,
			);
		}
		classMetadata.set(key, { type, envName });
		globalMetadata.set(ConfigClass, classMetadata);
	};
