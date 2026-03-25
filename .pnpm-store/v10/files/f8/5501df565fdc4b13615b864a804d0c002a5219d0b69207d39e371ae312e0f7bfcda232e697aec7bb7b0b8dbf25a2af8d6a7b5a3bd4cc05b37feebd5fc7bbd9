'use strict';

// TODO: take `compilerParams`, headers into account in cache for all cached
//       results
// TODO: debug output

const { spawnSync } = require('child_process');
const { unlinkSync, writeFileSync } = require('fs');
const { tmpdir } = require('os');
const { win32: path } = require('path');
const { inspect } = require('util');

const isWindows = (process.platform === 'win32');
const findVS = require('./findvs.js');

const RE_HEADER_DECORATED = /^(?:"(.+)")|(?:<(.+)>)$/;

const genWinTmpFilenames = (() => {
  let instance = 1;
  return () => {
    const base =
      path.resolve(tmpdir(), `_buildcheck-${process.pid}-${instance++}`);
    return {
      input: `${base}.in.tmp`,
      object: `${base}.out.obj`,
      output: `${base}.out.tmp`,
    };
  };
})();

function getKind(prop) {
  const spawnOpts = {
    encoding: 'utf8',
    stdio: 'pipe',
    windowsHide: true,
  };

  const lang = (prop === '_cc' ? 'c' : 'c++');

  if (isWindows) {
    spawnOpts.stdio = [ 'ignore', 'pipe', 'pipe' ];
    writeFileSync(this._tmpInFile, [
      '_MSC_VER',
    ].join(' '));
    const result = spawnSync(
      this[prop],
      [ '-EP', `-T${lang === 'c' ? 'c' : 'p'}`, this._tmpInFile],
      spawnOpts
    );
    unlinkSync(this._tmpInFile);

    if (result.status === 0) {
      const values = result.stdout.trim().split(' ');
      if (values.length === 1 && /^\d+$/.test(values[0])) {
        this[`${prop}Kind`] = 'msvc';
        this[`${prop}Version`] = values[0];
        this[`${prop}SpawnOpts`] = spawnOpts;
        this._debug(
          `>>> Detected MSVC ${values[0]} for ${lang.toUpperCase()} language`
        );
        return;
      }
    }
  } else {
    const result = spawnSync(
      this[prop],
      [ '-E', '-P', '-x', lang, '-' ],
      {
        ...spawnOpts,
        input: [
          '__clang__',
          '__GNUC__',
          '__GNUC_MINOR__',
          '__GNUC_PATCHLEVEL__',
          '__clang_major__',
          '__clang_minor__',
          '__clang_patchlevel__',
        ].join(' '),
      }
    );

    if (result.status === 0) {
      const values = result.stdout.trim().split(' ');
      if (values.length === 7) {
        let kind;
        let version;
        if (values[0] === '1') {
          kind = 'clang';
          version = values.slice(4).map((v) => +v);
        } else {
          kind = 'gnu';
          version = values.slice(1, 4).map((v) => +v);
        }
        let good = true;
        for (const part of version) {
          if (!isFinite(part) || part < 0) {
            good = false;
            break;
          }
        }
        if (good) {
          this[`${prop}Kind`] = kind;
          this[`${prop}Version`] = version;
          this[`${prop}SpawnOpts`] = spawnOpts;
          const verStr = version.join('.');
          this._debug(
            `>>> Detected ${kind} ${verStr} for ${lang.toUpperCase()} language`
          );
          return;
        }
      }
    }
  }

  throw new Error('Unable to detect compiler type');
}

