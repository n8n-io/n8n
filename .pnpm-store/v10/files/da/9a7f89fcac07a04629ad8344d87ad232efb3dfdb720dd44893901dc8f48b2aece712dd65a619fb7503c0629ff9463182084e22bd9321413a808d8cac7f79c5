/**
 * Container options.
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
 * Sets container to be used by this library.
 */
export declare function useContainer(iocContainer: {
    get(someClass: any): any;
}, options?: UseContainerOptions): void;
/**
 * Gets the IOC container used by this library.
 */
export declare function getFromContainer<T>(someClass: {
    new (...args: any[]): T;
} | Function): T;
