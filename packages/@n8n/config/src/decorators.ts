import 'reflect-metadata';
import { readFileSync } from 'fs';
import { Container, Service } from 'typedi';

// eslint-disable-next-line @typescript-eslint/ban-types
type Class = Function;
type PropertyKey = string | symbol;
interface PropertyMetadata {
	type: unknown;
	envName?: string;
}

const globalMetadata = new Map<Class, Map<PropertyKey, PropertyMetadata>>();

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
				config[key] = Container.get(type);
			} else if (envName) {
				let value: unknown = process.env[envName];

				// Read the value from a file, if "_FILE" environment variable is defined
				const filePath = process.env[`${envName}_FILE`];
				if (filePath) {
					value = readFileSync(filePath, 'utf8');
				}

				if (type === Number) {
					value = Number(value);
					if (isNaN(value as number)) {
						// TODO: add a warning
						value = undefined;
					}
				} else if (type === Boolean) {
					if (value !== 'true' && value !== 'false') {
						// TODO: add a warning
						value = undefined;
					} else {
						value = value === 'true';
					}
				}

				if (value !== undefined) {
					config[key] = value;
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
	const type = Reflect.getMetadata('design:type', target, key) as unknown;
	classMetadata.set(key, { type });
	globalMetadata.set(ConfigClass, classMetadata);
};

export const Env =
	(envName: string): PropertyDecorator =>
	(target: object, key: PropertyKey) => {
		const ConfigClass = target.constructor;
		const classMetadata =
			globalMetadata.get(ConfigClass) ?? new Map<PropertyKey, PropertyMetadata>();
		const type = Reflect.getMetadata('design:type', target, key) as unknown;
		classMetadata.set(key, { type, envName });
		globalMetadata.set(ConfigClass, classMetadata);
	};