class BuildEnvironment {
  constructor(cfg) {
    if (typeof cfg !== 'object' || cfg === null)
      cfg = {};

    this._debug = (typeof cfg.debug === 'function' ? cfg.debug : () => {});

    let cc;
    let cxx;
    if (isWindows) {
      const versions = findVS();
      this._debug(
        `>>> Detected MSVS installations: ${inspect(versions, false, 10)}`
      );
      if (versions.length === 0)
        throw new Error('Unable to detect compiler type');
      let selected_msvs;
      if (cfg.msvs_version
          && (typeof cfg.msvs_version === 'string'
              || typeof cfg.msvs_version === 'number')) {
        this._debug(`>>> Explicit MSVS requested: ${cfg.msvs_version}`);
        // Try to select compiler by year
        const msvs_version = cfg.msvs_version.toString();
        for (const vs of versions) {
          if (vs.year.toString() === msvs_version) {
            selected_msvs = vs;
            break;
          }
        }
        if (selected_msvs === undefined)
          throw new Error(`Unable to find MSVS with year '${msvs_version}'`);
      } else {
        selected_msvs = versions[0]; // Use newest
      }
      this._debug(`>>> Using MSVS: ${selected_msvs.year}`);
      cc = selected_msvs.cl;
      cxx = cc;
      this._includePaths = selected_msvs.includePaths;
      this._libPaths = selected_msvs.libPaths;
      // Add (newest) SDK paths if we have them
      for (const sdk of selected_msvs.sdks) {
        this._debug(`>>> Using Windows SDK: ${sdk.fullVersion}`);
        this._includePaths = this._includePaths.concat(sdk.includePaths);
        this._libPaths = this._libPaths.concat(sdk.libPaths);
        break;
      }

      const { input, object, output } = genWinTmpFilenames();
      this._tmpInFile = input;
      this._tmpObjFile = object;
      this._tmpOutFile = output;
    } else {
      cc = ((typeof cfg.compilerC === 'string' && cfg.compilerC)
            || process.env.CC
            || 'cc');
      cxx = ((typeof cfg.compilerCXX === 'string' && cfg.compilerCXX)
             || process.env.CXX
             || 'c++');
      this._debug(`>>> Using C compiler: ${cc}`);
      this._debug(`>>> Using C++ compiler: ${cxx}`);
    }

    this._cc = cc;
    this._ccKind = undefined;
    this._ccVersion = undefined;
    this._ccSpawnOpts = undefined;

    this._cxx = cxx;
    this._cxxKind = undefined;
    this._cxxVersion = undefined;
    this._cxxSpawnOpts = undefined;

    if (cfg.cache !== false) {
      this._cache = new Map(Object.entries({
        c: new Map(),
        cxx: new Map(),
      }));
    } else {
      this._cache = null;
    }
  }

