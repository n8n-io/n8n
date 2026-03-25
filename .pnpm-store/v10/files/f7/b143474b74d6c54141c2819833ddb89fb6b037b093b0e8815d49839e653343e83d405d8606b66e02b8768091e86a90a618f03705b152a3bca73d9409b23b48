/*
Language: LLVM IR
Author: Michael Rodler <contact@f0rki.at>
Description: language used as intermediate representation in the LLVM compiler framework
Website: https://llvm.org/docs/LangRef.html
Category: assembler
Audit: 2020
*/

/** @type LanguageFn */
function llvm(hljs) {
  const regex = hljs.regex;
  const IDENT_RE = /([-a-zA-Z$._][\w$.-]*)/;
  const TYPE = {
    className: 'type',
    begin: /\bi\d+(?=\s|\b)/
  };
  const OPERATOR = {
    className: 'operator',
    relevance: 0,
    begin: /=/
  };
  const PUNCTUATION = {
    className: 'punctuation',
    relevance: 0,
    begin: /,/
  };
  const NUMBER = {
    className: 'number',
    variants: [
      { begin: /[su]?0[xX][KMLHR]?[a-fA-F0-9]+/ },
      { begin: /[-+]?\d+(?:[.]\d+)?(?:[eE][-+]?\d+(?:[.]\d+)?)?/ }
    ],
    relevance: 0
  };
  const LABEL = {
    className: 'symbol',
    variants: [ { begin: /^\s*[a-z]+:/ }, // labels
    ],
    relevance: 0
  };
  const VARIABLE = {
    className: 'variable',
    variants: [
      { begin: regex.concat(/%/, IDENT_RE) },
      { begin: /%\d+/ },
      { begin: /#\d+/ },
    ]
  };
  const FUNCTION = {
    className: 'title',
    variants: [
      { begin: regex.concat(/@/, IDENT_RE) },
      { begin: /@\d+/ },
      { begin: regex.concat(/!/, IDENT_RE) },
      { begin: regex.concat(/!\d+/, IDENT_RE) },
      // https://llvm.org/docs/LangRef.html#namedmetadatastructure
      // obviously a single digit can also be used in this fashion
      { begin: /!\d+/ }
    ]
  };

  return {
    name: 'LLVM IR',
    // TODO: split into different categories of keywords
    keywords:
      'begin end true false declare define global '
      + 'constant private linker_private internal '
      + 'available_externally linkonce linkonce_odr weak '
      + 'weak_odr appending dllimport dllexport common '
      + 'default hidden protected extern_weak external '
      + 'thread_local zeroinitializer undef null to tail '
      + 'target triple datalayout volatile nuw nsw nnan '
      + 'ninf nsz arcp fast exact inbounds align '
      + 'addrspace section alias module asm sideeffect '
      + 'gc dbg linker_private_weak attributes blockaddress '
      + 'initialexec localdynamic localexec prefix unnamed_addr '
      + 'ccc fastcc coldcc x86_stdcallcc x86_fastcallcc '
      + 'arm_apcscc arm_aapcscc arm_aapcs_vfpcc ptx_device '
      + 'ptx_kernel intel_ocl_bicc msp430_intrcc spir_func '
      + 'spir_kernel x86_64_sysvcc x86_64_win64cc x86_thiscallcc '
      + 'cc c signext zeroext inreg sret nounwind '
      + 'noreturn noalias nocapture byval nest readnone '
      + 'readonly inlinehint noinline alwaysinline optsize ssp '
      + 'sspreq noredzone noimplicitfloat naked builtin cold '
      + 'nobuiltin noduplicate nonlazybind optnone returns_twice '
      + 'sanitize_address sanitize_memory sanitize_thread sspstrong '
      + 'uwtable returned type opaque eq ne slt sgt '
      + 'sle sge ult ugt ule uge oeq one olt ogt '
      + 'ole oge ord uno ueq une x acq_rel acquire '
      + 'alignstack atomic catch cleanup filter inteldialect '
      + 'max min monotonic nand personality release seq_cst '
      + 'singlethread umax umin unordered xchg add fadd '
      + 'sub fsub mul fmul udiv sdiv fdiv urem srem '
      + 'frem shl lshr ashr and or xor icmp fcmp '
      + 'phi call trunc zext sext fptrunc fpext uitofp '
      + 'sitofp fptoui fptosi inttoptr ptrtoint bitcast '
      + 'addrspacecast select va_arg ret br switch invoke '
      + 'unwind unreachable indirectbr landingpad resume '
      + 'malloc alloca free load store getelementptr '
      + 'extractelement insertelement shufflevector getresult '
      + 'extractvalue insertvalue atomicrmw cmpxchg fence '
      + 'argmemonly double',
    contains: [
      TYPE,
      // this matches "empty comments"...
      // ...because it's far more likely this is a statement terminator in
      // another language than an actual comment
      hljs.COMMENT(/;\s*$/, null, { relevance: 0 }),
      hljs.COMMENT(/;/, /$/),
      {
        className: 'string',
        begin: /"/,
        end: /"/,
        contains: [
          {
            className: 'char.escape',
            match: /\\\d\d/
          }
        ]
      },
      FUNCTION,
      PUNCTUATION,
      OPERATOR,
      VARIABLE,
      LABEL,
      NUMBER
    ]
  };
}

export { llvm as default };
