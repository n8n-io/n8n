/**
 * Module based on OS native UUID/GUID which used for internal needs.
 */
declare module 'node-machine-id' {

    /**
     * This function gets the OS native UUID/GUID synchronously, hashed by default.
     * @param {boolean} [original=false] - If true return original value of machine id, otherwise return hashed value (sha - 256)
     */
    function machineIdSync(original?: boolean): string;

    /**
     * This function gets the OS native UUID/GUID asynchronously (recommended), hashed by default.
     * @param {boolean} [original=false] - If true return original value of machine id, otherwise return hashed value (sha - 256)
     */
    function machineId(original?: boolean): Promise<string>;
}
