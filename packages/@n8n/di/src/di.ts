import 'reflect-metadata';

/**
 * Represents a class constructor type that can be instantiated with 'new'
 * @template T The type of instance the constructor creates
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructable<T = unknown> = new (...args: any[]) => T;

type AbstractConstructable<T = unknown> = abstract new (...args: unknown[]) => T;

type ServiceIdentifier<T = unknown> = Constructable<T> | AbstractConstructable<T>;

type Factory<T = unknown> = (...args: unknown[]) => T;

interface Metadata<T = unknown> {
	instance?: T;
	factory?: Factory<T>;
}

interface Options<T> {
	factory?: Factory<T>;
}

const instances = new Map<ServiceIdentifier, Metadata>();

/**
 * Decorator that marks a class as available for dependency injection.
 * @param options Configuration options for the injectable class
 * @param options.factory Optional factory function to create instances of this class
 * @returns A class decorator to be applied to the target class
 */
// eslint-disable-next-line @typescript-eslint/no-restricted-types
export function Service<T = unknown>(): Function;
// eslint-disable-next-line @typescript-eslint/no-restricted-types
export function Service<T = unknown>(options: Options<T>): Function;
export function Service<T>({ factory }: Options<T> = {}) {
	return function (target: Constructable<T>) {
		instances.set(target, { factory });
		return target;
	};
}

class DIError extends Error {
	constructor(message: string) {
		super(`[DI] ${message}`);
	}
}

class ContainerClass {
	/** Stack to track types being resolved to detect circular dependencies */
	private readonly resolutionStack: ServiceIdentifier[] = [];

	/**
	 * Checks if a type is registered in the container
	 * @template T The type to check for
	 * @param type The constructor of the type to check
	 * @returns True if the type is registered (has metadata), false otherwise
	 */
	has<T>(type: ServiceIdentifier<T>): boolean {
		return instances.has(type);
	}

	/**
	 * Retrieves or creates an instance of the specified type from the container
	 * @template T The type of instance to retrieve
	 * @param type The constructor of the type to retrieve
	 * @returns An instance of the specified type with all dependencies injected
	 * @throws {DIError} If circular dependencies are detected or if the type is not injectable
	 */
	get<T>(type: ServiceIdentifier<T>): T {
		const { resolutionStack } = this;
		const metadata = instances.get(type) as Metadata<T>;
		if (!metadata) {
			// Special case: Allow undefined returns for non-decorated constructor params
			// when resolving a dependency chain (i.e., resolutionStack not empty)
			if (resolutionStack.length) return undefined as T;
			throw new DIError(`${type.name} is not decorated with ${Service.name}`);
		}

		if (metadata?.instance) return metadata.instance as T;

		// Add current type to resolution stack before resolving dependencies
		resolutionStack.push(type);

		try {
			let instance: T;

			const paramTypes = (Reflect.getMetadata('design:paramtypes', type) ?? []) as Constructable[];

			const dependencies = paramTypes.map(<P>(paramType: Constructable<P>, index: number) => {
				if (paramType === undefined) {
					throw new DIError(
						`Circular dependency detected in ${type.name} at index ${index}.\n${resolutionStack.map((t) => t.name).join(' -> ')}\n`,
					);
				}
				return this.get(paramType);
			});

			if (metadata?.factory) {
				instance = metadata.factory(...dependencies);
			} else {
				// Create new instance with resolved dependencies
				instance = new (type as Constructable)(...dependencies) as T;
			}

			instances.set(type, { ...metadata, instance });
			return instance;
		} catch (error) {
			if (error instanceof TypeError && error.message.toLowerCase().includes('abstract')) {
				throw new DIError(`${type.name} is an abstract class, and cannot be instantiated`);
			}
			throw error;
		} finally {
			resolutionStack.pop();
		}
	}

	/**
	 * Manually sets an instance for a specific type in the container
	 * @template T The type of instance being set
	 * @param type The constructor of the type to set. This can also be an abstract class
	 * @param instance The instance to store in the container
	 */
	set<T>(type: ServiceIdentifier<T>, instance: T): void {
		// Preserve any existing metadata (like factory) when setting new instance
		const metadata = instances.get(type) ?? {};
		instances.set(type, { ...metadata, instance });
	}

	/** Clears all instantiated instances from the container while preserving type registrations */
	reset(): void {
		for (const metadata of instances.values()) {
			delete metadata.instance;
		}
	}
}

/**
 * Global dependency injection container instance
 * Used to retrieve and manage class instances and their dependencies
 */
export const Container = new ContainerClass();
