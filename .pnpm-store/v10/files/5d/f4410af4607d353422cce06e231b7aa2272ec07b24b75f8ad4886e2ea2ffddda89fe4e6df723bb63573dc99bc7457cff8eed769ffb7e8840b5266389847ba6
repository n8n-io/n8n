export = calledInOrder;
/**
 * A Sinon proxy object (fake, spy, stub)
 * @typedef {object} SinonProxy
 * @property {Function} calledBefore - A method that determines if this proxy was called before another one
 * @property {string} id - Some id
 * @property {number} callCount - Number of times this proxy has been called
 */
/**
 * Returns true when the spies have been called in the order they were supplied in
 * @param  {SinonProxy[] | SinonProxy} spies An array of proxies, or several proxies as arguments
 * @returns {boolean} true when spies are called in order, false otherwise
 */
declare function calledInOrder(spies: SinonProxy[] | SinonProxy, ...args: any[]): boolean;
declare namespace calledInOrder {
    export { SinonProxy };
}
/**
 * A Sinon proxy object (fake, spy, stub)
 */
type SinonProxy = {
    /**
     * - A method that determines if this proxy was called before another one
     */
    calledBefore: Function;
    /**
     * - Some id
     */
    id: string;
    /**
     * - Number of times this proxy has been called
     */
    callCount: number;
};
