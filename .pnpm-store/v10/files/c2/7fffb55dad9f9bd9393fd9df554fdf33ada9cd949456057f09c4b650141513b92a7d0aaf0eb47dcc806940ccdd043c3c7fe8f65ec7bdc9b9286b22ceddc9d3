(function () {

  var hasDocument = typeof document !== 'undefined';

  var baseUrl;

  if (hasDocument) {
    var baseEl = document.querySelector('base[href]');
    if (baseEl)
      baseUrl = baseEl.href;
  }

  if (!baseUrl && typeof location !== 'undefined') {
    baseUrl = location.href.split('#')[0].split('?')[0];
    var lastSepIndex = baseUrl.lastIndexOf('/');
    if (lastSepIndex !== -1)
      baseUrl = baseUrl.slice(0, lastSepIndex + 1);
  }

  var backslashRegEx = /\\/g;
  function resolveIfNotPlainOrUrl (relUrl, parentUrl) {
    if (relUrl.indexOf('\\') !== -1)
      relUrl = relUrl.replace(backslashRegEx, '/');
    // protocol-relative
    if (relUrl[0] === '/' && relUrl[1] === '/') {
      return parentUrl.slice(0, parentUrl.indexOf(':') + 1) + relUrl;
    }
    // relative-url
    else if (relUrl[0] === '.' && (relUrl[1] === '/' || relUrl[1] === '.' && (relUrl[2] === '/' || relUrl.length === 2 && (relUrl += '/')) ||
        relUrl.length === 1  && (relUrl += '/')) ||
        relUrl[0] === '/') {
      var parentProtocol = parentUrl.slice(0, parentUrl.indexOf(':') + 1);
      // Disabled, but these cases will give inconsistent results for deep backtracking
      //if (parentUrl[parentProtocol.length] !== '/')
      //  throw Error('Cannot resolve');
      // read pathname from parent URL
      // pathname taken to be part after leading "/"
      var pathname;
      if (parentUrl[parentProtocol.length + 1] === '/') {
        // resolving to a :// so we need to read out the auth and host
        if (parentProtocol !== 'file:') {
          pathname = parentUrl.slice(parentProtocol.length + 2);
          pathname = pathname.slice(pathname.indexOf('/') + 1);
        }
        else {
          pathname = parentUrl.slice(8);
        }
      }
      else {
        // resolving to :/ so pathname is the /... part
        pathname = parentUrl.slice(parentProtocol.length + (parentUrl[parentProtocol.length] === '/'));
      }

      if (relUrl[0] === '/')
        return parentUrl.slice(0, parentUrl.length - pathname.length - 1) + relUrl;

      // join together and split for removal of .. and . segments
      // looping the string instead of anything fancy for perf reasons
      // '../../../../../z' resolved to 'x/y' is just 'z'
      var segmented = pathname.slice(0, pathname.lastIndexOf('/') + 1) + relUrl;

      var output = [];
      var segmentIndex = -1;
      for (var i = 0; i < segmented.length; i++) {
        // busy reading a segment - only terminate on '/'
        if (segmentIndex !== -1) {
          if (segmented[i] === '/') {
            output.push(segmented.slice(segmentIndex, i + 1));
            segmentIndex = -1;
          }
        }

        // new segment - check if it is relative
        else if (segmented[i] === '.') {
          // ../ segment
          if (segmented[i + 1] === '.' && (segmented[i + 2] === '/' || i + 2 === segmented.length)) {
            output.pop();
            i += 2;
          }
          // ./ segment
          else if (segmented[i + 1] === '/' || i + 1 === segmented.length) {
            i += 1;
          }
          else {
            // the start of a new segment as below
            segmentIndex = i;
          }
        }
        // it is the start of a new segment
        else {
          segmentIndex = i;
        }
      }
      // finish reading out the last segment
      if (segmentIndex !== -1)
        output.push(segmented.slice(segmentIndex));
      return parentUrl.slice(0, parentUrl.length - pathname.length) + output.join('');
    }
  }

  /*
   * Import maps implementation
   *
   * To make lookups fast we pre-resolve the entire import map
   * and then match based on backtracked hash lookups
   *
   */

  function resolveUrl (relUrl, parentUrl) {
    return resolveIfNotPlainOrUrl(relUrl, parentUrl) || (relUrl.indexOf(':') !== -1 ? relUrl : resolveIfNotPlainOrUrl('./' + relUrl, parentUrl));
  }

  /*
   * Loads JSON, CSS, Wasm module types based on file extension
   * filters and content type verifications
   */
  (function(global) {
    var systemJSPrototype = global.System.constructor.prototype;

    var moduleTypesRegEx = /^[^#?]+\.(css|html|json|wasm)([?#].*)?$/;
    var _shouldFetch = systemJSPrototype.shouldFetch.bind(systemJSPrototype);
    systemJSPrototype.shouldFetch = function (url) {
      return _shouldFetch(url) || moduleTypesRegEx.test(url);
    };

    var jsonContentType = /^application\/json(;|$)/;
    var cssContentType = /^text\/css(;|$)/;
    var wasmContentType = /^application\/wasm(;|$)/;

    var fetch = systemJSPrototype.fetch;
    systemJSPrototype.fetch = function (url, options) {
      return fetch(url, options)
      .then(function (res) {
        if (options.passThrough)
          return res;

        if (!res.ok)
          return res;
        var contentType = res.headers.get('content-type');
        if (jsonContentType.test(contentType))
          return res.json()
          .then(function (json) {
            return new Response(new Blob([
              'System.register([],function(e){return{execute:function(){e("default",' + JSON.stringify(json) + ')}}})'
            ], {
              type: 'application/javascript'
            }));
          });
        if (cssContentType.test(contentType))
          return res.text()
          .then(function (source) {
            source = source.replace(/url\(\s*(?:(["'])((?:\\.|[^\n\\"'])+)\1|((?:\\.|[^\s,"'()\\])+))\s*\)/g, function (match, quotes, relUrl1, relUrl2) {
              return ['url(', quotes, resolveUrl(relUrl1 || relUrl2, url), quotes, ')'].join('');
            });
            return new Response(new Blob([
              'System.register([],function(e){return{execute:function(){var s=new CSSStyleSheet();s.replaceSync(' + JSON.stringify(source) + ');e("default",s)}}})'
            ], {
              type: 'application/javascript'
            }));
          });
        if (wasmContentType.test(contentType))
          return (WebAssembly.compileStreaming ? WebAssembly.compileStreaming(res) : res.arrayBuffer().then(WebAssembly.compile))
          .then(function (module) {
            if (!global.System.wasmModules)
              global.System.wasmModules = Object.create(null);
            global.System.wasmModules[url] = module;
            // we can only set imports if supported (eg early Safari doesnt support)
            var deps = [];
            var setterSources = [];
            if (WebAssembly.Module.imports)
              WebAssembly.Module.imports(module).forEach(function (impt) {
                var key = JSON.stringify(impt.module);
                if (deps.indexOf(key) === -1) {
                  deps.push(key);
                  setterSources.push('function(m){i[' + key + ']=m}');
                }
              });
            return new Response(new Blob([
              'System.register([' + deps.join(',') + '],function(e){var i={};return{setters:[' + setterSources.join(',') +
              '],execute:function(){return WebAssembly.instantiate(System.wasmModules[' + JSON.stringify(url) +
              '],i).then(function(m){e(m.exports)})}}})'
            ], {
              type: 'application/javascript'
            }));
          });
        return res;
      });
    };
  })(typeof self !== 'undefined' ? self : global);

})();
