"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PosixModeBits = void 0;
// The PosixModeBits are intended to be used with bitwise operations.
/* eslint-disable no-bitwise */
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
var PosixModeBits;
(function (PosixModeBits) {
    // The bits
    /**
     * Indicates that the item's owner can read the item.
     */
    PosixModeBits[PosixModeBits["UserRead"] = 256] = "UserRead";
    /**
     * Indicates that the item's owner can modify the item.
     */
    PosixModeBits[PosixModeBits["UserWrite"] = 128] = "UserWrite";
    /**
     * Indicates that the item's owner can execute the item (if it is a file)
     * or search the item (if it is a directory).
     */
    PosixModeBits[PosixModeBits["UserExecute"] = 64] = "UserExecute";
    /**
     * Indicates that users belonging to the item's group can read the item.
     */
    PosixModeBits[PosixModeBits["GroupRead"] = 32] = "GroupRead";
    /**
     * Indicates that users belonging to the item's group can modify the item.
     */
    PosixModeBits[PosixModeBits["GroupWrite"] = 16] = "GroupWrite";
    /**
     * Indicates that users belonging to the item's group can execute the item (if it is a file)
     * or search the item (if it is a directory).
     */
    PosixModeBits[PosixModeBits["GroupExecute"] = 8] = "GroupExecute";
    /**
     * Indicates that other users (besides the item's owner user or group) can read the item.
     */
    PosixModeBits[PosixModeBits["OthersRead"] = 4] = "OthersRead";
    /**
     * Indicates that other users (besides the item's owner user or group) can modify the item.
     */
    PosixModeBits[PosixModeBits["OthersWrite"] = 2] = "OthersWrite";
    /**
     * Indicates that other users (besides the item's owner user or group) can execute the item (if it is a file)
     * or search the item (if it is a directory).
     */
    PosixModeBits[PosixModeBits["OthersExecute"] = 1] = "OthersExecute";
    // Helpful aliases
    /**
     * A zero value where no permissions bits are set.
     */
    PosixModeBits[PosixModeBits["None"] = 0] = "None";
    /**
     * An alias combining OthersRead, GroupRead, and UserRead permission bits.
     */
    PosixModeBits[PosixModeBits["AllRead"] = 292] = "AllRead";
    /**
     * An alias combining OthersWrite, GroupWrite, and UserWrite permission bits.
     */
    PosixModeBits[PosixModeBits["AllWrite"] = 146] = "AllWrite";
    /**
     * An alias combining OthersExecute, GroupExecute, and UserExecute permission bits.
     */
    PosixModeBits[PosixModeBits["AllExecute"] = 73] = "AllExecute";
})(PosixModeBits || (exports.PosixModeBits = PosixModeBits = {}));
//# sourceMappingURL=PosixModeBits.js.map