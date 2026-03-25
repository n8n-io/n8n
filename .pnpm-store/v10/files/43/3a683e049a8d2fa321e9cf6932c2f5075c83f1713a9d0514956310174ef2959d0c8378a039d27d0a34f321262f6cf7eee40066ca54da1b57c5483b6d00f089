module.exports = {
    /* The local file header */
    LOCHDR           : 30, // LOC header size
    LOCSIG           : 0x04034b50, // "PK\003\004"
    LOCVER           : 4,	// version needed to extract
    LOCFLG           : 6, // general purpose bit flag
    LOCHOW           : 8, // compression method
    LOCTIM           : 10, // modification time (2 bytes time, 2 bytes date)
    LOCCRC           : 14, // uncompressed file crc-32 value
    LOCSIZ           : 18, // compressed size
    LOCLEN           : 22, // uncompressed size
    LOCNAM           : 26, // filename length
    LOCEXT           : 28, // extra field length

    /* The Data descriptor */
    EXTSIG           : 0x08074b50, // "PK\007\008"
    EXTHDR           : 16, // EXT header size
    EXTCRC           : 4, // uncompressed file crc-32 value
    EXTSIZ           : 8, // compressed size
    EXTLEN           : 12, // uncompressed size

    /* The central directory file header */
    CENHDR           : 46, // CEN header size
    CENSIG           : 0x02014b50, // "PK\001\002"
    CENVEM           : 4, // version made by
    CENVER           : 6, // version needed to extract
    CENFLG           : 8, // encrypt, decrypt flags
    CENHOW           : 10, // compression method
    CENTIM           : 12, // modification time (2 bytes time, 2 bytes date)
    CENCRC           : 16, // uncompressed file crc-32 value
    CENSIZ           : 20, // compressed size
    CENLEN           : 24, // uncompressed size
    CENNAM           : 28, // filename length
    CENEXT           : 30, // extra field length
    CENCOM           : 32, // file comment length
    CENDSK           : 34, // volume number start
    CENATT           : 36, // internal file attributes
    CENATX           : 38, // external file attributes (host system dependent)
    CENOFF           : 42, // LOC header offset

    /* The entries in the end of central directory */
    ENDHDR           : 22, // END header size
    ENDSIG           : 0x06054b50, // "PK\005\006"
    ENDSUB           : 8, // number of entries on this disk
    ENDTOT           : 10, // total number of entries
    ENDSIZ           : 12, // central directory size in bytes
    ENDOFF           : 16, // offset of first CEN header
    ENDCOM           : 20, // zip file comment length

    END64HDR         : 20, // zip64 END header size
    END64SIG         : 0x07064b50, // zip64 Locator signature, "PK\006\007"
    END64START       : 4, // number of the disk with the start of the zip64
    END64OFF         : 8, // relative offset of the zip64 end of central directory
    END64NUMDISKS    : 16, // total number of disks

    ZIP64SIG         : 0x06064b50, // zip64 signature, "PK\006\006"
    ZIP64HDR         : 56, // zip64 record minimum size
    ZIP64LEAD        : 12, // leading bytes at the start of the record, not counted by the value stored in ZIP64SIZE
    ZIP64SIZE        : 4, // zip64 size of the central directory record
    ZIP64VEM         : 12, // zip64 version made by
    ZIP64VER         : 14, // zip64 version needed to extract
    ZIP64DSK         : 16, // zip64 number of this disk
    ZIP64DSKDIR      : 20, // number of the disk with the start of the record directory
    ZIP64SUB         : 24, // number of entries on this disk
    ZIP64TOT         : 32, // total number of entries
    ZIP64SIZB        : 40, // zip64 central directory size in bytes
    ZIP64OFF         : 48, // offset of start of central directory with respect to the starting disk number
    ZIP64EXTRA       : 56, // extensible data sector

    /* Compression methods */
    STORED           : 0, // no compression
    SHRUNK           : 1, // shrunk
    REDUCED1         : 2, // reduced with compression factor 1
    REDUCED2         : 3, // reduced with compression factor 2
    REDUCED3         : 4, // reduced with compression factor 3
    REDUCED4         : 5, // reduced with compression factor 4
    IMPLODED         : 6, // imploded
    // 7 reserved for Tokenizing compression algorithm
    DEFLATED         : 8, // deflated
    ENHANCED_DEFLATED: 9, // enhanced deflated
    PKWARE           : 10,// PKWare DCL imploded
    // 11 reserved by PKWARE
    BZIP2            : 12, //  compressed using BZIP2
    // 13 reserved by PKWARE
    LZMA             : 14, // LZMA
    // 15-17 reserved by PKWARE
    IBM_TERSE        : 18, // compressed using IBM TERSE
    IBM_LZ77         : 19, // IBM LZ77 z
    AES_ENCRYPT      : 99, // WinZIP AES encryption method

    /* General purpose bit flag */
    // values can obtained with expression 2**bitnr
    FLG_ENC          : 1,    // Bit 0: encrypted file
    FLG_COMP1        : 2,    // Bit 1, compression option
    FLG_COMP2        : 4,    // Bit 2, compression option
    FLG_DESC         : 8,    // Bit 3, data descriptor
    FLG_ENH          : 16,   // Bit 4, enhanced deflating
    FLG_PATCH        : 32,   // Bit 5, indicates that the file is compressed patched data.
    FLG_STR          : 64,   // Bit 6, strong encryption (patented)
                             // Bits 7-10: Currently unused.
    FLG_EFS          : 2048, // Bit 11: Language encoding flag (EFS)
                             // Bit 12: Reserved by PKWARE for enhanced compression.
                             // Bit 13: encrypted the Central Directory (patented).
                             // Bits 14-15: Reserved by PKWARE.
    FLG_MSK          : 4096, // mask header values

    /* Load type */
    FILE             : 2,
    BUFFER           : 1,
    NONE             : 0,

    /* 4.5 Extensible data fields */
    EF_ID            : 0,
    EF_SIZE          : 2,

    /* Header IDs */
    ID_ZIP64         : 0x0001,
    ID_AVINFO        : 0x0007,
    ID_PFS           : 0x0008,
    ID_OS2           : 0x0009,
    ID_NTFS          : 0x000a,
    ID_OPENVMS       : 0x000c,
    ID_UNIX          : 0x000d,
    ID_FORK          : 0x000e,
    ID_PATCH         : 0x000f,
    ID_X509_PKCS7    : 0x0014,
    ID_X509_CERTID_F : 0x0015,
    ID_X509_CERTID_C : 0x0016,
    ID_STRONGENC     : 0x0017,
    ID_RECORD_MGT    : 0x0018,
    ID_X509_PKCS7_RL : 0x0019,
    ID_IBM1          : 0x0065,
    ID_IBM2          : 0x0066,
    ID_POSZIP        : 0x4690,

    EF_ZIP64_OR_32   : 0xffffffff,
    EF_ZIP64_OR_16   : 0xffff,
    EF_ZIP64_SUNCOMP : 0,
    EF_ZIP64_SCOMP   : 8,
    EF_ZIP64_RHO     : 16,
    EF_ZIP64_DSN     : 24
};
