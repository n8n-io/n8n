/**
 * An integer value used to specify file permissions for POSIX-like operating systems.
 *
 * @remarks
 *
 * This bitfield corresponds to the "mode_t" structure described in this document:
 * http://pubs.opengroup.org/onlinepubs/9699919799/basedefs/sys_stat.h.html
 *
 * It is used with NodeJS APIs such as fs.Stat.mode and fs.chmodSync().  These values
 * represent a set of permissions and can be combined using bitwise arithmetic.
 *
 * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
 *
 * @public
 */
export declare enum PosixModeBits {
    /**
     * Indicates that the item's owner can read the item.
     */
    UserRead = 256,
    /**
     * Indicates that the item's owner can modify the item.
     */
    UserWrite = 128,
    /**
     * Indicates that the item's owner can execute the item (if it is a file)
     * or search the item (if it is a directory).
     */
    UserExecute = 64,
    /**
     * Indicates that users belonging to the item's group can read the item.
     */
    GroupRead = 32,
    /**
     * Indicates that users belonging to the item's group can modify the item.
     */
    GroupWrite = 16,
    /**
     * Indicates that users belonging to the item's group can execute the item (if it is a file)
     * or search the item (if it is a directory).
     */
    GroupExecute = 8,
    /**
     * Indicates that other users (besides the item's owner user or group) can read the item.
     */
    OthersRead = 4,
    /**
     * Indicates that other users (besides the item's owner user or group) can modify the item.
     */
    OthersWrite = 2,
    /**
     * Indicates that other users (besides the item's owner user or group) can execute the item (if it is a file)
     * or search the item (if it is a directory).
     */
    OthersExecute = 1,
    /**
     * A zero value where no permissions bits are set.
     */
    None = 0,
    /**
     * An alias combining OthersRead, GroupRead, and UserRead permission bits.
     */
    AllRead = 292,
    /**
     * An alias combining OthersWrite, GroupWrite, and UserWrite permission bits.
     */
    AllWrite = 146,
    /**
     * An alias combining OthersExecute, GroupExecute, and UserExecute permission bits.
     */
    AllExecute = 73
}
//# sourceMappingURL=PosixModeBits.d.ts.map