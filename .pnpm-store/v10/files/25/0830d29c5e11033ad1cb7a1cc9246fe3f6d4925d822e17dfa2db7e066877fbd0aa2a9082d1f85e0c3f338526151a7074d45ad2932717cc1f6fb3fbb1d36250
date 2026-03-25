/*
Language: NSIS
Description: Nullsoft Scriptable Install System
Author: Jan T. Sott <jan.sott@gmail.com>
Website: https://nsis.sourceforge.io/Main_Page
*/

function nsis(hljs) {
  const regex = hljs.regex;
  const LANGUAGE_CONSTANTS = [
    "ADMINTOOLS",
    "APPDATA",
    "CDBURN_AREA",
    "CMDLINE",
    "COMMONFILES32",
    "COMMONFILES64",
    "COMMONFILES",
    "COOKIES",
    "DESKTOP",
    "DOCUMENTS",
    "EXEDIR",
    "EXEFILE",
    "EXEPATH",
    "FAVORITES",
    "FONTS",
    "HISTORY",
    "HWNDPARENT",
    "INSTDIR",
    "INTERNET_CACHE",
    "LANGUAGE",
    "LOCALAPPDATA",
    "MUSIC",
    "NETHOOD",
    "OUTDIR",
    "PICTURES",
    "PLUGINSDIR",
    "PRINTHOOD",
    "PROFILE",
    "PROGRAMFILES32",
    "PROGRAMFILES64",
    "PROGRAMFILES",
    "QUICKLAUNCH",
    "RECENT",
    "RESOURCES_LOCALIZED",
    "RESOURCES",
    "SENDTO",
    "SMPROGRAMS",
    "SMSTARTUP",
    "STARTMENU",
    "SYSDIR",
    "TEMP",
    "TEMPLATES",
    "VIDEOS",
    "WINDIR"
  ];

  const PARAM_NAMES = [
    "ARCHIVE",
    "FILE_ATTRIBUTE_ARCHIVE",
    "FILE_ATTRIBUTE_NORMAL",
    "FILE_ATTRIBUTE_OFFLINE",
    "FILE_ATTRIBUTE_READONLY",
    "FILE_ATTRIBUTE_SYSTEM",
    "FILE_ATTRIBUTE_TEMPORARY",
    "HKCR",
    "HKCU",
    "HKDD",
    "HKEY_CLASSES_ROOT",
    "HKEY_CURRENT_CONFIG",
    "HKEY_CURRENT_USER",
    "HKEY_DYN_DATA",
    "HKEY_LOCAL_MACHINE",
    "HKEY_PERFORMANCE_DATA",
    "HKEY_USERS",
    "HKLM",
    "HKPD",
    "HKU",
    "IDABORT",
    "IDCANCEL",
    "IDIGNORE",
    "IDNO",
    "IDOK",
    "IDRETRY",
    "IDYES",
    "MB_ABORTRETRYIGNORE",
    "MB_DEFBUTTON1",
    "MB_DEFBUTTON2",
    "MB_DEFBUTTON3",
    "MB_DEFBUTTON4",
    "MB_ICONEXCLAMATION",
    "MB_ICONINFORMATION",
    "MB_ICONQUESTION",
    "MB_ICONSTOP",
    "MB_OK",
    "MB_OKCANCEL",
    "MB_RETRYCANCEL",
    "MB_RIGHT",
    "MB_RTLREADING",
    "MB_SETFOREGROUND",
    "MB_TOPMOST",
    "MB_USERICON",
    "MB_YESNO",
    "NORMAL",
    "OFFLINE",
    "READONLY",
    "SHCTX",
    "SHELL_CONTEXT",
    "SYSTEM|TEMPORARY",
  ];

  const COMPILER_FLAGS = [
    "addincludedir",
    "addplugindir",
    "appendfile",
    "cd",
    "define",
    "delfile",
    "echo",
    "else",
    "endif",
    "error",
    "execute",
    "finalize",
    "getdllversion",
    "gettlbversion",
    "if",
    "ifdef",
    "ifmacrodef",
    "ifmacrondef",
    "ifndef",
    "include",
    "insertmacro",
    "macro",
    "macroend",
    "makensis",
    "packhdr",
    "searchparse",
    "searchreplace",
    "system",
    "tempfile",
    "undef",
    "uninstfinalize",
    "verbose",
    "warning",
  ];

  const CONSTANTS = {
    className: 'variable.constant',
    begin: regex.concat(/\$/, regex.either(...LANGUAGE_CONSTANTS))
  };

  const DEFINES = {
    // ${defines}
    className: 'variable',
    begin: /\$+\{[\!\w.:-]+\}/
  };

  const VARIABLES = {
    // $variables
    className: 'variable',
    begin: /\$+\w[\w\.]*/,
    illegal: /\(\)\{\}/
  };

  const LANGUAGES = {
    // $(language_strings)
    className: 'variable',
    begin: /\$+\([\w^.:!-]+\)/
  };

  const PARAMETERS = {
    // command parameters
    className: 'params',
    begin: regex.either(...PARAM_NAMES)
  };

  const COMPILER = {
    // !compiler_flags
    className: 'keyword',
    begin: regex.concat(
      /!/,
      regex.either(...COMPILER_FLAGS)
    )
  };

  const ESCAPE_CHARS = {
    // $\n, $\r, $\t, $$
    className: 'char.escape',
    begin: /\$(\\[nrt]|\$)/
  };

  const PLUGINS = {
    // plug::ins
    className: 'title.function',
    begin: /\w+::\w+/
  };

  const STRING = {
    className: 'string',
    variants: [
      {
        begin: '"',
        end: '"'
      },
      {
        begin: '\'',
        end: '\''
      },
      {
        begin: '`',
        end: '`'
      }
    ],
    illegal: /\n/,
    contains: [
      ESCAPE_CHARS,
      CONSTANTS,
      DEFINES,
      VARIABLES,
      LANGUAGES
    ]
  };

  const KEYWORDS = [
    "Abort",
    "AddBrandingImage",
    "AddSize",
    "AllowRootDirInstall",
    "AllowSkipFiles",
    "AutoCloseWindow",
    "BGFont",
    "BGGradient",
    "BrandingText",
    "BringToFront",
    "Call",
    "CallInstDLL",
    "Caption",
    "ChangeUI",
    "CheckBitmap",
    "ClearErrors",
    "CompletedText",
    "ComponentText",
    "CopyFiles",
    "CRCCheck",
    "CreateDirectory",
    "CreateFont",
    "CreateShortCut",
    "Delete",
    "DeleteINISec",
    "DeleteINIStr",
    "DeleteRegKey",
    "DeleteRegValue",
    "DetailPrint",
    "DetailsButtonText",
    "DirText",
    "DirVar",
    "DirVerify",
    "EnableWindow",
    "EnumRegKey",
    "EnumRegValue",
    "Exch",
    "Exec",
    "ExecShell",
    "ExecShellWait",
    "ExecWait",
    "ExpandEnvStrings",
    "File",
    "FileBufSize",
    "FileClose",
    "FileErrorText",
    "FileOpen",
    "FileRead",
    "FileReadByte",
    "FileReadUTF16LE",
    "FileReadWord",
    "FileWriteUTF16LE",
    "FileSeek",
    "FileWrite",
    "FileWriteByte",
    "FileWriteWord",
    "FindClose",
    "FindFirst",
    "FindNext",
    "FindWindow",
    "FlushINI",
    "GetCurInstType",
    "GetCurrentAddress",
    "GetDlgItem",
    "GetDLLVersion",
    "GetDLLVersionLocal",
    "GetErrorLevel",
    "GetFileTime",
    "GetFileTimeLocal",
    "GetFullPathName",
    "GetFunctionAddress",
    "GetInstDirError",
    "GetKnownFolderPath",
    "GetLabelAddress",
    "GetTempFileName",
    "GetWinVer",
    "Goto",
    "HideWindow",
    "Icon",
    "IfAbort",
    "IfErrors",
    "IfFileExists",
    "IfRebootFlag",
    "IfRtlLanguage",
    "IfShellVarContextAll",
    "IfSilent",
    "InitPluginsDir",
    "InstallButtonText",
    "InstallColors",
    "InstallDir",
    "InstallDirRegKey",
    "InstProgressFlags",
    "InstType",
    "InstTypeGetText",
    "InstTypeSetText",
    "Int64Cmp",
    "Int64CmpU",
    "Int64Fmt",
    "IntCmp",
    "IntCmpU",
    "IntFmt",
    "IntOp",
    "IntPtrCmp",
    "IntPtrCmpU",
    "IntPtrOp",
    "IsWindow",
    "LangString",
    "LicenseBkColor",
    "LicenseData",
    "LicenseForceSelection",
    "LicenseLangString",
    "LicenseText",
    "LoadAndSetImage",
    "LoadLanguageFile",
    "LockWindow",
    "LogSet",
    "LogText",
    "ManifestDPIAware",
    "ManifestLongPathAware",
    "ManifestMaxVersionTested",
    "ManifestSupportedOS",
    "MessageBox",
    "MiscButtonText",
    "Name|0",
    "Nop",
    "OutFile",
    "Page",
    "PageCallbacks",
    "PEAddResource",
    "PEDllCharacteristics",
    "PERemoveResource",
    "PESubsysVer",
    "Pop",
    "Push",
    "Quit",
    "ReadEnvStr",
    "ReadINIStr",
    "ReadRegDWORD",
    "ReadRegStr",
    "Reboot",
    "RegDLL",
    "Rename",
    "RequestExecutionLevel",
    "ReserveFile",
    "Return",
    "RMDir",
    "SearchPath",
    "SectionGetFlags",
    "SectionGetInstTypes",
    "SectionGetSize",
    "SectionGetText",
    "SectionIn",
    "SectionSetFlags",
    "SectionSetInstTypes",
    "SectionSetSize",
    "SectionSetText",
    "SendMessage",
    "SetAutoClose",
    "SetBrandingImage",
    "SetCompress",
    "SetCompressor",
    "SetCompressorDictSize",
    "SetCtlColors",
    "SetCurInstType",
    "SetDatablockOptimize",
    "SetDateSave",
    "SetDetailsPrint",
    "SetDetailsView",
    "SetErrorLevel",
    "SetErrors",
    "SetFileAttributes",
    "SetFont",
    "SetOutPath",
    "SetOverwrite",
    "SetRebootFlag",
    "SetRegView",
    "SetShellVarContext",
    "SetSilent",
    "ShowInstDetails",
    "ShowUninstDetails",
    "ShowWindow",
    "SilentInstall",
    "SilentUnInstall",
    "Sleep",
    "SpaceTexts",
    "StrCmp",
    "StrCmpS",
    "StrCpy",
    "StrLen",
    "SubCaption",
    "Unicode",
    "UninstallButtonText",
    "UninstallCaption",
    "UninstallIcon",
    "UninstallSubCaption",
    "UninstallText",
    "UninstPage",
    "UnRegDLL",
    "Var",
    "VIAddVersionKey",
    "VIFileVersion",
    "VIProductVersion",
    "WindowIcon",
    "WriteINIStr",
    "WriteRegBin",
    "WriteRegDWORD",
    "WriteRegExpandStr",
    "WriteRegMultiStr",
    "WriteRegNone",
    "WriteRegStr",
    "WriteUninstaller",
    "XPStyle"
  ];

  const LITERALS = [
    "admin",
    "all",
    "auto",
    "both",
    "bottom",
    "bzip2",
    "colored",
    "components",
    "current",
    "custom",
    "directory",
    "false",
    "force",
    "hide",
    "highest",
    "ifdiff",
    "ifnewer",
    "instfiles",
    "lastused",
    "leave",
    "left",
    "license",
    "listonly",
    "lzma",
    "nevershow",
    "none",
    "normal",
    "notset",
    "off",
    "on",
    "open",
    "print",
    "right",
    "show",
    "silent",
    "silentlog",
    "smooth",
    "textonly",
    "top",
    "true",
    "try",
    "un.components",
    "un.custom",
    "un.directory",
    "un.instfiles",
    "un.license",
    "uninstConfirm",
    "user",
    "Win10",
    "Win7",
    "Win8",
    "WinVista",
    "zlib"
  ];

  const FUNCTION_DEFINITION = {
    match: [
      /Function/,
      /\s+/,
      regex.concat(/(\.)?/, hljs.IDENT_RE)
    ],
    scope: {
      1: "keyword",
      3: "title.function"
    }
  };

  // Var Custom.Variable.Name.Item
  // Var /GLOBAL Custom.Variable.Name.Item
  const VARIABLE_NAME_RE = /[A-Za-z][\w.]*/;
  const VARIABLE_DEFINITION = {
    match: [
      /Var/,
      /\s+/,
      /(?:\/GLOBAL\s+)?/,
      VARIABLE_NAME_RE
    ],
    scope: {
      1: "keyword",
      3: "params",
      4: "variable"
    }
  };

  return {
    name: 'NSIS',
    case_insensitive: true,
    keywords: {
      keyword: KEYWORDS,
      literal: LITERALS
    },
    contains: [
      hljs.HASH_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.COMMENT(
        ';',
        '$',
        { relevance: 0 }
      ),
      VARIABLE_DEFINITION,
      FUNCTION_DEFINITION,
      { beginKeywords: 'Function PageEx Section SectionGroup FunctionEnd SectionEnd', },
      STRING,
      COMPILER,
      DEFINES,
      VARIABLES,
      LANGUAGES,
      PARAMETERS,
      PLUGINS,
      hljs.NUMBER_MODE
    ]
  };
}

module.exports = nsis;
