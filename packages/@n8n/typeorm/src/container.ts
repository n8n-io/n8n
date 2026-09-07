/**
 * Container options.
 *
 * @deprecated
 */
export interface UseContainerOptions {
	/**
	 * If set to true, then default container will be used in the case if given container haven't returned anything.
	 */
	fallback?: boolean;

	/**
	 * If set to true, then default container will be used in the case if given container thrown an exception.
	 */
	fallbackOnErrors?: boolean;
}

/**
 * @deprecated
 */
export type ContainedType<T> = { new (...args: any[]): T } | Function;

/**
 * @deprecated
 */
export interface ContainerInterface {
	get<T>(someClass: ContainedType<T>): T;
}

/**
 * Container to be used by this library for inversion control. If container was not implicitly set then by default
 * container simply creates a new instance of the given class.
 *
 * @deprecated
 */
const defaultContainer: ContainerInterface = new (class implements ContainerInterface {
	private instances: { type: Function; object: any }[] = [];

	get<T>(someClass: ContainedType<T>): T {
		let instance = this.instances.find((i) => i.type === someClass);
		if (!instance) {
			instance = {
				type: someClass,
				object: new (someClass as new () => T)(),
			};
			this.instances.push(instance);
		}

		return instance.object;
	}
})();

let userContainer: ContainerInterface;
let userContainerOptions: UseContainerOptions | undefined;

/**
 * Sets container to be used by this library.
 *
 * @deprecated
 */
export function useContainer(iocContainer: ContainerInterface, options?: UseContainerOptions) {
	userContainer = iocContainer;
	userContainerOptions = options;
}

/**
 * Gets the IOC container used by this library.
 *
 * @deprecated
 */
export function getFromContainer<T>(someClass: ContainedType<T>): T {
	if (userContainer) {
		try {
			const instance = userContainer.get(someClass);
			if (instance) return instance;

			if (!userContainerOptions || !userContainerOptions.fallback) return instance;
		} catch (error) {
			if (!userContainerOptions || !userContainerOptions.fallbackOnErrors) throw error;
		}
	}
	return defaultContainer.get<T>(someClass);
}
