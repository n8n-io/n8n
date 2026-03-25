declare type voidCallback = () => void;
declare type stringCallback = (arg0: string) => void;
declare type objectCallback<T> = (arg0: T) => void;
declare type booleanCallback = (arg0: boolean) => void;

declare interface JsonT {
    /**
     * loads JSON from file sync.
     * @param {string} path path to load from.
     * @param {boolean} hasComments file to load has comments in json.
     * @return {T}
     */
    loadS: <T = any>(path: string, hasComments?: boolean) => T;
    /**
     * saves JSON data to file sync.
     * @param {string} path path to save to.
     * @param {T} data data to save.
     * @return {void}
     */
    saveS: <T = any>(path: string, data: T) => void;
    /**
     * loads JSON from file.
     * @param {string} path path to load from.
     * @param {objectCallback<T>} callback callback to call.
     * @param {boolean} hasComments file to load has comments in json.
     * @return {Promise<T>}
     */
    load: <T = any>(path: string, callback?: objectCallback<T> | undefined, hasComments?: boolean) => Promise<T>;
    /**
     * saves JSON data to file.
     * @param {string} path path to save to.
     * @param {T} data data to save.
     * @param {voidCallback} callback callback to call.
     * @return {Promise<void>}
     */
    save: <T = any>(path: string, data: T, callback?: voidCallback | undefined) => Promise<void>;
    /**
     * loads JSON from file.
     * @param {string} path path to load from.
     * @param {objectCallback<T>} callback callback to call.
     * @param {boolean} hasComments file to load has comments in json.
     */
    loadW: <T = any>(path: string, callback?: objectCallback<T> | undefined, hasComments?: boolean) => Promise<T>;
    /**
     * saves JSON data to file.
     * @param {string} path path to save to.
     * @param {T} data data to save.
     * @param {voidCallback} callback callback to call.
     */
    saveW: <T = any>(path: string, data: T, callback?: voidCallback | undefined) => Promise<void>;
}
declare interface StringSave {
    /**
    * saves string to file sync.
    * @param {string} path path to save to.
    * @return {void}
    */
    saveS: (path: string) => void;
    /**
     * saves string to file async.
     * @param {string} path path to save to.
     * @param {voidCallback} callback callback to call.
     * @return {Promise<void>}
     */
    save: (path: string, callback?: voidCallback | undefined) => Promise<void>;
    /**
     * saves string to file with worker.
     * @param {string} path path to save to.
     * @param {voidCallback} callback callback to call.
     */
    saveW: (path: string, callback?: voidCallback | undefined) => Promise<void>;
}
declare interface FileT {
    /**
     * loads string data from file sync.
     * @param {string} path path to load from.
     * @return {string}
     */
    loadS: (path: string) => string;
    /**
    * loads string data from file async.
    * @param {string} path path to load from.
    * @param {stringCallback} callback callback to call.
    * @return {Promise<string>}
    */
    load: (path: string, callback?: stringCallback | undefined) => Promise<string>;
    /**
     * loads string data from file with worker.
     * @param {string} path path to load from.
     * @param {stringCallback} callback callback to call.
     */
    loadW: (path: string, callback?: stringCallback | undefined) => Promise<string>;
    /**
     * saves string to file sync.
     * @param {string} path path to save to.
     * @param {string} data data to save.
     * @return {void}
     */
    saveS: (path: string, data: string) => void;
    /**
     * saves string to file async.
     * @param {string} path path to save to.
     * @param {string} data data to save.
     * @param {voidCallback} callback callback to call.
     * @return {Promise<void>}
     */
    save: (path: string, data: string, callback?: voidCallback | undefined) => Promise<void>;
    /**
     * saves string to file with worker.
     * @param {string} path path to save to.
     * @param {string} data data to save.
     * @param {voidCallback} callback callback to call.
     */
    saveW: (path: string, data: string, callback?: voidCallback | undefined) => Promise<void>;
}

declare interface DirT {
    /**
     * Creates directory on filesystem synchronous.
     * @param {string} path path to dir
     * @return {void}
     */
    mkS: (path: string) => void;
    /**
     * Removes directory on filesystem synchronous.
     * @param {string} path path to dir
     * @return {void}
     */
    rmS: (path: string) => void;
    /**
     * Checks if directory exists on filesystem synchronous.
     * @param {string} path path to dir.
     * @return {boolean}
     */
    checkS: (path: string) => boolean;
    /**
     * Creates directory on filesystem asynchronous.
     * @param {string} path path to dir
     * @param {voidCallback} callback callback to call.
     * @return {Promise<void>}
     */
    mk: (path: string, callback?: voidCallback | undefined) => Promise<void>;
    /**
     * Removes directory on filesystem asynchronous.
     * @param {string} path path to dir
     * @param {voidCallback} callback callback to call.
     * @return {Promise<void>}
     */
    rm: (path: string, callback?: voidCallback | undefined) => Promise<void>;
    /**
     * Checks if directory exists on filesystem asynchronous.
     * @param {string} path path to dir.
     * @param {booleanCallback} callback callback to call.
     * @return {Promise<boolean>}
     */
    check: (path: string, callback?: booleanCallback | undefined) => Promise<boolean>;
    /**
     * NodeModules finds where the node_modules directories are.
     * @param {{ cwd?: string; relative?: boolean; } | string} input optional cwd input.
     * @returns an array of locations where node_modules is found.
     */
    nodeModules: (input?: { cwd?: string; relative?: boolean; } | string) => string[];
}
declare interface BufT {
    /**
     * loads buffer data from file.
     * @param {string} path path to load from.
     * @param {objectCallback<Buffer>} callback callback to call.
     * @return {Promise<Buffer>}
     */
    load: (path: string, callback?: objectCallback<Buffer> | undefined) => Promise<Buffer>;
    /**
     * saves buffer to file.
     * @param {string} path path to save to.
     * @param {Buffer} data data to save.
     * @param {voidCallback} callback callback to call.
     * @return {Promise<void>}
     */
    save: (path: string, data: Buffer, callback?: voidCallback | undefined) => Promise<void>;
    /**
     * loads buffer data from file.
     * @param {string} path path to load from.
     * @param {objectCallback<Buffer>} callback callback to call.
     */
    loadW: (path: string, callback?: objectCallback<Buffer> | undefined) => Promise<Buffer>;
    /**
     * saves buffer to file.
     * @param {string} path path to save to.
     * @param {Buffer} data data to save.
     * @param {voidCallback} callback callback to call.
     */
    saveW: (path: string, data: Buffer, callback?: voidCallback | undefined) => Promise<void>;
}

export {
    FileT,
    JsonT,
    StringSave,
    BufT,
    DirT,
};
