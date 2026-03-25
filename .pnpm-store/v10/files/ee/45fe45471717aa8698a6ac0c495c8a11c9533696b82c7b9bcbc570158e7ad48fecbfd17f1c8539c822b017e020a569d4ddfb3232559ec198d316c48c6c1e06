// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { existsSync } from "node:fs";
import { type as osType } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import { diag } from "@opentelemetry/api";
import process from "node:process";
export class FileAccessControl {
    // Check if file access control could be enabled
    static checkFileProtection() {
        if (!FileAccessControl.OS_PROVIDES_FILE_PROTECTION &&
            !FileAccessControl.OS_FILE_PROTECTION_CHECKED) {
            FileAccessControl.OS_FILE_PROTECTION_CHECKED = true;
            // Node's chmod levels do not appropriately restrict file access on Windows
            // Use the built-in command line tool ICACLS on Windows to properly restrict
            // access to the temporary directory used for disk retry mode.
            if (FileAccessControl.USE_ICACLS) {
                // This should be async - but it's currently safer to have this synchronous
                // This guarantees we can immediately fail setDiskRetryMode if we need to
                try {
                    FileAccessControl.OS_PROVIDES_FILE_PROTECTION = existsSync(FileAccessControl.ICACLS_PATH);
                }
                catch (e) {
                    // Ignore error
                }
                if (!FileAccessControl.OS_PROVIDES_FILE_PROTECTION) {
                    diag.warn("Could not find ICACLS in expected location! This is necessary to use disk retry mode on Windows.");
                }
            }
            else {
                // chmod works everywhere else
                FileAccessControl.OS_PROVIDES_FILE_PROTECTION = true;
            }
        }
    }
    static async applyACLRules(directory) {
        if (FileAccessControl.USE_ICACLS) {
            if (FileAccessControl.ACLED_DIRECTORIES[directory] === undefined) {
                // Avoid multiple calls race condition by setting ACLED_DIRECTORIES to false for this directory immediately
                // If batches are being failed faster than the processes spawned below return, some data won't be stored to disk
                // This is better than the alternative of potentially infinitely spawned processes
                FileAccessControl.ACLED_DIRECTORIES[directory] = false;
                try {
                    // Restrict this directory to only current user and administrator access
                    const identity = await this._getACLIdentity();
                    await this._runICACLS(this._getACLArguments(directory, identity));
                    FileAccessControl.ACLED_DIRECTORIES[directory] = true;
                }
                catch (ex) {
                    FileAccessControl.ACLED_DIRECTORIES[directory] = false; // false is used to cache failed (vs undefined which is "not yet tried")
                    throw ex;
                }
            }
            else {
                if (!FileAccessControl.ACLED_DIRECTORIES[directory]) {
                    throw new Error("Setting ACL restrictions did not succeed (cached result)");
                }
            }
        }
    }
    static applyACLRulesSync(directory) {
        if (FileAccessControl.USE_ICACLS) {
            // For performance, only run ACL rules if we haven't already during this session
            if (FileAccessControl.ACLED_DIRECTORIES[directory] === undefined) {
                this._runICACLSSync(this._getACLArguments(directory, this._getACLIdentitySync()));
                FileAccessControl.ACLED_DIRECTORIES[directory] = true; // If we get here, it succeeded. _runIACLSSync will throw on failures
                return;
            }
            else if (!FileAccessControl.ACLED_DIRECTORIES[directory]) {
                // falsy but not undefined
                throw new Error("Setting ACL restrictions did not succeed (cached result)");
            }
        }
    }
    static _runICACLS(args) {
        return new Promise((resolve, reject) => {
            const aclProc = spawn(FileAccessControl.ICACLS_PATH, args, {
                windowsHide: true,
            });
            aclProc.on("error", (e) => reject(e));
            aclProc.on("close", (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`Setting ACL restrictions did not succeed (ICACLS returned code ${code})`));
                }
            });
        });
    }
    static _runICACLSSync(args) {
        // Some very old versions of Node (< 0.11) don't have this
        if (spawnSync) {
            const aclProc = spawnSync(FileAccessControl.ICACLS_PATH, args, {
                windowsHide: true,
            });
            if (aclProc.error) {
                throw aclProc.error;
            }
            else if (aclProc.status !== 0) {
                throw new Error(`Setting ACL restrictions did not succeed (ICACLS returned code ${aclProc.status})`);
            }
        }
        else {
            throw new Error("Could not synchronously call ICACLS under current version of Node.js");
        }
    }
    static _getACLIdentity() {
        return new Promise((resolve, reject) => {
            if (FileAccessControl.ACL_IDENTITY) {
                resolve(FileAccessControl.ACL_IDENTITY);
            }
            const psProc = spawn(FileAccessControl.POWERSHELL_PATH, ["-Command", "[System.Security.Principal.WindowsIdentity]::GetCurrent().Name"], {
                windowsHide: true,
                stdio: ["ignore", "pipe", "pipe"], // Needed to prevent hanging on Win 7
            });
            let data = "";
            psProc.stdout.on("data", (d) => (data += d));
            psProc.on("error", (e) => reject(e));
            psProc.on("close", (code) => {
                FileAccessControl.ACL_IDENTITY = data && data.trim();
                if (code === 0) {
                    resolve(FileAccessControl.ACL_IDENTITY);
                }
                else {
                    reject(new Error(`Getting ACL identity did not succeed (PS returned code ${code})`));
                }
            });
        });
    }
    static _getACLIdentitySync() {
        if (FileAccessControl.ACL_IDENTITY) {
            return FileAccessControl.ACL_IDENTITY;
        }
        // Some very old versions of Node (< 0.11) don't have this
        if (spawnSync) {
            const psProc = spawnSync(FileAccessControl.POWERSHELL_PATH, ["-Command", "[System.Security.Principal.WindowsIdentity]::GetCurrent().Name"], {
                windowsHide: true,
                stdio: ["ignore", "pipe", "pipe"], // Needed to prevent hanging on Win 7
            });
            if (psProc.error) {
                throw psProc.error;
            }
            else if (psProc.status !== 0) {
                throw new Error(`Getting ACL identity did not succeed (PS returned code ${psProc.status})`);
            }
            FileAccessControl.ACL_IDENTITY = psProc.stdout && psProc.stdout.toString().trim();
            return FileAccessControl.ACL_IDENTITY;
        }
        else {
            throw new Error("Could not synchronously get ACL identity under current version of Node.js");
        }
    }
    static _getACLArguments(directory, identity) {
        return [
            directory,
            "/grant",
            "*S-1-5-32-544:(OI)(CI)F", // Full permission for Administrators
            "/grant",
            `${identity}:(OI)(CI)F`, // Full permission for current user
            "/inheritance:r",
        ]; // Remove all inherited permissions
    }
}
FileAccessControl.ICACLS_PATH = `${process.env.SYSTEMDRIVE}/windows/system32/icacls.exe`;
FileAccessControl.POWERSHELL_PATH = `${process.env.SYSTEMDRIVE}/windows/system32/windowspowershell/v1.0/powershell.exe`;
FileAccessControl.ACLED_DIRECTORIES = {};
FileAccessControl.ACL_IDENTITY = null;
FileAccessControl.OS_FILE_PROTECTION_CHECKED = false;
FileAccessControl.OS_PROVIDES_FILE_PROTECTION = false;
FileAccessControl.USE_ICACLS = osType() === "Windows_NT";
//# sourceMappingURL=fileAccessControl.js.map