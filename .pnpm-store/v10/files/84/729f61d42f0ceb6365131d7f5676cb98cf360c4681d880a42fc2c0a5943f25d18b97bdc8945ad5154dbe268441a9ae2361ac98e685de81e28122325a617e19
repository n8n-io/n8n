/*
Language: PureBASIC
Author: Tristano Ajmone <tajmone@gmail.com>
Description: Syntax highlighting for PureBASIC (v.5.00-5.60). No inline ASM highlighting. (v.1.2, May 2017)
Credits: I've taken inspiration from the PureBasic language file for GeSHi, created by Gustavo Julio Fiorenza (GuShH).
Website: https://www.purebasic.com
Category: system
*/

// Base deafult colors in PB IDE: background: #FFFFDF; foreground: #000000;

function purebasic(hljs) {
  const STRINGS = { // PB IDE color: #0080FF (Azure Radiance)
    className: 'string',
    begin: '(~)?"',
    end: '"',
    illegal: '\\n'
  };
  const CONSTANTS = { // PB IDE color: #924B72 (Cannon Pink)
    //  "#" + a letter or underscore + letters, digits or underscores + (optional) "$"
    className: 'symbol',
    begin: '#[a-zA-Z_]\\w*\\$?'
  };

  return {
    name: 'PureBASIC',
    aliases: [
      'pb',
      'pbi'
    ],
    keywords: // PB IDE color: #006666 (Blue Stone) + Bold
      // Keywords from all version of PureBASIC 5.00 upward ...
      'Align And Array As Break CallDebugger Case CompilerCase CompilerDefault '
      + 'CompilerElse CompilerElseIf CompilerEndIf CompilerEndSelect CompilerError '
      + 'CompilerIf CompilerSelect CompilerWarning Continue Data DataSection Debug '
      + 'DebugLevel Declare DeclareC DeclareCDLL DeclareDLL DeclareModule Default '
      + 'Define Dim DisableASM DisableDebugger DisableExplicit Else ElseIf EnableASM '
      + 'EnableDebugger EnableExplicit End EndDataSection EndDeclareModule EndEnumeration '
      + 'EndIf EndImport EndInterface EndMacro EndModule EndProcedure EndSelect '
      + 'EndStructure EndStructureUnion EndWith Enumeration EnumerationBinary Extends '
      + 'FakeReturn For ForEach ForEver Global Gosub Goto If Import ImportC '
      + 'IncludeBinary IncludeFile IncludePath Interface List Macro MacroExpandedCount '
      + 'Map Module NewList NewMap Next Not Or Procedure ProcedureC '
      + 'ProcedureCDLL ProcedureDLL ProcedureReturn Protected Prototype PrototypeC ReDim '
      + 'Read Repeat Restore Return Runtime Select Shared Static Step Structure '
      + 'StructureUnion Swap Threaded To UndefineMacro Until Until  UnuseModule '
      + 'UseModule Wend While With XIncludeFile XOr',
    contains: [
      // COMMENTS | PB IDE color: #00AAAA (Persian Green)
      hljs.COMMENT(';', '$', { relevance: 0 }),

      { // PROCEDURES DEFINITIONS
        className: 'function',
        begin: '\\b(Procedure|Declare)(C|CDLL|DLL)?\\b',
        end: '\\(',
        excludeEnd: true,
        returnBegin: true,
        contains: [
          { // PROCEDURE KEYWORDS | PB IDE color: #006666 (Blue Stone) + Bold
            className: 'keyword',
            begin: '(Procedure|Declare)(C|CDLL|DLL)?',
            excludeEnd: true
          },
          { // PROCEDURE RETURN TYPE SETTING | PB IDE color: #000000 (Black)
            className: 'type',
            begin: '\\.\\w*'
            // end: ' ',
          },
          hljs.UNDERSCORE_TITLE_MODE // PROCEDURE NAME | PB IDE color: #006666 (Blue Stone)
        ]
      },
      STRINGS,
      CONSTANTS
    ]
  };
}

/*  ==============================================================================
                                      CHANGELOG
    ==============================================================================
    - v.1.2 (2017-05-12)
        -- BUG-FIX: Some keywords were accidentally joyned together. Now fixed.
    - v.1.1 (2017-04-30)
        -- Updated to PureBASIC 5.60.
        -- Keywords list now built by extracting them from the PureBASIC SDK's
           "SyntaxHilighting.dll" (from each PureBASIC version). Tokens from each
           version are added to the list, and renamed or removed tokens are kept
           for the sake of covering all versions of the language from PureBASIC
           v5.00 upward. (NOTE: currently, there are no renamed or deprecated
           tokens in the keywords list). For more info, see:
           -- http://www.purebasic.fr/english/viewtopic.php?&p=506269
           -- https://github.com/tajmone/purebasic-archives/tree/master/syntax-highlighting/guidelines
    - v.1.0 (April 2016)
        -- First release
        -- Keywords list taken and adapted from GuShH's (Gustavo Julio Fiorenza)
           PureBasic language file for GeSHi:
           -- https://github.com/easybook/geshi/blob/master/geshi/purebasic.php
*/

module.exports = purebasic;
