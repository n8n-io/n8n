'use strict';

const BuildEnvironment = require('buildcheck');

const be = new BuildEnvironment();

let gyp = {
  defines: [],
  libraries: [],
  sources: [
    'deps/cpu_features/include/internal/hwcaps.h',
    'deps/cpu_features/src/hwcaps.c',
  ],
};

be.checkHeader('c', 'dlfcn.h');

if (be.checkDeclared('c', 'getauxval', { headers: ['sys/auxv.h'] }))
  gyp.defines.push('HAVE_STRONG_GETAUXVAL=1');

// Add the things we detected
gyp.defines.push(...be.defines(null, true));
gyp.libraries.push(...be.libs());

gyp = {
  conditions: [
    ['OS!="win" and target_arch not in "ia32 x32 x64"',
     gyp],
  ],
};

console.log(JSON.stringify(gyp, null, 2));
