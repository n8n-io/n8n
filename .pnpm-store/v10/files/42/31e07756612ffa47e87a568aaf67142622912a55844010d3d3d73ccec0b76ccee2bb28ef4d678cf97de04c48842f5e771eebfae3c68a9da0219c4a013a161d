export const modeFix = (mode, isDir, portable) => {
    mode &= 0o7777;
    // in portable mode, use the minimum reasonable umask
    // if this system creates files with 0o664 by default
    // (as some linux distros do), then we'll write the
    // archive with 0o644 instead.  Also, don't ever create
    // a file that is not readable/writable by the owner.
    if (portable) {
        mode = (mode | 0o600) & ~0o22;
    }
    // if dirs are readable, then they should be listable
    if (isDir) {
        if (mode & 0o400) {
            mode |= 0o100;
        }
        if (mode & 0o40) {
            mode |= 0o10;
        }
        if (mode & 0o4) {
            mode |= 0o1;
        }
    }
    return mode;
};
//# sourceMappingURL=mode-fix.js.map