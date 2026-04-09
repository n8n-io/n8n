/*
FS Constants
See https://nodejs.org/api/fs.html#file-access-constants

Note: Many of these are pulled from
https://github.com/torvalds/linux/blob/master/include/uapi/linux/stat.h
*/
// File Access Constants
/** File is visible to the calling process. */
export const F_OK = 0;
/** File can be read by the calling process. */
export const R_OK = 4;
/** File can be written by the calling process. */
export const W_OK = 2;
/** File can be executed by the calling process. */
export const X_OK = 1;
// File Copy Constants
/** Constant for fs.copyFile. Flag indicating the destination file should not be overwritten if it already exists. */
export const COPYFILE_EXCL = 1;
/**
 * Constant for fs.copyFile. Copy operation will attempt to create a copy-on-write reflink.
 * If the underlying platform does not support copy-on-write, then a fallback copy mechanism is used.
 */
export const COPYFILE_FICLONE = 2;
/**
 * Constant for fs.copyFile. Copy operation will attempt to create a copy-on-write reflink.
 * If the underlying platform does not support copy-on-write, then the operation will fail with an error.
 */
export const COPYFILE_FICLONE_FORCE = 4;
// File Open Constants
/** Flag indicating to open a file for read-only access. */
export const O_RDONLY = 0;
/** Flag indicating to open a file for write-only access. */
export const O_WRONLY = 1;
/** Flag indicating to open a file for read-write access. */
export const O_RDWR = 2;
/** Flag indicating to create the file if it does not already exist. */
export const O_CREAT = 0x40; // bit 6
/** Flag indicating that opening a file should fail if the O_CREAT flag is set and the file already exists. */
export const O_EXCL = 0x80; // bit 7
/**
 * Flag indicating that if path identifies a terminal device,
 * opening the path shall not cause that terminal to become the controlling terminal for the process
 * (if the process does not already have one).
 */
export const O_NOCTTY = 0x100; // bit 8
/** Flag indicating that if the file exists and is a regular file, and the file is opened successfully for write access, its length shall be truncated to zero. */
export const O_TRUNC = 0x200; // bit 9
/** Flag indicating that data will be appended to the end of the file. */
export const O_APPEND = 0x400; // bit 10
/** Flag indicating that the open should fail if the path is not a directory. */
export const O_DIRECTORY = 0x10000; // bit 16
/**
 * constant for fs.open().
 * Flag indicating reading accesses to the file system will no longer result in
 * an update to the atime information associated with the file.
 * This flag is available on Linux operating systems only.
 */
export const O_NOATIME = 0x40000; // bit 18
/** Flag indicating that the open should fail if the path is a symbolic link. */
export const O_NOFOLLOW = 0x20000; // bit 17
/** Flag indicating that the file is opened for synchronous I/O. */
export const O_SYNC = 0x101000; // bit 20 and bit 12
/** Flag indicating that the file is opened for synchronous I/O with write operations waiting for data integrity. */
export const O_DSYNC = 0x1000; // bit 12
/** Flag indicating to open the symbolic link itself rather than the resource it is pointing to. */
export const O_SYMLINK = 0x8000; // bit 15
/** When set, an attempt will be made to minimize caching effects of file I/O. */
export const O_DIRECT = 0x4000; // bit 14
/** Flag indicating to open the file in nonblocking mode when possible. */
export const O_NONBLOCK = 0x800; // bit 11
// File Type Constants
/** Bit mask used to extract the file type from mode. */
export const S_IFMT = 0xf000;
/** File type constant for a socket. */
export const S_IFSOCK = 0xc000;
/** File type constant for a symbolic link. */
export const S_IFLNK = 0xa000;
/** File type constant for a regular file. */
export const S_IFREG = 0x8000;
/** File type constant for a block-oriented device file. */
export const S_IFBLK = 0x6000;
/** File type constant for a directory. */
export const S_IFDIR = 0x4000;
/** File type constant for a character-oriented device file. */
export const S_IFCHR = 0x2000;
/** File type constant for a FIFO/pipe. */
export const S_IFIFO = 0x1000;
/** Set user id */
export const S_ISUID = 0o4000;
/** Set group id */
export const S_ISGID = 0o2000;
/** Sticky bit */
export const S_ISVTX = 0o1000;
// File Mode Constants
/** File mode indicating readable, writable and executable by owner. */
export const S_IRWXU = 0o700;
/** File mode indicating readable by owner. */
export const S_IRUSR = 0o400;
/** File mode indicating writable by owner. */
export const S_IWUSR = 0o200;
/** File mode indicating executable by owner. */
export const S_IXUSR = 0o100;
/** File mode indicating readable, writable and executable by group. */
export const S_IRWXG = 0o70;
/** File mode indicating readable by group. */
export const S_IRGRP = 0o40;
/** File mode indicating writable by group. */
export const S_IWGRP = 0o20;
/** File mode indicating executable by group. */
export const S_IXGRP = 0o10;
/** File mode indicating readable, writable and executable by others. */
export const S_IRWXO = 7;
/** File mode indicating readable by others. */
export const S_IROTH = 4;
/** File mode indicating writable by others. */
export const S_IWOTH = 2;
/** File mode indicating executable by others. */
export const S_IXOTH = 1;
/**
 * When set, a memory file mapping is used to access the file.
 * This flag is ignored since a unix-like FS is emulated
 */
export const UV_FS_O_FILEMAP = 0;
/**
 * Max 32-bit unsigned integer
 * @hidden
 */
export const size_max = 0xffffffff; // 2^32 - 1
