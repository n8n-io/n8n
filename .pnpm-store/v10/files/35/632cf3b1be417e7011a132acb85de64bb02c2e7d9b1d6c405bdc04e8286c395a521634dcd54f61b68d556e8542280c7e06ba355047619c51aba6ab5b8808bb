// Method names for these signatures must be in src/asyncify_imports.json.
const SIGNATURES = [
  'ipp', // xProgress, xCommitHook
  'ippp', // xClose, xSectorSize, xDeviceCharacteristics
  'vppp', // xShmBarrier, xFinal
  'ipppj', // xTruncate
  'ipppi', // xSleep, xSync, xLock, xUnlock, xShmUnmap
  'ipppp', // xFileSize, xCheckReservedLock, xCurrentTime, xCurrentTimeInt64
  'ipppip', // xFileControl, xRandomness, xGetLastError
  'vpppip', // xFunc, xStep
  'ippppi', // xDelete
  'ippppij', // xRead, xWrite
  'ipppiii', // xShmLock
  'ippppip', // xAccess, xFullPathname
  'ippipppp', // xAuthorize
  'ipppppip', // xOpen
  'ipppiiip', // xShmMap
  'vppippii', // xUpdateHook
];

// This object will define the methods callable from WebAssembly.
// See https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#implement-a-c-api-in-javascript
//
// At this writing, asynchronous JavaScript functions to be called from
// WebAssembly must be statically defined, i.e. they cannot be registered
// at runtime. The workaround here is to define synchronous and asynchronous
// relaying functions for each needed call signature.
//
// On the C side, calls are made to the relaying function with one or two
// prepended arguments - the first argument is a key to look up the callback
// object and the second argument is the name of the method if the callback
// object is not a function.
const adapters = {
  $adapters_support: function() {
    // @ts-ignore
    // Expose handleAsync to library code.
    const handleAsync = typeof Asyncify === 'object' ?
      Asyncify.handleAsync.bind(Asyncify) :
      null;
    Module['handleAsync'] = handleAsync;

    // This map contains the objects to which calls will be relayed, e.g.
    // a VFS. The key is typically the corresponding WebAssembly pointer.
    const targets = new Map();
    Module['setCallback'] = (key, target) => targets.set(key, target);
    Module['getCallback'] = key => targets.get(key);
    Module['deleteCallback'] = key => targets.delete(key);

    // @ts-ignore
    // Overwrite this function with the relay service function.
    adapters_support = function(isAsync, key, ...args) {
      // If the receiver found with the key is a function, just call it.
      // Otherwise, the next argument is the name of the method to be called.
      const receiver = targets.get(key);
      let methodName = null;
      const f = typeof receiver === 'function' ?
        receiver :
        receiver[methodName = UTF8ToString(args.shift())];
      
      if (isAsync) {
        // Call async function via handleAsync. This works for both
        // Asyncify and JSPI builds.
        if (handleAsync) {
          return handleAsync(() => f.apply(receiver, args));
        }
        throw new Error('Synchronous WebAssembly cannot call async function');
      }

      // The function should not be async so call it directly.
      const result = f.apply(receiver, args);
      if (typeof result?.then == 'function') {
        console.error('unexpected Promise', f);
        throw new Error(`${methodName} unexpectedly returned a Promise`);
      }
      return result;
    };
  },
  $adapters_support__deps: ['$UTF8ToString'],
  $adapters_support__postset: 'adapters_support();',
};

function injectMethod(signature, isAsync) {
  const method = `${signature}${isAsync ? '_async' : ''}`;
  adapters[`${method}`] = isAsync ?
    // @ts-ignore
    function(...args) { return adapters_support(true, ...args) } :
    // @ts-ignore
    function(...args) { return adapters_support(false, ...args) };
  adapters[`${method}__deps`] = ['$adapters_support'];
  adapters[`${method}__async`] = isAsync;

  // Emscripten "legalizes" 64-bit integer arguments by passing them as
  // two 32-bit signed integers.
  adapters[`${method}__sig`] = `${signature[0]}${signature.substring(1).replaceAll('j', 'ii')}`;
}

// For each function signature, inject a synchronous and asynchronous
// relaying method definition.
for (const signature of SIGNATURES) {
  injectMethod(signature, false);
  injectMethod(signature, true);
}

// @ts-ignore
addToLibrary(adapters);