  checkDeclared(type, symbolName, opts) {
    validateType(type);
    if (typeof symbolName !== 'string' || !symbolName)
      throw new Error(`Invalid symbol name: ${inspect(symbolName)}`);

    const cached = getCachedValue(type, this._cache, 'declared', symbolName);
    if (cached !== undefined) {
      this._debug(
        `>>> Checking if '${symbolName}' is declared... ${cached} (cached)`
      );
      return cached;
    }

    if (typeof opts !== 'object' || opts === null)
      opts = {};

    const { headers, searchLibs } = opts;
    const headersList = renderHeaders(Array.isArray(headers)
                                      ? headers
                                      : getDefaultHeaders(this, type));

    const declName = symbolName.replace(/ *\(.*/, '');
    const declUse = symbolName.replace(/\(/, '((')
                              .replace(/\)/, ') 0)')
                              .replace(/,/g, ') 0, (');

    const libs = [
      '',
      ...(Array.isArray(searchLibs) ? searchLibs : [])
    ];

    for (let lib of libs) {
      if (typeof lib !== 'string')
        continue;
      lib = lib.trim();

      const code = `
${headersList}

int
main ()
{
#ifndef ${declName}
#ifdef __cplusplus
  (void) ${declUse};
#else
  (void) ${declName};
#endif
#endif

  ;
  return 0;
}`;
      const compilerParams = (lib ? [`-l${lib}`] : []);
      const result = this.tryCompile(type, code, compilerParams);

      this._debug(
        `>>> Checking if '${symbolName}' is declared `
          + `(using ${lib ? `'${lib}'` : 'no'} library)... ${result === true}`
      );

      if (result !== true) {
        this._debug('... check failed with compiler output:');
        this._debug(result.output);
      }

      if (result === true) {
        setCachedValue(
          type,
          this._cache,
          'declared',
          symbolName,
          (result === true)
        );
        return true;
      }
    }

    return false;
  }

  checkFeature(name) {
    const cached = getCachedValue('features', this._cache, null, name);
    if (cached !== undefined) {
      if (typeof cached === 'object'
          && cached !== null
          && typeof cached.val !== undefined) {
        return cached.val;
      }

      return cached;
    }

    const feature = features.get(name);
    if (feature === undefined)
      throw new Error(`Invalid feature: ${name}`);

    let result = feature(this);
    if (result === undefined)
      result = null;

    setCachedValue('features', this._cache, null, name, result);

    if (typeof result === 'object'
        && result !== null
        && typeof result.val !== undefined) {
      return result.val;
    }

    return result;
  }

  checkFunction(type, funcName, opts) {
    validateType(type);
    if (typeof funcName !== 'string' || !funcName)
      throw new Error(`Invalid function name: ${inspect(funcName)}`);

    const cached = getCachedValue(type, this._cache, 'functions', funcName);
    if (cached !== undefined) {
      this._debug(
        `>>> Checking if function '${funcName}' exists... true (cached)`
      );
      return true;
    }

    if (typeof opts !== 'object' || opts === null)
      opts = {};

    const { searchLibs } = opts;
    const libs = [
      '',
      ...(Array.isArray(searchLibs) ? searchLibs : [])
    ];

    for (let lib of libs) {
      if (typeof lib !== 'string')
        continue;
      lib = lib.trim();

      const code = `
/* Define ${funcName} to an innocuous variant, in case <limits.h> declares
   ${funcName}.
   For example, HP-UX 11i <limits.h> declares gettimeofday.  */
#define ${funcName} innocuous_${funcName}
/* System header to define __stub macros and hopefully few prototypes,
   which can conflict with char ${funcName} (); below.  */
#include <limits.h>
#undef ${funcName}
/* Override any GCC internal prototype to avoid an error.
   Use char because int might match the return type of a GCC
   builtin and then its argument prototype would still apply.  */
#ifdef __cplusplus
extern "C"
#endif
char ${funcName} ();
/* The GNU C library defines this for functions which it implements
    to always fail with ENOSYS.  Some functions are actually named
    something starting with __ and the normal name is an alias.  */
#if defined __stub_${funcName} || defined __stub___${funcName}
choke me
#endif

int
main ()
{
return ${funcName} ();
  ;
  return 0;
}`;

      const compilerParams = (lib ? [`-l${lib}`] : []);
      const result = this.tryCompile(type, code, compilerParams);

      this._debug(
        `>>> Checking if function '${funcName}' exists `
          + `(using ${lib ? `'${lib}'` : 'no'} library)... ${result === true}`
      );
      if (result !== true) {
        this._debug('... check failed with compiler output:');
        this._debug(result.output);
      }

      if (result === true) {
        setCachedValue(
          type,
          this._cache,
          'functions',
          funcName,
          compilerParams
        );
        return true;
      }
    }

    return false;
  }

  checkHeader(type, header) {
    validateType(type);
    const cached = getCachedValue(
      type,
      this._cache,
      'headers',
      normalizeHeader(header)
    );
    if (cached !== undefined) {
      this._debug(
        `>>> Checking if header '${header}' exists... ${cached} (cached)`
      );
      return cached;
    }

    const headersList = renderHeaders([header]);

    const code = `
${headersList}

int
main ()
{
  return 0;
}`;

    const result = this.tryCompile(type, code);
    setCachedValue(
      type,
      this._cache,
      'headers',
      normalizeHeader(header),
      (result === true)
    );
    this._debug(
      `>>> Checking if header '${header}' exists... ${result === true}`
    );
    if (result !== true) {
      this._debug('... check failed with compiler output:');
      this._debug(result.output);
    }
    return (result === true);
  }

  defines(type, rendered) {
    if (this._cache === null)
      return [];

    const defines = new Map();

    let types;
    if (!['c', 'c++'].includes(type))
      types = ['c', 'c++'];
    else
      types = [type];

    for (const t of types) {
      const typeCache = this._cache.get(t);
      if (!typeCache)
        continue;

      for (const [subtype, entries] of typeCache) {
        for (let name of entries.keys()) {
          if (subtype === 'headers')
            name = name.replace(RE_HEADER_DECORATED, '$1$2');
          defines.set(makeDefine(name, rendered), 1);
        }
      }
    }

    {
      const featuresCache = this._cache.get('features');
      if (featuresCache) {
        for (const result of featuresCache.values()) {
          if (typeof result === 'object'
              && result !== null
              && Array.isArray(result.defines)) {
            for (const define of result.defines)
              defines.set(makeDefine(define, rendered), 1);
          }
        }
      }
    }

    return Array.from(defines.keys());
  }

  libs(type) {
    if (this._cache === null)
      return [];

    const libs = new Map();

    let types;
    if (!['c', 'c++'].includes(type))
      types = ['c', 'c++'];
    else
      types = [type];

    for (const t of types) {
      const typeCache = this._cache.get(t);
      if (!typeCache)
        continue;

      const functionsCache = typeCache.get('functions');
      if (!functionsCache)
        continue;

      for (const compilerParams of functionsCache.values()) {
        for (const param of compilerParams)
          libs.set(param, 1);
      }
    }

    {
      const featuresCache = this._cache.get('features');
      if (featuresCache) {
        for (const result of featuresCache.values()) {
          if (typeof result === 'object'
              && result !== null
              && Array.isArray(result.libs)) {
            for (const lib of result.libs)
              libs.set(lib, 1);
          }
        }
      }
    }

    return Array.from(libs.keys());
  }

  tryCompile(type, code, compilerParams) {
    validateType(type);
    if (typeof code !== 'string')
      throw new TypeError('Invalid code argument');

    type = (type === 'c' ? 'c' : 'c++');
    const prop = (type === 'c' ? '_cc' : '_cxx');

    if (this[`${prop}Kind`] === undefined)
      getKind.call(this, prop);

    if (!Array.isArray(compilerParams))
      compilerParams = [];

    let result;
    if (this[`${prop}Kind`] === 'msvc') {
      const cmpOpts = [`-Fo${this._tmpObjFile}`];
      for (const includePath of this._includePaths)
        cmpOpts.push('-I', includePath);
      const lnkOpts = [];
      for (const libPath of this._libPaths)
        lnkOpts.push(`-LIBPATH:${libPath}`);
      for (const opt of compilerParams) {
        let m;
        if (m = /^[-/]l(.+)$/.exec(opt))
          lnkOpts.push(m[1]);
        else
          cmpOpts.push(opt);
      }
      try {
        writeFileSync(this._tmpInFile, code);
        const args = [
          ...cmpOpts,
          `-T${prop === '_cc' ? 'c' : 'p'}`,
          this._tmpInFile,
          '-link',
          `-out:${this._tmpOutFile}`,
          ...lnkOpts,
        ];
        result = spawnSync(
          this[prop],
          args,
          this[`${prop}SpawnOpts`]
        );
        unlinkSync(this._tmpInFile);
        // Overwrite stderr with stdout because MSVC seems to print
        // errors to stdout instead for some reason
        result.stderr = result.stdout;
      } catch (ex) {
        // We had trouble writing or deleting a temp file, fake
        // the result
        result = { status: Infinity, stderr: ex.stack };
      }
      try { unlinkSync(this._tmpObjFile); } catch {}
      try { unlinkSync(this._tmpOutFile); } catch {}
    } else {
      result = spawnSync(
        this[prop],
        [
          '-x', type,
          '-o', '/dev/null',
          '-',
          ...compilerParams,
        ],
        {
          ...this[`${prop}SpawnOpts`],
          input: code,
        }
      );
    }

    if (result.status === 0)
      return true;

    const err = new Error('Compilation failed');
    err.output = result.stderr;
    return err;
  }
}

function validateType(type) {
  if (!['c', 'c++'].includes(type))
    throw new Error('Invalid type argument');
}

function getCachedValue(type, cache, subtype, key) {
  if (cache === null)
    return;

  const typeCache = cache.get(type);
  if (!typeCache)
    return;

  const subtypeCache = (typeof subtype !== 'string'
                        ? typeCache
                        : typeCache.get(subtype));
  if (!subtypeCache)
    return;

  return subtypeCache.get(key);
}

function setCachedValue(type, cache, subtype, key, value) {
  if (cache === null)
    return;

  let typeCache = cache.get(type);
  if (!typeCache)
    cache.set(type, typeCache = new Map());

  let subtypeCache = (typeof subtype !== 'string'
                      ? typeCache
                      : typeCache.get(subtype));
  if (!subtypeCache)
    typeCache.set(subtype, subtypeCache = new Map());

  subtypeCache.set(key, value);
}

function renderHeaders(headers) {
  let ret = '';

  if (Array.isArray(headers)) {
    for (const header of headers) {
      if (typeof header !== 'string' || !header)
        throw new Error(`Invalid header: ${inspect(header)}`);
      ret += `#include ${normalizeHeader(header)}\n`;
    }
  }

  return ret;
}

function normalizeHeader(header) {
  if (!RE_HEADER_DECORATED.test(header))
    header = `<${header}>`;
  return header;
}

const DEFAULT_HEADERS_POSIX = [
  'stdio.h',
  'sys/types.h',
  'sys/stat.h',
  'stdlib.h',
  'stddef.h',
  'memory.h',
  'string.h',
  'strings.h',
  'inttypes.h',
  'stdint.h',
  'unistd.h'
];
const DEFAULT_HEADERS_MSVC = [
  'windows.h',
];
function getDefaultHeaders(be, type) {
  const prop = (type === 'c' ? '_cc' : '_cxx');
  if (be[`${prop}Kind`] === undefined)
    getKind.call(be, prop);

  let headers;
  if (be[`${prop}Kind`] === 'msvc')
    headers = DEFAULT_HEADERS_MSVC;
  else
    headers = DEFAULT_HEADERS_POSIX;

  return headers.filter((hdr) => be.checkHeader(type, hdr));
}

const features = new Map(Object.entries({
  'strerror_r': (be) => {
    const defines = [];
    let returnsCharPtr = false;

    const declared = be.checkDeclared('c', 'strerror_r');
    if (declared) {
      const code = `
${renderHeaders(getDefaultHeaders(be, 'c'))}

int
main ()
{

char buf[100];
char x = *strerror_r (0, buf, sizeof buf);
char *p = strerror_r (0, buf, sizeof buf);
return !p || x;

  ;
  return 0;
}`;
      returnsCharPtr = (be.tryCompile('c', code) === true);
      if (returnsCharPtr)
        defines.push('STRERROR_R_CHAR_P');
    }

    return {
      defines,
      val: { declared, returnsCharPtr }
    };
  },
}));

function makeDefine(name, rendered) {
  name = name.replace(/[*]/g, 'P')
             .replace(/[^_A-Za-z0-9]/g, '_')
             .toUpperCase();
  return (rendered ? `HAVE_${name}=1` : name);
}

module.exports = BuildEnvironment;
