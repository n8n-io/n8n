/*
Language: LiveCode
Author: Ralf Bitter <rabit@revigniter.com>
Description: Language definition for LiveCode server accounting for revIgniter (a web application framework) characteristics.
Version: 1.1
Date: 2019-04-17
Category: enterprise
*/

function livecodeserver(hljs) {
  const VARIABLE = {
    className: 'variable',
    variants: [
      { begin: '\\b([gtps][A-Z]{1}[a-zA-Z0-9]*)(\\[.+\\])?(?:\\s*?)' },
      { begin: '\\$_[A-Z]+' }
    ],
    relevance: 0
  };
  const COMMENT_MODES = [
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.HASH_COMMENT_MODE,
    hljs.COMMENT('--', '$'),
    hljs.COMMENT('[^:]//', '$')
  ];
  const TITLE1 = hljs.inherit(hljs.TITLE_MODE, { variants: [
    { begin: '\\b_*rig[A-Z][A-Za-z0-9_\\-]*' },
    { begin: '\\b_[a-z0-9\\-]+' }
  ] });
  const TITLE2 = hljs.inherit(hljs.TITLE_MODE, { begin: '\\b([A-Za-z0-9_\\-]+)\\b' });
  return {
    name: 'LiveCode',
    case_insensitive: false,
    keywords: {
      keyword:
        '$_COOKIE $_FILES $_GET $_GET_BINARY $_GET_RAW $_POST $_POST_BINARY $_POST_RAW $_SESSION $_SERVER '
        + 'codepoint codepoints segment segments codeunit codeunits sentence sentences trueWord trueWords paragraph '
        + 'after byte bytes english the until http forever descending using line real8 with seventh '
        + 'for stdout finally element word words fourth before black ninth sixth characters chars stderr '
        + 'uInt1 uInt1s uInt2 uInt2s stdin string lines relative rel any fifth items from middle mid '
        + 'at else of catch then third it file milliseconds seconds second secs sec int1 int1s int4 '
        + 'int4s internet int2 int2s normal text item last long detailed effective uInt4 uInt4s repeat '
        + 'end repeat URL in try into switch to words https token binfile each tenth as ticks tick '
        + 'system real4 by dateItems without char character ascending eighth whole dateTime numeric short '
        + 'first ftp integer abbreviated abbr abbrev private case while if '
        + 'div mod wrap and or bitAnd bitNot bitOr bitXor among not in a an within '
        + 'contains ends with begins the keys of keys',
      literal:
        'SIX TEN FORMFEED NINE ZERO NONE SPACE FOUR FALSE COLON CRLF PI COMMA ENDOFFILE EOF EIGHT FIVE '
        + 'QUOTE EMPTY ONE TRUE RETURN CR LINEFEED RIGHT BACKSLASH NULL SEVEN TAB THREE TWO '
        + 'six ten formfeed nine zero none space four false colon crlf pi comma endoffile eof eight five '
        + 'quote empty one true return cr linefeed right backslash null seven tab three two '
        + 'RIVERSION RISTATE FILE_READ_MODE FILE_WRITE_MODE FILE_WRITE_MODE DIR_WRITE_MODE FILE_READ_UMASK '
        + 'FILE_WRITE_UMASK DIR_READ_UMASK DIR_WRITE_UMASK',
      built_in:
        'put abs acos aliasReference annuity arrayDecode arrayEncode asin atan atan2 average avg avgDev base64Decode '
        + 'base64Encode baseConvert binaryDecode binaryEncode byteOffset byteToNum cachedURL cachedURLs charToNum '
        + 'cipherNames codepointOffset codepointProperty codepointToNum codeunitOffset commandNames compound compress '
        + 'constantNames cos date dateFormat decompress difference directories '
        + 'diskSpace DNSServers exp exp1 exp2 exp10 extents files flushEvents folders format functionNames geometricMean global '
        + 'globals hasMemory harmonicMean hostAddress hostAddressToName hostName hostNameToAddress isNumber ISOToMac itemOffset '
        + 'keys len length libURLErrorData libUrlFormData libURLftpCommand libURLLastHTTPHeaders libURLLastRHHeaders '
        + 'libUrlMultipartFormAddPart libUrlMultipartFormData libURLVersion lineOffset ln ln1 localNames log log2 log10 '
        + 'longFilePath lower macToISO matchChunk matchText matrixMultiply max md5Digest median merge messageAuthenticationCode messageDigest millisec '
        + 'millisecs millisecond milliseconds min monthNames nativeCharToNum normalizeText num number numToByte numToChar '
        + 'numToCodepoint numToNativeChar offset open openfiles openProcesses openProcessIDs openSockets '
        + 'paragraphOffset paramCount param params peerAddress pendingMessages platform popStdDev populationStandardDeviation '
        + 'populationVariance popVariance processID random randomBytes replaceText result revCreateXMLTree revCreateXMLTreeFromFile '
        + 'revCurrentRecord revCurrentRecordIsFirst revCurrentRecordIsLast revDatabaseColumnCount revDatabaseColumnIsNull '
        + 'revDatabaseColumnLengths revDatabaseColumnNames revDatabaseColumnNamed revDatabaseColumnNumbered '
        + 'revDatabaseColumnTypes revDatabaseConnectResult revDatabaseCursors revDatabaseID revDatabaseTableNames '
        + 'revDatabaseType revDataFromQuery revdb_closeCursor revdb_columnbynumber revdb_columncount revdb_columnisnull '
        + 'revdb_columnlengths revdb_columnnames revdb_columntypes revdb_commit revdb_connect revdb_connections '
        + 'revdb_connectionerr revdb_currentrecord revdb_cursorconnection revdb_cursorerr revdb_cursors revdb_dbtype '
        + 'revdb_disconnect revdb_execute revdb_iseof revdb_isbof revdb_movefirst revdb_movelast revdb_movenext '
        + 'revdb_moveprev revdb_query revdb_querylist revdb_recordcount revdb_rollback revdb_tablenames '
        + 'revGetDatabaseDriverPath revNumberOfRecords revOpenDatabase revOpenDatabases revQueryDatabase '
        + 'revQueryDatabaseBlob revQueryResult revQueryIsAtStart revQueryIsAtEnd revUnixFromMacPath revXMLAttribute '
        + 'revXMLAttributes revXMLAttributeValues revXMLChildContents revXMLChildNames revXMLCreateTreeFromFileWithNamespaces '
        + 'revXMLCreateTreeWithNamespaces revXMLDataFromXPathQuery revXMLEvaluateXPath revXMLFirstChild revXMLMatchingNode '
        + 'revXMLNextSibling revXMLNodeContents revXMLNumberOfChildren revXMLParent revXMLPreviousSibling '
        + 'revXMLRootNode revXMLRPC_CreateRequest revXMLRPC_Documents revXMLRPC_Error '
        + 'revXMLRPC_GetHost revXMLRPC_GetMethod revXMLRPC_GetParam revXMLText revXMLRPC_Execute '
        + 'revXMLRPC_GetParamCount revXMLRPC_GetParamNode revXMLRPC_GetParamType revXMLRPC_GetPath revXMLRPC_GetPort '
        + 'revXMLRPC_GetProtocol revXMLRPC_GetRequest revXMLRPC_GetResponse revXMLRPC_GetSocket revXMLTree '
        + 'revXMLTrees revXMLValidateDTD revZipDescribeItem revZipEnumerateItems revZipOpenArchives round sampVariance '
        + 'sec secs seconds sentenceOffset sha1Digest shell shortFilePath sin specialFolderPath sqrt standardDeviation statRound '
        + 'stdDev sum sysError systemVersion tan tempName textDecode textEncode tick ticks time to tokenOffset toLower toUpper '
        + 'transpose truewordOffset trunc uniDecode uniEncode upper URLDecode URLEncode URLStatus uuid value variableNames '
        + 'variance version waitDepth weekdayNames wordOffset xsltApplyStylesheet xsltApplyStylesheetFromFile xsltLoadStylesheet '
        + 'xsltLoadStylesheetFromFile add breakpoint cancel clear local variable file word line folder directory URL close socket process '
        + 'combine constant convert create new alias folder directory decrypt delete variable word line folder '
        + 'directory URL dispatch divide do encrypt filter get include intersect kill libURLDownloadToFile '
        + 'libURLFollowHttpRedirects libURLftpUpload libURLftpUploadFile libURLresetAll libUrlSetAuthCallback libURLSetDriver '
        + 'libURLSetCustomHTTPHeaders libUrlSetExpect100 libURLSetFTPListCommand libURLSetFTPMode libURLSetFTPStopTime '
        + 'libURLSetStatusCallback load extension loadedExtensions multiply socket prepare process post seek rel relative read from process rename '
        + 'replace require resetAll resolve revAddXMLNode revAppendXML revCloseCursor revCloseDatabase revCommitDatabase '
        + 'revCopyFile revCopyFolder revCopyXMLNode revDeleteFolder revDeleteXMLNode revDeleteAllXMLTrees '
        + 'revDeleteXMLTree revExecuteSQL revGoURL revInsertXMLNode revMoveFolder revMoveToFirstRecord revMoveToLastRecord '
        + 'revMoveToNextRecord revMoveToPreviousRecord revMoveToRecord revMoveXMLNode revPutIntoXMLNode revRollBackDatabase '
        + 'revSetDatabaseDriverPath revSetXMLAttribute revXMLRPC_AddParam revXMLRPC_DeleteAllDocuments revXMLAddDTD '
        + 'revXMLRPC_Free revXMLRPC_FreeAll revXMLRPC_DeleteDocument revXMLRPC_DeleteParam revXMLRPC_SetHost '
        + 'revXMLRPC_SetMethod revXMLRPC_SetPort revXMLRPC_SetProtocol revXMLRPC_SetSocket revZipAddItemWithData '
        + 'revZipAddItemWithFile revZipAddUncompressedItemWithData revZipAddUncompressedItemWithFile revZipCancel '
        + 'revZipCloseArchive revZipDeleteItem revZipExtractItemToFile revZipExtractItemToVariable revZipSetProgressCallback '
        + 'revZipRenameItem revZipReplaceItemWithData revZipReplaceItemWithFile revZipOpenArchive send set sort split start stop '
        + 'subtract symmetric union unload vectorDotProduct wait write'
    },
    contains: [
      VARIABLE,
      {
        className: 'keyword',
        begin: '\\bend\\sif\\b'
      },
      {
        className: 'function',
        beginKeywords: 'function',
        end: '$',
        contains: [
          VARIABLE,
          TITLE2,
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.BINARY_NUMBER_MODE,
          hljs.C_NUMBER_MODE,
          TITLE1
        ]
      },
      {
        className: 'function',
        begin: '\\bend\\s+',
        end: '$',
        keywords: 'end',
        contains: [
          TITLE2,
          TITLE1
        ],
        relevance: 0
      },
      {
        beginKeywords: 'command on',
        end: '$',
        contains: [
          VARIABLE,
          TITLE2,
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.BINARY_NUMBER_MODE,
          hljs.C_NUMBER_MODE,
          TITLE1
        ]
      },
      {
        className: 'meta',
        variants: [
          {
            begin: '<\\?(rev|lc|livecode)',
            relevance: 10
          },
          { begin: '<\\?' },
          { begin: '\\?>' }
        ]
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.BINARY_NUMBER_MODE,
      hljs.C_NUMBER_MODE,
      TITLE1
    ].concat(COMMENT_MODES),
    illegal: ';$|^\\[|^=|&|\\{'
  };
}

module.exports = livecodeserver;
