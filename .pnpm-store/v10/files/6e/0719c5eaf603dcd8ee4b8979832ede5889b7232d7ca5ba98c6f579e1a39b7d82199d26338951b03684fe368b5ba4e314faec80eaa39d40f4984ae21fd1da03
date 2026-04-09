/*
Copyright Joyent, Inc. and other Node contributors.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
export let cwd = '/';
export function cd(path) {
    cwd = resolve(cwd, path);
}
export const sep = '/';
function validateObject(str, name) {
    if (typeof str != 'object') {
        throw new TypeError(`"${name}" is not an object`);
    }
}
// Resolves . and .. elements in a path with directory names
export function normalizeString(path, allowAboveRoot) {
    let res = '';
    let lastSegmentLength = 0;
    let lastSlash = -1;
    let dots = 0;
    let char = '\x00';
    for (let i = 0; i <= path.length; ++i) {
        if (i < path.length) {
            char = path[i];
        }
        else if (char == '/') {
            break;
        }
        else {
            char = '/';
        }
        if (char == '/') {
            if (lastSlash === i - 1 || dots === 1) {
                // NOOP
            }
            else if (dots === 2) {
                if (res.length < 2 || lastSegmentLength !== 2 || res.at(-1) !== '.' || res.at(-2) !== '.') {
                    if (res.length > 2) {
                        const lastSlashIndex = res.lastIndexOf('/');
                        if (lastSlashIndex === -1) {
                            res = '';
                            lastSegmentLength = 0;
                        }
                        else {
                            res = res.slice(0, lastSlashIndex);
                            lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
                        }
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                    else if (res.length !== 0) {
                        res = '';
                        lastSegmentLength = 0;
                        lastSlash = i;
                        dots = 0;
                        continue;
                    }
                }
                if (allowAboveRoot) {
                    res += res.length > 0 ? '/..' : '..';
                    lastSegmentLength = 2;
                }
            }
            else {
                if (res.length > 0)
                    res += '/' + path.slice(lastSlash + 1, i);
                else
                    res = path.slice(lastSlash + 1, i);
                lastSegmentLength = i - lastSlash - 1;
            }
            lastSlash = i;
            dots = 0;
        }
        else if (char === '.' && dots !== -1) {
            ++dots;
        }
        else {
            dots = -1;
        }
    }
    return res;
}
export function formatExt(ext) {
    return ext ? `${ext[0] === '.' ? '' : '.'}${ext}` : '';
}
export function resolve(...parts) {
    let resolved = '';
    for (const part of [...parts.reverse(), cwd]) {
        if (!part.length) {
            continue;
        }
        resolved = `${part}/${resolved}`;
        if (part.startsWith('/')) {
            break;
        }
    }
    const absolute = resolved.startsWith('/');
    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when cwd fails)
    // Normalize the path
    resolved = normalizeString(resolved, !absolute);
    if (absolute) {
        return `/${resolved}`;
    }
    return resolved.length ? resolved : '/';
}
export function normalize(path) {
    if (!path.length)
        return '.';
    const isAbsolute = path.startsWith('/');
    const trailingSeparator = path.endsWith('/');
    // Normalize the path
    path = normalizeString(path, !isAbsolute);
    if (!path.length) {
        if (isAbsolute)
            return '/';
        return trailingSeparator ? './' : '.';
    }
    if (trailingSeparator)
        path += '/';
    return isAbsolute ? `/${path}` : path;
}
export function isAbsolute(path) {
    return path.startsWith('/');
}
export function join(...parts) {
    if (!parts.length)
        return '.';
    const joined = parts.join('/');
    if (!(joined === null || joined === void 0 ? void 0 : joined.length))
        return '.';
    return normalize(joined);
}
export function relative(from, to) {
    if (from === to)
        return '';
    // Trim leading forward slashes.
    from = resolve(from);
    to = resolve(to);
    if (from === to)
        return '';
    const fromStart = 1;
    const fromEnd = from.length;
    const fromLen = fromEnd - fromStart;
    const toStart = 1;
    const toLen = to.length - toStart;
    // Compare paths to find the longest common path from root
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for (; i < length; i++) {
        const fromCode = from[fromStart + i];
        if (fromCode !== to[toStart + i])
            break;
        else if (fromCode === '/')
            lastCommonSep = i;
    }
    if (i === length) {
        if (toLen > length) {
            if (to[toStart + i] === '/') {
                // We get here if `from` is the exact base path for `to`.
                // For example: from='/foo/bar'; to='/foo/bar/baz'
                return to.slice(toStart + i + 1);
            }
            if (i === 0) {
                // We get here if `from` is the root
                // For example: from='/'; to='/foo'
                return to.slice(toStart + i);
            }
        }
        else if (fromLen > length) {
            if (from[fromStart + i] === '/') {
                // We get here if `to` is the exact base path for `from`.
                // For example: from='/foo/bar/baz'; to='/foo/bar'
                lastCommonSep = i;
            }
            else if (i === 0) {
                // We get here if `to` is the root.
                // For example: from='/foo/bar'; to='/'
                lastCommonSep = 0;
            }
        }
    }
    let out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`.
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
        if (i === fromEnd || from[i] === '/') {
            out += out.length === 0 ? '..' : '/..';
        }
    }
    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts.
    return `${out}${to.slice(toStart + lastCommonSep)}`;
}
export function dirname(path) {
    if (path.length === 0)
        return '.';
    const hasRoot = path[0] === '/';
    let end = -1;
    let matchedSlash = true;
    for (let i = path.length - 1; i >= 1; --i) {
        if (path[i] === '/') {
            if (!matchedSlash) {
                end = i;
                break;
            }
        }
        else {
            // We saw the first non-path separator
            matchedSlash = false;
        }
    }
    if (end === -1)
        return hasRoot ? '/' : '.';
    if (hasRoot && end === 1)
        return '//';
    return path.slice(0, end);
}
export function basename(path, suffix) {
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    if (suffix !== undefined && suffix.length > 0 && suffix.length <= path.length) {
        if (suffix === path)
            return '';
        let extIdx = suffix.length - 1;
        let firstNonSlashEnd = -1;
        for (let i = path.length - 1; i >= 0; --i) {
            if (path[i] === '/') {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    start = i + 1;
                    break;
                }
            }
            else {
                if (firstNonSlashEnd === -1) {
                    // We saw the first non-path separator, remember this index in case
                    // we need it if the extension ends up not matching
                    matchedSlash = false;
                    firstNonSlashEnd = i + 1;
                }
                if (extIdx >= 0) {
                    // Try to match the explicit extension
                    if (path[i] === suffix[extIdx]) {
                        if (--extIdx === -1) {
                            // We matched the extension, so mark this as the end of our path component
                            end = i;
                        }
                    }
                    else {
                        // Extension does not match, so our result is the entire path component
                        extIdx = -1;
                        end = firstNonSlashEnd;
                    }
                }
            }
        }
        if (start === end)
            end = firstNonSlashEnd;
        else if (end === -1)
            end = path.length;
        return path.slice(start, end);
    }
    for (let i = path.length - 1; i >= 0; --i) {
        if (path[i] === '/') {
            // If we reached a path separator that was not part of a set of path separators at the end of the string, stop now
            if (!matchedSlash) {
                start = i + 1;
                break;
            }
        }
        else if (end === -1) {
            // We saw the first non-path separator, mark this as the end of our path component
            matchedSlash = false;
            end = i + 1;
        }
    }
    if (end === -1)
        return '';
    return path.slice(start, end);
}
export function extname(path) {
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    let preDotState = 0;
    for (let i = path.length - 1; i >= 0; --i) {
        if (path[i] === '/') {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            // We saw the first non-path separator, mark this as the end of our
            // extension
            matchedSlash = false;
            end = i + 1;
        }
        if (path[i] === '.') {
            // If this is our first dot, mark it as the start of our extension
            if (startDot === -1)
                startDot = i;
            else if (preDotState !== 1)
                preDotState = 1;
        }
        else if (startDot !== -1) {
            // We saw a non-dot and non-path separator before our dot, so we should
            // have a good chance at having a non-empty extension
            preDotState = -1;
        }
    }
    if (startDot === -1
        || end === -1
        // We saw a non-dot character immediately before the dot
        || preDotState === 0
        // The (right-most) trimmed path component is exactly '..'
        || (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)) {
        return '';
    }
    return path.slice(startDot, end);
}
export function format(pathObject) {
    validateObject(pathObject, 'pathObject');
    const dir = pathObject.dir || pathObject.root;
    const base = pathObject.base || `${pathObject.name || ''}${formatExt(pathObject.ext)}`;
    if (!dir) {
        return base;
    }
    return dir === pathObject.root ? `${dir}${base}` : `${dir}/${base}`;
}
export function parse(path) {
    const isAbsolute = path.startsWith('/');
    const ret = { root: isAbsolute ? '/' : '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0)
        return ret;
    const start = isAbsolute ? 1 : 0;
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    let preDotState = 0;
    // Get non-dir info
    for (; i >= start; --i) {
        if (path[i] === '/') {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
                startPart = i + 1;
                break;
            }
            continue;
        }
        if (end === -1) {
            // We saw the first non-path separator, mark this as the end of our
            // extension
            matchedSlash = false;
            end = i + 1;
        }
        if (path[i] === '.') {
            // If this is our first dot, mark it as the start of our extension
            if (startDot === -1)
                startDot = i;
            else if (preDotState !== 1)
                preDotState = 1;
        }
        else if (startDot !== -1) {
            // We saw a non-dot and non-path separator before our dot, so we should
            // have a good chance at having a non-empty extension
            preDotState = -1;
        }
    }
    if (end !== -1) {
        const start = startPart === 0 && isAbsolute ? 1 : startPart;
        if (startDot === -1
            // We saw a non-dot character immediately before the dot
            || preDotState === 0
            // The (right-most) trimmed path component is exactly '..'
            || (preDotState === 1 && startDot === end - 1 && startDot === startPart + 1)) {
            ret.base = ret.name = path.slice(start, end);
        }
        else {
            ret.name = path.slice(start, startDot);
            ret.base = path.slice(start, end);
            ret.ext = path.slice(startDot, end);
        }
    }
    if (startPart > 0)
        ret.dir = path.slice(0, startPart - 1);
    else if (isAbsolute)
        ret.dir = '/';
    return ret;
}
