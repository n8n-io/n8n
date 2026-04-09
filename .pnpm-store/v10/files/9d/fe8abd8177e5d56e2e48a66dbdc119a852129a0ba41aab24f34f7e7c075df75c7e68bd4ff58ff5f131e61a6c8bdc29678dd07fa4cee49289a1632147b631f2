/**
 * Ref https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
 */
import type { IGetToken } from "strtok3";
export declare const Signature: {
    LocalFileHeader: number;
    DataDescriptor: number;
    CentralFileHeader: number;
    EndOfCentralDirectory: number;
};
interface IDataDescriptor {
    signature: number;
    compressedSize: number;
    uncompressedSize: number;
}
export interface ILocalFileHeader extends IDataDescriptor {
    minVersion: number;
    dataDescriptor: boolean;
    compressedMethod: number;
    compressedSize: number;
    uncompressedSize: number;
    filenameLength: number;
    extraFieldLength: number;
    filename: string;
}
export declare const DataDescriptor: IGetToken<IDataDescriptor>;
/**
 * First part of the ZIP Local File Header
 * Offset | Bytes| Description
 * -------|------+-------------------------------------------------------------------
 *      0 |    4 | Signature (0x04034b50)
 *      4 |    2 | Minimum version needed to extract
 *      6 |    2 | Bit flag
 *      8 |    2 | Compression method
 *     10 |    2 | File last modification time (MS-DOS format)
 *     12 |    2 | File last modification date (MS-DOS format)
 *     14 |    4 | CRC-32 of uncompressed data
 *     18 |    4 | Compressed size
 *     22 |    4 | Uncompressed size
 *     26 |    2 | File name length (n)
 *     28 |    2 | Extra field length (m)
 *     30 |    n | File name
 * 30 + n |    m | Extra field
 */
export declare const LocalFileHeaderToken: IGetToken<ILocalFileHeader>;
interface IEndOfCentralDirectoryRecord {
    signature: number;
    nrOfThisDisk: number;
    nrOfThisDiskWithTheStart: number;
    nrOfEntriesOnThisDisk: number;
    nrOfEntriesOfSize: number;
    sizeOfCd: number;
    offsetOfStartOfCd: number;
    zipFileCommentLength: number;
}
/**
 * 4.3.16  End of central directory record:
 *  end of central dir signature (0x06064b50)                                      4 bytes
 *  number of this disk                                                            2 bytes
 *  number of the disk with the start of the central directory                     2 bytes
 *  total number of entries in the central directory on this disk                  2 bytes
 *  total number of entries in the size of the central directory                   2 bytes
 *  sizeOfTheCentralDirectory                                                      4 bytes
 *  offset of start of central directory with respect to the starting disk number  4 bytes
 *  .ZIP file comment length                                                       2 bytes
 *  .ZIP file comment       (variable size)
 */
export declare const EndOfCentralDirectoryRecordToken: IGetToken<IEndOfCentralDirectoryRecord>;
export interface IFileHeader extends ILocalFileHeader {
    fileCommentLength: number;
    relativeOffsetOfLocalHeader: number;
}
/**
 * File header:
 *    central file header signature   4 bytes   0 (0x02014b50)
 *    version made by                 2 bytes   4
 *    version needed to extract       2 bytes   6
 *    general purpose bit flag        2 bytes   8
 *    compression method              2 bytes  10
 *    last mod file time              2 bytes  12
 *    last mod file date              2 bytes  14
 *    crc-32                          4 bytes  16
 *    compressed size                 4 bytes  20
 *    uncompressed size               4 bytes  24
 *    file name length                2 bytes  28
 *    extra field length              2 bytes  30
 *    file comment length             2 bytes  32
 *    disk number start               2 bytes  34
 *    internal file attributes        2 bytes  36
 *    external file attributes        4 bytes  38
 *    relative offset of local header 4 bytes  42
 */
export declare const FileHeader: IGetToken<IFileHeader>;
export {};
