/**
 * @category Internals
 */
export const credentials = {
    uid: 0,
    gid: 0,
    suid: 0,
    sgid: 0,
    euid: 0,
    egid: 0,
    groups: [],
};
/**
 * @category Internals
 */
export function createCredentials(source) {
    return {
        suid: source.uid,
        sgid: source.gid,
        euid: source.uid,
        egid: source.gid,
        groups: [],
        ...source,
    };
}
/**
 * Uses credentials from the provided uid and gid.
 * @category Internals
 */
export function useCredentials(source) {
    Object.assign(credentials, createCredentials(source));
}
