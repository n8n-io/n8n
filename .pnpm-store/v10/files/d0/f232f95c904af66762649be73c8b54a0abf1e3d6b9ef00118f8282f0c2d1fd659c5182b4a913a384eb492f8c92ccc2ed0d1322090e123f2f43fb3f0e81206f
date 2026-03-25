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
export type ContainedType<T> = {
    new (...args: any[]): T;
} | Function;
/**
 * @deprecated
 */
export interface ContainerInterface {
    get<T>(someClass: ContainedType<T>): T;
}
/**
 * Sets container to be used by this library.
 *
 * @deprecated
 */
export declare function useContainer(iocContainer: ContainerInterface, options?: UseContainerOptions): void;
/**
 * Gets the IOC container used by this library.
 *
 * @deprecated
 */
export declare function getFromContainer<T>(someClass: ContainedType<T>): T;
