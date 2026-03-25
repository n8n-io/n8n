/*
Language: ARM Assembly
Author: Dan Panzarella <alsoelp@gmail.com>
Description: ARM Assembly including Thumb and Thumb2 instructions
Category: assembler
*/

/** @type LanguageFn */
function armasm(hljs) {
  // local labels: %?[FB]?[AT]?\d{1,2}\w+

  const COMMENT = { variants: [
    hljs.COMMENT('^[ \\t]*(?=#)', '$', {
      relevance: 0,
      excludeBegin: true
    }),
    hljs.COMMENT('[;@]', '$', { relevance: 0 }),
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE
  ] };

  return {
    name: 'ARM Assembly',
    case_insensitive: true,
    aliases: [ 'arm' ],
    keywords: {
      $pattern: '\\.?' + hljs.IDENT_RE,
      meta:
        // GNU preprocs
        '.2byte .4byte .align .ascii .asciz .balign .byte .code .data .else .end .endif .endm .endr .equ .err .exitm .extern .global .hword .if .ifdef .ifndef .include .irp .long .macro .rept .req .section .set .skip .space .text .word .arm .thumb .code16 .code32 .force_thumb .thumb_func .ltorg '
        // ARM directives
        + 'ALIAS ALIGN ARM AREA ASSERT ATTR CN CODE CODE16 CODE32 COMMON CP DATA DCB DCD DCDU DCDO DCFD DCFDU DCI DCQ DCQU DCW DCWU DN ELIF ELSE END ENDFUNC ENDIF ENDP ENTRY EQU EXPORT EXPORTAS EXTERN FIELD FILL FUNCTION GBLA GBLL GBLS GET GLOBAL IF IMPORT INCBIN INCLUDE INFO KEEP LCLA LCLL LCLS LTORG MACRO MAP MEND MEXIT NOFP OPT PRESERVE8 PROC QN READONLY RELOC REQUIRE REQUIRE8 RLIST FN ROUT SETA SETL SETS SN SPACE SUBT THUMB THUMBX TTL WHILE WEND ',
      built_in:
        'r0 r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15 ' // standard registers
        + 'pc lr sp ip sl sb fp ' // typical regs plus backward compatibility
        + 'a1 a2 a3 a4 v1 v2 v3 v4 v5 v6 v7 v8 f0 f1 f2 f3 f4 f5 f6 f7 ' // more regs and fp
        + 'p0 p1 p2 p3 p4 p5 p6 p7 p8 p9 p10 p11 p12 p13 p14 p15 ' // coprocessor regs
        + 'c0 c1 c2 c3 c4 c5 c6 c7 c8 c9 c10 c11 c12 c13 c14 c15 ' // more coproc
        + 'q0 q1 q2 q3 q4 q5 q6 q7 q8 q9 q10 q11 q12 q13 q14 q15 ' // advanced SIMD NEON regs

        // program status registers
        + 'cpsr_c cpsr_x cpsr_s cpsr_f cpsr_cx cpsr_cxs cpsr_xs cpsr_xsf cpsr_sf cpsr_cxsf '
        + 'spsr_c spsr_x spsr_s spsr_f spsr_cx spsr_cxs spsr_xs spsr_xsf spsr_sf spsr_cxsf '

        // NEON and VFP registers
        + 's0 s1 s2 s3 s4 s5 s6 s7 s8 s9 s10 s11 s12 s13 s14 s15 '
        + 's16 s17 s18 s19 s20 s21 s22 s23 s24 s25 s26 s27 s28 s29 s30 s31 '
        + 'd0 d1 d2 d3 d4 d5 d6 d7 d8 d9 d10 d11 d12 d13 d14 d15 '
        + 'd16 d17 d18 d19 d20 d21 d22 d23 d24 d25 d26 d27 d28 d29 d30 d31 '

        + '{PC} {VAR} {TRUE} {FALSE} {OPT} {CONFIG} {ENDIAN} {CODESIZE} {CPU} {FPU} {ARCHITECTURE} {PCSTOREOFFSET} {ARMASM_VERSION} {INTER} {ROPI} {RWPI} {SWST} {NOSWST} . @'
    },
    contains: [
      {
        className: 'keyword',
        begin: '\\b(' // mnemonics
            + 'adc|'
            + '(qd?|sh?|u[qh]?)?add(8|16)?|usada?8|(q|sh?|u[qh]?)?(as|sa)x|'
            + 'and|adrl?|sbc|rs[bc]|asr|b[lx]?|blx|bxj|cbn?z|tb[bh]|bic|'
            + 'bfc|bfi|[su]bfx|bkpt|cdp2?|clz|clrex|cmp|cmn|cpsi[ed]|cps|'
            + 'setend|dbg|dmb|dsb|eor|isb|it[te]{0,3}|lsl|lsr|ror|rrx|'
            + 'ldm(([id][ab])|f[ds])?|ldr((s|ex)?[bhd])?|movt?|mvn|mra|mar|'
            + 'mul|[us]mull|smul[bwt][bt]|smu[as]d|smmul|smmla|'
            + 'mla|umlaal|smlal?([wbt][bt]|d)|mls|smlsl?[ds]|smc|svc|sev|'
            + 'mia([bt]{2}|ph)?|mrr?c2?|mcrr2?|mrs|msr|orr|orn|pkh(tb|bt)|rbit|'
            + 'rev(16|sh)?|sel|[su]sat(16)?|nop|pop|push|rfe([id][ab])?|'
            + 'stm([id][ab])?|str(ex)?[bhd]?|(qd?)?sub|(sh?|q|u[qh]?)?sub(8|16)|'
            + '[su]xt(a?h|a?b(16)?)|srs([id][ab])?|swpb?|swi|smi|tst|teq|'
            + 'wfe|wfi|yield'
        + ')'
        + '(eq|ne|cs|cc|mi|pl|vs|vc|hi|ls|ge|lt|gt|le|al|hs|lo)?' // condition codes
        + '[sptrx]?' // legal postfixes
        + '(?=\\s)' // followed by space
      },
      COMMENT,
      hljs.QUOTE_STRING_MODE,
      {
        className: 'string',
        begin: '\'',
        end: '[^\\\\]\'',
        relevance: 0
      },
      {
        className: 'title',
        begin: '\\|',
        end: '\\|',
        illegal: '\\n',
        relevance: 0
      },
      {
        className: 'number',
        variants: [
          { // hex
            begin: '[#$=]?0x[0-9a-f]+' },
          { // bin
            begin: '[#$=]?0b[01]+' },
          { // literal
            begin: '[#$=]\\d+' },
          { // bare number
            begin: '\\b\\d+' }
        ],
        relevance: 0
      },
      {
        className: 'symbol',
        variants: [
          { // GNU ARM syntax
            begin: '^[ \\t]*[a-z_\\.\\$][a-z0-9_\\.\\$]+:' },
          { // ARM syntax
            begin: '^[a-z_\\.\\$][a-z0-9_\\.\\$]+' },
          { // label reference
            begin: '[=#]\\w+' }
        ],
        relevance: 0
      }
    ]
  };
}

export { armasm as default };
